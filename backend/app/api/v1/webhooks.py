# Webhooks API Routes
import copy

from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any
from datetime import datetime, timezone
import uuid

from app.core.database import get_db
from app.core.config import settings
from app.core.auth import DEFAULT_ORG_ID, DEFAULT_ORG_NAME, DEFAULT_ORG_SLUG, DEFAULT_BRAND_NAME
from app.models import Organization

router = APIRouter()


async def _get_or_create_default_org(db: AsyncSession) -> Organization:
    result = await db.execute(
        Organization.__table__.select().where(Organization.id == DEFAULT_ORG_ID)
    )
    row = result.first()
    if row:
        return await db.get(Organization, DEFAULT_ORG_ID)

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
async def list_webhooks(db: AsyncSession = Depends(get_db)):
    """List configured webhooks."""
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    return {
        "success": True,
        "data": store.get("webhooks", [])
    }


@router.post("/")
async def create_webhook(payload: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    """Create a webhook configuration."""
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    webhooks = list(store.get("webhooks", []))

    webhook = {
        "id": f"wh_{uuid.uuid4().hex[:8]}",
        "url": payload.get("url"),
        "events": payload.get("events", []),
        "is_active": payload.get("is_active", True),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    webhooks.append(webhook)
    store["webhooks"] = webhooks
    organization.compliance_settings = store
    await db.commit()

    return {"success": True, "data": webhook}


@router.post("/test")
async def test_webhook(payload: Dict[str, Any]):
    """Test a webhook endpoint."""
    import httpx

    url = payload.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="Missing url")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=payload.get("data") or {"test": "data", "timestamp": datetime.now(timezone.utc).isoformat()},
                timeout=5.0
            )
        return {"success": True, "data": {"status_code": response.status_code}}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


@router.post("/test-url")
async def test_webhook_url(payload: Dict[str, Any]):
    """Test a webhook by URL."""
    return await test_webhook(payload)


@router.post("/twilio/status")
async def twilio_status_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Twilio status callbacks for message delivery updates"""
    from sqlalchemy import select, update
    from app.models import Message, MessageStatusEvent

    form_data = await request.form()

    message_sid = form_data.get("MessageSid")
    message_status = form_data.get("MessageStatus")
    error_code = form_data.get("ErrorCode", None)

    if not message_sid:
        raise HTTPException(status_code=400, detail="Missing MessageSid")

    # Find the message by twilio_message_sid
    result = await db.execute(
        select(Message).where(Message.twilio_message_sid == message_sid)
    )
    message = result.scalar_one_or_none()

    if message:
        # Update message status
        message.status = message_status
        if error_code:
            message.twilio_error_code = error_code

        # Create status event
        status_event = MessageStatusEvent(
            id=uuid.uuid4(),
            message_id=message.id,
            status=message_status,
            error_code=error_code,
            raw_data=dict(form_data)
        )
        db.add(status_event)

        await db.commit()

    return {"status": "success"}


@router.post("/twilio/inbound")
async def twilio_inbound_message(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle inbound messages from Twilio"""
    from sqlalchemy import select
    from app.models import Message, Suppression

    form_data = await request.form()

    from_number = form_data.get("From", "")
    to_number = form_data.get("To", "")
    body = form_data.get("Body", "").strip()
    message_sid = form_data.get("MessageSid", "")

    if not from_number or not body:
        raise HTTPException(status_code=400, detail="Missing required fields")

    # Check for STOP/ALTO keywords
    stop_keywords = ["stop", "alto", "quit", "cancel", "end", "unsubscribe", "stopall"]
    if body.lower() in [kw.lower() for kw in stop_keywords]:
        # Add to suppressions
        existing = await db.execute(
            select(Suppression).where(
                Suppression.phone_number == from_number,
                Suppression.reason == "opt_out"
            )
        )
        existing_opt = existing.scalar_one_or_none()

        if not existing_opt:
            new_opt = Suppression(
                id=uuid.uuid4(),
                phone_number=from_number,
                normalized_phone=from_number,
                source="keyword",
                reason="opt_out",
                is_active=True
            )
            db.add(new_opt)
            await db.commit()

        # Return TWIML response
        twiml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>You have been opted out and will no longer receive messages. Reply START to opt back in.</Message>
</Response>"""
        return twiml_response

    # Check for HELP/AYUDA keywords
    help_keywords = ["help", "ayuda", "info", "information"]
    if body.lower() in [kw.lower() for kw in help_keywords]:
        twiml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>For support, reply STOP to opt out or HELP for more info. Msg & data rates may apply.</Message>
</Response>"""
        return twiml_response

    # Store inbound message
    inbound_message = Message(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),  # Would get from auth context
        lead_id=uuid.uuid4(),  # Would look up or create lead
        direction="inbound",
        from_phone=from_number,
        to_phone=to_number,
        content=body,
        status="received"
    )

    db.add(inbound_message)
    await db.commit()

    # Return empty TWIML to acknowledge
    return """<?xml version="1.0" encoding="UTF-8"?>
<Response/>"""


@router.post("/twilio/fallback")
async def twilio_fallback(request: Request):
    """Handle Twilio webhook errors/fallbacks"""
    form_data = await request.form()

    # Log the error
    error_details = {
        "error_url": str(request.url),
        "payload": dict(form_data),
        "timestamp": str(datetime.now())
    }

    # Would log to error tracking system

    # Return error TWIML
    return """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>An error occurred processing your message. Please try again later.</Message>
</Response>"""
