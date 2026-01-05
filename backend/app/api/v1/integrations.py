# Integrations API Routes
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.core.config import settings

router = APIRouter()


class TwilioStatusResponse(BaseModel):
    account_sid: str
    is_configured: bool
    webhook_url: str
    status: str


@router.get("/twilio/status", response_model=TwilioStatusResponse)
async def get_twilio_status():
    """Get Twilio integration status"""
    is_configured = bool(
        settings.TWILIO_ACCOUNT_SID and
        settings.TWILIO_AUTH_TOKEN and
        settings.TWILIO_ACCOUNT_SID != "your-twilio-account-sid"
    )

    return TwilioStatusResponse(
        account_sid=settings.TWILIO_ACCOUNT_SID[:8] + "..." if is_configured else "Not configured",
        is_configured=is_configured,
        webhook_url=settings.TWILIO_WEBHOOK_URL,
        status="connected" if is_configured else "not configured"
    )


@router.post("/twilio/test")
async def test_twilio_connection():
    """Test Twilio connection"""
    try:
        from twilio.rest import Client

        client = Client(
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_AUTH_TOKEN
        )

        # Try to fetch account info
        account = client.api.accounts(settings.TWILIO_ACCOUNT_SID).fetch()

        return {
            "status": "success",
            "account_sid": account.sid,
            "friendly_name": account.friendly_name
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }


class TwilioConfigUpdate(BaseModel):
    account_sid: str
    auth_token: str
    phone_number: Optional[str] = None
    webhook_url: Optional[str] = None


@router.patch("/twilio/config")
async def update_twilio_config(config: TwilioConfigUpdate):
    """Update Twilio configuration"""
    # This would update environment variables or database settings
    # For now, return success
    return {
        "status": "success",
        "message": "Configuration updated (requires restart to take effect)"
    }


@router.get("/api-keys")
async def list_api_keys():
    """List API keys"""
    # Placeholder - would fetch from database
    return {
        "api_keys": [
            {
                "id": "key_1",
                "name": "Development Key",
                "created_at": "2024-01-01T00:00:00Z",
                "last_used": "2024-01-15T10:30:00Z"
            }
        ]
    }


@router.post("/api-keys")
async def create_api_key(name: str):
    """Create a new API key"""
    import uuid

    new_key = {
        "id": f"key_{uuid.uuid4().hex[:8]}",
        "name": name,
        "key": f"sk_{uuid.uuid4().hex}",
        "created_at": datetime.now().isoformat()
    }

    return new_key


@router.delete("/api-keys/{key_id}")
async def delete_api_key(key_id: str):
    """Delete an API key"""
    return {
        "status": "deleted",
        "key_id": key_id
    }


@router.get("/webhooks")
async def list_webhooks():
    """List configured webhooks"""
    # Placeholder - would fetch from database
    return {
        "webhooks": [
            {
                "id": "wh_1",
                "url": "https://example.com/webhook",
                "events": ["message.sent", "message.delivered"],
                "is_active": True
            }
        ]
    }


@router.post("/webhooks/test")
async def test_webhook(url: str):
    """Test a webhook endpoint"""
    import httpx

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json={"test": "data", "timestamp": datetime.now().isoformat()},
                timeout=5.0
            )

        return {
            "status": "success",
            "status_code": response.status_code,
            "response": response.text[:100]  # Truncate long responses
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }
