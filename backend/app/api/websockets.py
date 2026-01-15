from fastapi import WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Dict, List, Set, Optional
import json
import asyncio
import uuid
from datetime import datetime, timezone
import logging

from app.core.database import get_db, AsyncSessionLocal
from app.core.auth import get_current_user_websocket, CurrentUser
from app.models.campaign_minimal import Campaign
from app.services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manage WebSocket connections for real-time updates"""
    
    def __init__(self):
        # Store connections by type and ID
        self.campaign_connections: Dict[str, Set[WebSocket]] = {}
        self.dashboard_connections: Dict[str, Set[WebSocket]] = {}  # org_id -> set of websockets
        self.user_connections: Dict[str, WebSocket] = {}  # user_id -> websocket
        
    async def connect_to_campaign(self, websocket: WebSocket, campaign_id: str, user: CurrentUser):
        """Connect user to campaign updates"""
        await websocket.accept()
        
        if campaign_id not in self.campaign_connections:
            self.campaign_connections[campaign_id] = set()
        
        self.campaign_connections[campaign_id].add(websocket)
        self.user_connections[str(user.id)] = websocket
        
        logger.info(f"User {user.id} connected to campaign {campaign_id}")
        
    async def connect_to_dashboard(self, websocket: WebSocket, user: CurrentUser):
        """Connect user to dashboard updates"""
        await websocket.accept()
        
        org_id = str(user.org_id)
        if org_id not in self.dashboard_connections:
            self.dashboard_connections[org_id] = set()
        
        self.dashboard_connections[org_id].add(websocket)
        self.user_connections[str(user.id)] = websocket
        
        logger.info(f"User {user.id} connected to dashboard for org {org_id}")
    
    def disconnect(self, websocket: WebSocket):
        """Disconnect websocket from all subscriptions"""
        # Remove from campaign connections
        for campaign_id in list(self.campaign_connections.keys()):
            self.campaign_connections[campaign_id].discard(websocket)
            if not self.campaign_connections[campaign_id]:
                del self.campaign_connections[campaign_id]
        
        # Remove from dashboard connections
        for org_id in list(self.dashboard_connections.keys()):
            self.dashboard_connections[org_id].discard(websocket)
            if not self.dashboard_connections[org_id]:
                del self.dashboard_connections[org_id]
        
        # Remove from user connections
        for user_id in list(self.user_connections.keys()):
            if self.user_connections[user_id] == websocket:
                del self.user_connections[user_id]
                break
    
    async def broadcast_to_campaign(self, campaign_id: str, message: dict):
        """Broadcast message to all users watching a campaign"""
        if campaign_id in self.campaign_connections:
            disconnected = set()
            
            for websocket in self.campaign_connections[campaign_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception:
                    disconnected.add(websocket)
            
            # Clean up disconnected websockets
            for ws in disconnected:
                self.campaign_connections[campaign_id].discard(ws)
    
    async def broadcast_to_dashboard(self, org_id: str, message: dict):
        """Broadcast message to all dashboard users in an organization"""
        if org_id in self.dashboard_connections:
            disconnected = set()
            
            for websocket in self.dashboard_connections[org_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception:
                    disconnected.add(websocket)
            
            # Clean up disconnected websockets
            for ws in disconnected:
                self.dashboard_connections[org_id].discard(ws)
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send message to specific user"""
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_text(json.dumps(message))
            except Exception:
                # Connection broken, remove it
                del self.user_connections[user_id]


# Global connection manager
manager = ConnectionManager()


async def campaign_websocket_endpoint(
    websocket: WebSocket,
    campaign_id: str
):
    """WebSocket endpoint for real-time campaign updates"""
    
    try:
        # Authenticate user via WebSocket
        user = await get_current_user_websocket(websocket)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Validate campaign ID and access
        try:
            campaign_uuid = uuid.UUID(campaign_id)
        except ValueError:
            await websocket.close(code=status.WS_1003_UNSUPPORTED_DATA)
            return
        
        # Check if user has access to campaign
        async with AsyncSessionLocal() as db:
            conditions = [Campaign.id == campaign_uuid]
            if hasattr(Campaign, "organization_id"):
                conditions.append(Campaign.organization_id == user.org_id)
            campaign = await db.scalar(select(Campaign).where(and_(*conditions)))
            
            if not campaign:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
        
        # Connect to campaign updates
        await manager.connect_to_campaign(websocket, campaign_id, user)
        
        # Send initial campaign data
        async with AsyncSessionLocal() as db:
            analytics_service = AnalyticsService(db)
            initial_metrics = await analytics_service.get_real_time_campaign_metrics(
                campaign_id=campaign_uuid,
                org_id=user.org_id
            )
            
            await websocket.send_text(json.dumps({
                "type": "campaign_metrics",
                "campaign_id": campaign_id,
                "data": initial_metrics,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }))
        
        # Keep connection alive and handle messages
        try:
            while True:
                # Wait for client messages (heartbeat, etc.)
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }))
                elif message.get("type") == "subscribe_updates":
                    # Client requesting specific update types
                    pass
                
        except WebSocketDisconnect:
            pass
            
    except Exception as e:
        logger.error(f"Campaign WebSocket error: {str(e)}")
        
    finally:
        manager.disconnect(websocket)


async def dashboard_websocket_endpoint(
    websocket: WebSocket
):
    """WebSocket endpoint for real-time dashboard updates"""
    
    try:
        # Authenticate user via WebSocket
        user = await get_current_user_websocket(websocket)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Connect to dashboard updates
        await manager.connect_to_dashboard(websocket, user)
        
        # Send initial dashboard data
        async with AsyncSessionLocal() as db:
            analytics_service = AnalyticsService(db)
            initial_metrics = await analytics_service.get_dashboard_metrics(user.org_id)
            
            await websocket.send_text(json.dumps({
                "type": "dashboard_metrics",
                "data": initial_metrics,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }))
        
        # Keep connection alive and handle messages
        try:
            while True:
                # Wait for client messages
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }))
                elif message.get("type") == "request_update":
                    # Client requesting immediate update
                    async with AsyncSessionLocal() as db:
                        analytics_service = AnalyticsService(db)
                        current_metrics = await analytics_service.get_dashboard_metrics(user.org_id)
                        
                        await websocket.send_text(json.dumps({
                            "type": "dashboard_metrics",
                            "data": current_metrics,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }))
                
        except WebSocketDisconnect:
            pass
            
    except Exception as e:
        logger.error(f"Dashboard WebSocket error: {str(e)}")
        
    finally:
        manager.disconnect(websocket)


# Real-time update functions that can be called from workers
async def notify_campaign_update(campaign_id: str, update_data: dict):
    """Notify all connected clients about campaign updates"""
    
    message = {
        "type": "campaign_update",
        "campaign_id": campaign_id,
        "data": update_data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await manager.broadcast_to_campaign(campaign_id, message)


async def notify_dashboard_update(org_id: str, update_data: dict):
    """Notify all connected clients about dashboard updates"""
    
    message = {
        "type": "dashboard_update",
        "data": update_data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await manager.broadcast_to_dashboard(org_id, message)


async def notify_message_status_update(org_id: str, message_data: dict):
    """Notify about message status changes"""
    
    message = {
        "type": "message_status_update",
        "data": message_data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await manager.broadcast_to_dashboard(org_id, message)
    
    # Also notify campaign-specific listeners if campaign_id is provided
    if message_data.get("campaign_id"):
        await manager.broadcast_to_campaign(message_data["campaign_id"], message)


async def notify_lead_activity(org_id: str, lead_data: dict):
    """Notify about new lead activity"""
    
    message = {
        "type": "lead_activity",
        "data": lead_data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await manager.broadcast_to_dashboard(org_id, message)


async def notify_compliance_alert(org_id: str, alert_data: dict):
    """Notify about compliance alerts (opt-outs, violations)"""
    
    message = {
        "type": "compliance_alert",
        "data": alert_data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await manager.broadcast_to_dashboard(org_id, message)


# Background task to send periodic updates
async def periodic_update_broadcaster():
    """Background task to send periodic updates to connected clients"""
    
    while True:
        try:
            # Update dashboard metrics for all connected organizations
            for org_id in manager.dashboard_connections.keys():
                try:
                    async with AsyncSessionLocal() as db:
                        analytics_service = AnalyticsService(db)
                        current_metrics = await analytics_service.get_dashboard_metrics(org_id)
                        
                        await notify_dashboard_update(org_id, current_metrics)
                        
                except Exception as e:
                    logger.error(f"Error updating dashboard for org {org_id}: {str(e)}")
            
            # Update campaign metrics for all connected campaigns
            for campaign_id in manager.campaign_connections.keys():
                try:
                    async with AsyncSessionLocal() as db:
                        analytics_service = AnalyticsService(db)
                        
                        # Get organization ID for this campaign
                        campaign = await db.scalar(
                            select(Campaign).where(Campaign.id == uuid.UUID(campaign_id))
                        )
                        
                        if campaign:
                            campaign_metrics = await analytics_service.get_real_time_campaign_metrics(
                                campaign_id=uuid.UUID(campaign_id),
                                org_id=campaign.organization_id
                            )
                            
                            await notify_campaign_update(campaign_id, campaign_metrics)
                            
                except Exception as e:
                    logger.error(f"Error updating campaign {campaign_id}: {str(e)}")
            
            # Wait 10 seconds before next update
            await asyncio.sleep(10)
            
        except Exception as e:
            logger.error(f"Error in periodic update broadcaster: {str(e)}")
            await asyncio.sleep(60)  # Wait longer on error


# Start the background broadcaster when the module is imported
def start_websocket_broadcaster():
    """Start the periodic WebSocket broadcaster"""
    loop = asyncio.get_event_loop()
    if loop.is_running():
        asyncio.create_task(periodic_update_broadcaster())
    else:
        loop.create_task(periodic_update_broadcaster())


# Utility function to get connection statistics
def get_connection_stats() -> Dict[str, int]:
    """Get WebSocket connection statistics"""
    return {
        "total_dashboard_connections": sum(len(conns) for conns in manager.dashboard_connections.values()),
        "total_campaign_connections": sum(len(conns) for conns in manager.campaign_connections.values()),
        "total_user_connections": len(manager.user_connections),
        "organizations_connected": len(manager.dashboard_connections),
        "campaigns_being_watched": len(manager.campaign_connections)
    }
