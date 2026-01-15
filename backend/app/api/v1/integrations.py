# Integrations API Routes
import copy
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.config import settings
from app.core.auth import DEFAULT_ORG_ID, DEFAULT_ORG_NAME, DEFAULT_ORG_SLUG, DEFAULT_BRAND_NAME
from app.models import Organization

router = APIRouter()


class TwilioStatusResponse(BaseModel):
    account_sid: str
    is_configured: bool
    webhook_url: str
    status: str


async def _get_or_create_default_org(db: AsyncSession) -> Organization:
    result = await db.execute(select(Organization).where(Organization.id == DEFAULT_ORG_ID))
    organization = result.scalar_one_or_none()
    if organization:
        return organization

    organization = Organization(
        id=DEFAULT_ORG_ID,
        name=DEFAULT_ORG_NAME,
        slug=DEFAULT_ORG_SLUG,
        brand_name=DEFAULT_BRAND_NAME,
    )
    db.add(organization)
    await db.commit()
    await db.refresh(organization)
    return organization


def _get_store(organization: Organization) -> dict:
    store = copy.deepcopy(organization.compliance_settings or {})
    return store if isinstance(store, dict) else {}


@router.get("/")
async def list_integrations(db: AsyncSession = Depends(get_db)):
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    twilio_cfg = store.get("integrations", {}).get("twilio", {})
    configured = bool(twilio_cfg.get("account_sid") or settings.TWILIO_ACCOUNT_SID)
    return {
        "success": True,
        "data": [
            {"id": "twilio", "name": "Twilio", "status": "configured" if configured else "missing"},
        ],
    }


@router.get("/twilio/status", response_model=TwilioStatusResponse)
async def get_twilio_status(db: AsyncSession = Depends(get_db)):
    """Get Twilio integration status"""
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    twilio_cfg = store.get("integrations", {}).get("twilio", {})
    account_sid = twilio_cfg.get("account_sid") or settings.TWILIO_ACCOUNT_SID
    auth_token = twilio_cfg.get("auth_token") or settings.TWILIO_AUTH_TOKEN
    webhook_url = twilio_cfg.get("webhook_url") or settings.TWILIO_WEBHOOK_URL

    is_configured = bool(
        account_sid and
        auth_token and
        account_sid != "your-twilio-account-sid"
    )

    return TwilioStatusResponse(
        account_sid=account_sid[:8] + "..." if is_configured else "Not configured",
        is_configured=is_configured,
        webhook_url=webhook_url,
        status="connected" if is_configured else "not configured"
    )


@router.post("/twilio/test")
async def test_twilio_connection(db: AsyncSession = Depends(get_db)):
    """Test Twilio connection"""
    try:
        from twilio.rest import Client

        organization = await _get_or_create_default_org(db)
        store = _get_store(organization)
        twilio_cfg = store.get("integrations", {}).get("twilio", {})

        account_sid = twilio_cfg.get("account_sid") or settings.TWILIO_ACCOUNT_SID
        auth_token = twilio_cfg.get("auth_token") or settings.TWILIO_AUTH_TOKEN

        client = Client(
            account_sid,
            auth_token
        )

        # Try to fetch account info
        account = client.api.accounts(account_sid).fetch()

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
async def update_twilio_config(config: TwilioConfigUpdate, db: AsyncSession = Depends(get_db)):
    """Update Twilio configuration"""
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    integrations = store.get("integrations", {})
    integrations["twilio"] = {
        "account_sid": config.account_sid,
        "auth_token": config.auth_token,
        "phone_number": config.phone_number,
        "webhook_url": config.webhook_url,
    }
    store["integrations"] = integrations
    organization.compliance_settings = store
    await db.commit()
    return {
        "status": "success",
        "message": "Configuration updated"
    }


@router.put("/twilio/config")
async def update_twilio_config_put(config: TwilioConfigUpdate):
    """Update Twilio configuration (PUT alias)."""
    return await update_twilio_config(config)


@router.get("/api-keys")
async def list_api_keys(db: AsyncSession = Depends(get_db)):
    """List API keys"""
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    return {"api_keys": store.get("api_keys", [])}


@router.post("/api-keys")
async def create_api_key(name: str, db: AsyncSession = Depends(get_db)):
    """Create a new API key"""
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    api_keys = list(store.get("api_keys", []))

    new_key = {
        "id": f"key_{uuid.uuid4().hex[:8]}",
        "name": name,
        "key": f"sk_{uuid.uuid4().hex}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    api_keys.append(new_key)
    store["api_keys"] = api_keys
    organization.compliance_settings = store
    await db.commit()

    return new_key


@router.delete("/api-keys/{key_id}")
async def delete_api_key(key_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an API key"""
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    api_keys = [key for key in store.get("api_keys", []) if key.get("id") != key_id]
    store["api_keys"] = api_keys
    organization.compliance_settings = store
    await db.commit()
    return {
        "status": "deleted",
        "key_id": key_id
    }


@router.get("/webhooks")
async def list_webhooks(db: AsyncSession = Depends(get_db)):
    """List configured webhooks"""
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    return {
        "webhooks": store.get("webhooks", [])
    }


@router.post("/webhooks/test")
async def test_webhook(url: str):
    """Test a webhook endpoint"""
    import httpx

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json={"test": "data", "timestamp": datetime.now(timezone.utc).isoformat()},
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
