from celery import current_app as celery_app
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from datetime import datetime, timedelta, timezone
import asyncio
import uuid
from typing import Dict, Any, Optional

from app.core.database import AsyncSessionLocal
from app.models.campaign import Campaign, CampaignTarget
from app.models.message import Message, MessageStatusEvent
from app.models.lead import Lead
from app.models.phone_number import PhoneNumber
from app.models.template import Template
from app.services.twilio_service import TwilioService
from app.services.compliance_service import ComplianceService
from app.services.template_service import TemplateService
from app.services.analytics_service import AnalyticsService
from app.core.exceptions import SMSServiceError
from app.core.config import settings


@celery_app.task(bind=True, max_retries=3)
def send_campaign_message(self, campaign_target_id: str) -> Dict[str, Any]:
    """
    Send individual campaign message with full compliance and rate limiting
    
    Args:
        campaign_target_id: UUID of the campaign target to process
        
    Returns:
        Dictionary with send result
    """
    return asyncio.run(_send_campaign_message_async(self, campaign_target_id))


async def _send_campaign_message_async(task, campaign_target_id: str) -> Dict[str, Any]:
    """Async implementation of send_campaign_message"""
    
    async with AsyncSessionLocal() as db:
        try:
            # Load campaign target with all related data
            result = await db.execute(
                select(CampaignTarget)
                .join(Campaign)
                .join(Lead)
                .where(CampaignTarget.id == uuid.UUID(campaign_target_id))
            )
            target = result.scalar_one_or_none()
            
            if not target:
                return {"status": "error", "error": "Campaign target not found"}
            
            if target.status != "queued":
                return {"status": "skipped", "reason": f"Target status is {target.status}"}
            
            # Initialize services
            twilio_service = TwilioService()
            compliance_service = ComplianceService(db)
            template_service = TemplateService(db)
            analytics_service = AnalyticsService(db)
            
            # Check if phone number is suppressed
            if await compliance_service.is_suppressed(target.phone_number, target.campaign.organization_id):
                await _update_target_status(db, target, "suppressed", "Phone number is opted out")
                return {"status": "suppressed", "reason": "Phone number is opted out"}
            
            # Check quiet hours
            if not await _is_sending_allowed_now(target):
                # Reschedule for later
                next_send_time = await _get_next_allowed_send_time(target)
                task.retry(eta=next_send_time)
                return {"status": "rescheduled", "next_send_time": next_send_time.isoformat()}
            
            # Get available phone number for sending
            from_number = await _get_available_phone_number(db, target.campaign.organization_id)
            if not from_number:
                await _update_target_status(db, target, "failed", "No available phone numbers")
                return {"status": "error", "error": "No available phone numbers"}
            
            # Check rate limiting
            if not await _can_send_now(db, from_number):
                # Delay and retry
                delay_seconds = await _calculate_rate_limit_delay(db, from_number)
                task.retry(countdown=delay_seconds)
                return {"status": "rate_limited", "retry_in_seconds": delay_seconds}
            
            # Select template for this lead
            template = await template_service.select_template_for_lead(
                org_id=target.campaign.organization_id,
                lead_id=target.lead_id,
                category=target.campaign.template_category or "initial"
            )
            
            if not template:
                await _update_target_status(db, target, "failed", "No available templates")
                return {"status": "error", "error": "No available templates"}
            
            # Render message content
            message_content = await template_service.render_template(template, target.lead)
            
            # Create message record
            message = Message(
                organization_id=target.campaign.organization_id,
                campaign_id=target.campaign_id,
                campaign_target_id=target.id,
                lead_id=target.lead_id,
                template_id=template.id,
                direction="outbound",
                from_number=from_number.e164,
                to_number=target.phone_number,
                content=message_content,
                status="queued"
            )
            
            db.add(message)
            await db.commit()
            await db.refresh(message)
            
            # Send via Twilio
            try:
                twilio_result = await twilio_service.send_message(
                    to=target.phone_number,
                    body=message_content,
                    from_=from_number.e164
                )
                
                # Update message with Twilio SID
                message.provider_sid = twilio_result.sid
                message.status = "sent"
                message.segments = getattr(twilio_result, 'num_segments', 1)
                
                # Update target status
                target.status = "sent"
                target.sent_at = datetime.now(timezone.utc)
                target.last_template_id = template.id
                target.phone_number_id = from_number.id
                
                await db.commit()
                
                # Track analytics
                await analytics_service.track_message_sent(
                    org_id=target.campaign.organization_id,
                    campaign_id=target.campaign_id,
                    phone_number_id=from_number.id,
                    template_id=template.id,
                    message_id=message.id
                )
                
                # Update rate limiting tracking
                await _track_send_for_rate_limiting(db, from_number)
                
                return {
                    "status": "sent",
                    "message_sid": twilio_result.sid,
                    "message_id": str(message.id),
                    "segments": message.segments
                }
                
            except SMSServiceError as e:
                # Update message and target with error
                message.status = "failed"
                message.error_message = str(e)
                target.status = "failed"
                target.error_message = str(e)
                
                await db.commit()
                
                return {"status": "error", "error": str(e)}
            
        except Exception as e:
            # Log error and mark as failed
            if 'target' in locals():
                await _update_target_status(db, target, "failed", str(e))
            
            # Retry if not max retries
            if task.request.retries < task.max_retries:
                raise task.retry(exc=e, countdown=60 * (2 ** task.request.retries))
            
            return {"status": "error", "error": str(e), "retries_exhausted": True}


@celery_app.task
def process_inbound_message(phone_number: str, message_body: str, from_number: str, provider_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process inbound SMS message
    
    Args:
        phone_number: The phone number that received the message
        message_body: Content of the inbound message
        from_number: Phone number that sent the message
        provider_data: Raw data from Twilio webhook
        
    Returns:
        Processing result
    """
    return asyncio.run(_process_inbound_message_async(phone_number, message_body, from_number, provider_data))


async def _process_inbound_message_async(phone_number: str, message_body: str, from_number: str, provider_data: Dict[str, Any]) -> Dict[str, Any]:
    """Async implementation of process_inbound_message"""
    
    async with AsyncSessionLocal() as db:
        try:
            # Find the phone number record
            result = await db.execute(
                select(PhoneNumber).where(PhoneNumber.e164 == phone_number)
            )
            phone_record = result.scalar_one_or_none()
            
            if not phone_record:
                return {"status": "error", "error": "Phone number not found"}
            
            # Initialize compliance service
            compliance_service = ComplianceService(db)
            
            # Check for STOP keywords
            stop_processed = await compliance_service.process_stop_keyword(
                phone_number=from_number,
                message_content=message_body,
                org_id=phone_record.organization_id
            )
            
            # Check for HELP keywords
            help_processed = await compliance_service.process_help_keyword(
                phone_number=from_number,
                message_content=message_body,
                org_id=phone_record.organization_id
            )
            
            # Find associated lead
            lead = await _find_lead_by_phone(db, from_number, phone_record.organization_id)
            
            # Create inbound message record
            message = Message(
                organization_id=phone_record.organization_id,
                lead_id=lead.id if lead else None,
                direction="inbound",
                from_number=from_number,
                to_number=phone_number,
                content=message_body,
                provider_sid=provider_data.get('MessageSid'),
                status="received",
                provider_data=provider_data
            )
            
            db.add(message)
            await db.commit()
            
            return {
                "status": "processed",
                "message_id": str(message.id),
                "stop_processed": stop_processed,
                "help_processed": help_processed,
                "lead_found": lead is not None
            }
            
        except Exception as e:
            return {"status": "error", "error": str(e)}


@celery_app.task
def update_message_status(message_sid: str, status: str, error_code: Optional[str] = None, error_message: Optional[str] = None) -> Dict[str, Any]:
    """
    Update message status from Twilio webhook
    
    Args:
        message_sid: Twilio message SID
        status: New message status
        error_code: Error code if failed
        error_message: Error message if failed
        
    Returns:
        Update result
    """
    return asyncio.run(_update_message_status_async(message_sid, status, error_code, error_message))


async def _update_message_status_async(message_sid: str, status: str, error_code: Optional[str] = None, error_message: Optional[str] = None) -> Dict[str, Any]:
    """Async implementation of update_message_status"""
    
    async with AsyncSessionLocal() as db:
        try:
            # Find message by provider SID
            result = await db.execute(
                select(Message).where(Message.provider_sid == message_sid)
            )
            message = result.scalar_one_or_none()
            
            if not message:
                return {"status": "error", "error": "Message not found"}
            
            # Update message status
            old_status = message.status
            message.status = status
            message.updated_at = datetime.now(timezone.utc)
            
            if error_code:
                message.error_code = error_code
                message.error_message = error_message
            
            # Create status event
            status_event = MessageStatusEvent(
                message_id=message.id,
                status=status,
                error_code=error_code,
                timestamp=datetime.now(timezone.utc)
            )
            
            db.add(status_event)
            
            # Update campaign target if this is a campaign message
            if message.campaign_target_id:
                result = await db.execute(
                    select(CampaignTarget).where(CampaignTarget.id == message.campaign_target_id)
                )
                target = result.scalar_one_or_none()
                
                if target and target.status == "sent":
                    if status in ["delivered", "undelivered", "failed"]:
                        target.status = status
                        if status == "delivered":
                            target.delivered_at = datetime.now(timezone.utc)
            
            await db.commit()
            
            # Track analytics if status changed
            if old_status != status:
                analytics_service = AnalyticsService(db)
                await analytics_service.track_message_status_change(
                    message_id=message.id,
                    old_status=old_status,
                    new_status=status
                )
            
            return {
                "status": "updated",
                "message_id": str(message.id),
                "old_status": old_status,
                "new_status": status
            }
            
        except Exception as e:
            return {"status": "error", "error": str(e)}


@celery_app.task
def update_pending_message_statuses() -> Dict[str, Any]:
    """
    Periodic task to update pending message statuses from Twilio
    
    Returns:
        Update summary
    """
    return asyncio.run(_update_pending_message_statuses_async())


async def _update_pending_message_statuses_async() -> Dict[str, Any]:
    """Async implementation of update_pending_message_statuses"""
    
    async with AsyncSessionLocal() as db:
        try:
            # Find messages with pending statuses older than 5 minutes
            cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=5)
            
            result = await db.execute(
                select(Message).where(
                    and_(
                        Message.status.in_(["queued", "sent"]),
                        Message.created_at < cutoff_time,
                        Message.provider_sid.is_not(None)
                    )
                ).limit(100)  # Process in batches
            )
            messages = result.scalars().all()
            
            twilio_service = TwilioService()
            updated_count = 0
            
            for message in messages:
                try:
                    # Get status from Twilio
                    status_info = await twilio_service.get_message_status(message.provider_sid)
                    
                    if status_info['status'] != message.status:
                        # Update message status
                        message.status = status_info['status']
                        message.error_code = status_info.get('error_code')
                        message.error_message = status_info.get('error_message')
                        message.updated_at = datetime.now(timezone.utc)
                        
                        # Create status event
                        status_event = MessageStatusEvent(
                            message_id=message.id,
                            status=status_info['status'],
                            error_code=status_info.get('error_code'),
                            timestamp=datetime.now(timezone.utc)
                        )
                        
                        db.add(status_event)
                        updated_count += 1
                
                except Exception as e:
                    # Log error but continue processing other messages
                    continue
            
            await db.commit()
            
            return {
                "status": "completed",
                "messages_checked": len(messages),
                "messages_updated": updated_count
            }
            
        except Exception as e:
            return {"status": "error", "error": str(e)}


# Helper functions

async def _update_target_status(db: AsyncSession, target: CampaignTarget, status: str, error_message: Optional[str] = None):
    """Update campaign target status"""
    target.status = status
    target.updated_at = datetime.now(timezone.utc)
    if error_message:
        target.error_message = error_message
    await db.commit()


async def _is_sending_allowed_now(target: CampaignTarget) -> bool:
    """Check if sending is allowed based on quiet hours"""
    # This would implement timezone-aware quiet hours checking
    # For now, return True (implement based on target lead's timezone)
    return True


async def _get_next_allowed_send_time(target: CampaignTarget) -> datetime:
    """Calculate next allowed send time based on quiet hours"""
    # Implement based on target lead's timezone and quiet hours
    return datetime.now(timezone.utc) + timedelta(hours=8)


async def _get_available_phone_number(db: AsyncSession, org_id: uuid.UUID) -> Optional[PhoneNumber]:
    """Get an available phone number for sending"""
    result = await db.execute(
        select(PhoneNumber).where(
            and_(
                PhoneNumber.organization_id == org_id,
                PhoneNumber.status == "active",
                PhoneNumber.health_score > 50
            )
        ).order_by(PhoneNumber.last_used_at.asc().nullsfirst()).limit(1)
    )
    return result.scalar_one_or_none()


async def _can_send_now(db: AsyncSession, phone_number: PhoneNumber) -> bool:
    """Check if phone number can send based on rate limits"""
    # Check messages sent in the last second
    one_second_ago = datetime.now(timezone.utc) - timedelta(seconds=1)
    
    result = await db.execute(
        select(Message).where(
            and_(
                Message.from_number == phone_number.e164,
                Message.created_at >= one_second_ago,
                Message.status.in_(["queued", "sent"])
            )
        )
    )
    recent_messages = len(result.scalars().all())
    
    # Check against MPS limit
    return recent_messages < phone_number.mps


async def _calculate_rate_limit_delay(db: AsyncSession, phone_number: PhoneNumber) -> int:
    """Calculate delay needed to respect rate limits"""
    return 60 // phone_number.mps  # Spread messages evenly across the minute


async def _track_send_for_rate_limiting(db: AsyncSession, phone_number: PhoneNumber):
    """Update last used timestamp for rate limiting"""
    phone_number.last_used_at = datetime.now(timezone.utc)
    await db.commit()


async def _find_lead_by_phone(db: AsyncSession, phone_number: str, org_id: uuid.UUID) -> Optional[Lead]:
    """Find lead by phone number"""
    result = await db.execute(
        select(Lead).where(
            and_(
                Lead.organization_id == org_id,
                or_(
                    Lead.phone1 == phone_number,
                    Lead.phone2 == phone_number,
                    Lead.phone3 == phone_number
                )
            )
        ).limit(1)
    )
    return result.scalar_one_or_none()