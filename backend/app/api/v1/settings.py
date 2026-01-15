import copy

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.auth import DEFAULT_ORG_ID, DEFAULT_ORG_NAME, DEFAULT_ORG_SLUG, DEFAULT_BRAND_NAME
from app.models import Organization

router = APIRouter()


class SettingsUpdate(BaseModel):
    data: dict


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


@router.get("")
async def get_settings(db: AsyncSession = Depends(get_db)):
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    settings_blob = store.get("settings", {})
    return {
        "success": True,
        "data": {
            "sms": {
                "default_rate_limit_mps": settings_blob.get("sms", {}).get("default_rate_limit_mps", organization.default_rate_limit_mps),
                "quiet_hours_start": settings_blob.get("sms", {}).get("quiet_hours_start", organization.quiet_hours_start),
                "quiet_hours_end": settings_blob.get("sms", {}).get("quiet_hours_end", organization.quiet_hours_end),
                "timezone": settings_blob.get("sms", {}).get("timezone", organization.default_timezone),
            },
            "uploads": {
                "max_upload_size": settings_blob.get("uploads", {}).get("max_upload_size", settings.MAX_UPLOAD_SIZE),
                "upload_dir": settings_blob.get("uploads", {}).get("upload_dir", settings.UPLOAD_DIR),
            },
            "logging": {
                "level": settings_blob.get("logging", {}).get("level", settings.LOG_LEVEL),
            },
        },
    }


@router.put("")
async def update_settings(payload: dict, db: AsyncSession = Depends(get_db)):
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    current = store.get("settings", {})

    sms = payload.get("sms") or {}
    uploads = payload.get("uploads") or {}
    logging_cfg = payload.get("logging") or {}

    if "default_rate_limit_mps" in sms:
        organization.default_rate_limit_mps = sms["default_rate_limit_mps"]
    if "quiet_hours_start" in sms:
        organization.quiet_hours_start = sms["quiet_hours_start"]
    if "quiet_hours_end" in sms:
        organization.quiet_hours_end = sms["quiet_hours_end"]
    if "timezone" in sms:
        organization.default_timezone = sms["timezone"]

    current = {
        **current,
        "sms": {**current.get("sms", {}), **sms},
        "uploads": {**current.get("uploads", {}), **uploads},
        "logging": {**current.get("logging", {}), **logging_cfg},
    }

    store["settings"] = current
    organization.compliance_settings = store
    await db.commit()

    return {"success": True, "data": payload}


@router.get("/integrations")
async def get_integration_settings(db: AsyncSession = Depends(get_db)):
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    integrations_blob = store.get("integrations", {})
    twilio = integrations_blob.get("twilio", {})
    return {
        "success": True,
        "data": {
            "twilio": {
                "account_sid": twilio.get("account_sid") or settings.TWILIO_ACCOUNT_SID,
                "auth_token": twilio.get("auth_token") or settings.TWILIO_AUTH_TOKEN,
                "phone_number": twilio.get("phone_number") or settings.TWILIO_PHONE_NUMBER,
                "messaging_service_sid": twilio.get("messaging_service_sid") or settings.TWILIO_MESSAGING_SERVICE_SID,
                "webhook_url": twilio.get("webhook_url") or settings.TWILIO_WEBHOOK_URL,
            }
        },
    }


@router.put("/integrations")
async def update_integration_settings(payload: dict, db: AsyncSession = Depends(get_db)):
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    integrations = store.get("integrations", {})

    twilio = payload.get("twilio") or {}
    integrations["twilio"] = {**integrations.get("twilio", {}), **twilio}

    store["integrations"] = integrations
    organization.compliance_settings = store
    await db.commit()

    return {"success": True, "data": payload}


@router.post("/integrations/test")
async def test_integration_settings(payload: dict):
    return {"success": True, "data": {"status": "ok", "type": payload.get("type")}}
