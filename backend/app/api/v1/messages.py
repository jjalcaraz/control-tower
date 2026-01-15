# Messages API Routes
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.core.database import get_db
from app.models import Message, Lead
from app.core.config import settings

router = APIRouter()


def _parse_uuid(value: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {label}")


class MessageResponse(BaseModel):
    id: str
    campaign_id: Optional[str]
    lead_id: str
    direction: str
    from_phone: str
    to_phone: str
    content: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime]


class SendMessageRequest(BaseModel):
    to: str
    body: str
    lead_id: Optional[str] = None
    campaign_id: Optional[str] = None
    from_phone: Optional[str] = None


class ConversationMessageRequest(BaseModel):
    content: str


class BroadcastRequest(BaseModel):
    content: str
    leadIds: Optional[List[str]] = None
    filters: Optional[dict] = None


@router.get("/")
async def list_messages(
    campaign_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    direction: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List all messages with filtering"""
    from sqlalchemy import select, func

    query = select(Message)

    if campaign_id:
        campaign_uuid = _parse_uuid(campaign_id, "campaign_id")
        query = query.where(Message.campaign_id == campaign_uuid)
    if lead_id:
        lead_uuid = _parse_uuid(lead_id, "lead_id")
        query = query.where(Message.lead_id == lead_uuid)
    if direction:
        query = query.where(Message.direction == direction)

    count_query = select(func.count(Message.id))
    if campaign_id:
        campaign_uuid = _parse_uuid(campaign_id, "campaign_id")
        count_query = count_query.where(Message.campaign_id == campaign_uuid)
    if lead_id:
        lead_uuid = _parse_uuid(lead_id, "lead_id")
        count_query = count_query.where(Message.lead_id == lead_uuid)
    if direction:
        count_query = count_query.where(Message.direction == direction)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Message.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    messages = result.scalars().all()

    data = [
        MessageResponse(
            id=str(msg.id),
            campaign_id=str(msg.campaign_id) if msg.campaign_id else None,
            lead_id=str(msg.lead_id),
            direction=msg.direction,
            from_phone=msg.from_phone,
            to_phone=msg.to_phone,
            content=msg.content,
            status=msg.status,
            created_at=msg.created_at,
            updated_at=msg.updated_at
        )
        for msg in messages
    ]

    current_page = (skip // limit) + 1
    total_pages = (total + limit - 1) // limit if limit else 1

    return {
        "success": True,
        "data": data,
        "pagination": {
            "page": current_page,
            "pageSize": limit,
            "total": total,
            "totalPages": total_pages
        }
    }


@router.get("/test-config")
async def get_test_config():
    """Return Twilio configuration status for settings page."""
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.core.auth import DEFAULT_ORG_ID
    from app.models import Organization

    account_sid = settings.TWILIO_ACCOUNT_SID
    auth_token = settings.TWILIO_AUTH_TOKEN
    messaging_service = settings.TWILIO_MESSAGING_SERVICE_SID or ""

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Organization).where(Organization.id == DEFAULT_ORG_ID))
        organization = result.scalar_one_or_none()
        if organization and isinstance(organization.compliance_settings, dict):
            integrations = organization.compliance_settings.get("integrations", {})
            twilio_cfg = integrations.get("twilio", {})
            account_sid = twilio_cfg.get("account_sid") or account_sid
            auth_token = twilio_cfg.get("auth_token") or auth_token
            messaging_service = twilio_cfg.get("messaging_service_sid") or messaging_service

    configured = bool(
        account_sid
        and auth_token
        and account_sid != "your-twilio-account-sid"
    )

    return {
        "success": True,
        "message": "Twilio configuration loaded",
        "data": {
            "account_sid": account_sid if configured else "❌ Placeholder",
            "auth_token": auth_token if configured else "❌ Placeholder",
            "messaging_service": messaging_service,
            "client_initialized": configured,
            "twilio_configured": configured,
            "account_info": None,
            "account_info_error": None,
        }
    }


@router.get("/{message_id}", response_model=MessageResponse)
async def get_message(message_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific message"""
    from sqlalchemy import select

    message_uuid = _parse_uuid(message_id, "message_id")
    result = await db.execute(
        select(Message).where(Message.id == message_uuid)
    )
    message = result.scalar_one_or_none()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    return MessageResponse(
        id=str(message.id),
        campaign_id=str(message.campaign_id) if message.campaign_id else None,
        lead_id=str(message.lead_id),
        direction=message.direction,
        from_phone=message.from_phone,
        to_phone=message.to_phone,
        content=message.content,
        status=message.status,
        created_at=message.created_at,
        updated_at=message.updated_at
    )


@router.post("/", response_model=MessageResponse, status_code=201)
async def send_message(
    to_phone: str,
    from_phone: str,
    content: str,
    lead_id: str,
    campaign_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Send a new message"""
    # Use default organization from seed data (TODO: get from auth context)
    default_org_id = uuid.UUID("12345678-1234-5678-9abc-123456789012")
    lead_uuid = _parse_uuid(lead_id, "lead_id")

    new_message = Message(
        id=uuid.uuid4(),
        organization_id=default_org_id,
        lead_id=lead_uuid,
        campaign_id=campaign_id,
        direction="outbound",
        from_phone=from_phone,
        to_phone=to_phone,
        content=content,
        status="queued"
    )

    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)

    return MessageResponse(
        id=str(new_message.id),
        campaign_id=str(new_message.campaign_id) if new_message.campaign_id else None,
        lead_id=str(new_message.lead_id),
        direction=new_message.direction,
        from_phone=new_message.from_phone,
        to_phone=new_message.to_phone,
        content=new_message.content,
        status=new_message.status,
        created_at=new_message.created_at,
        updated_at=new_message.updated_at
    )


@router.post("/send", response_model=MessageResponse, status_code=201)
async def send_message_to_lead(
    payload: SendMessageRequest,
    db: AsyncSession = Depends(get_db)
):
    """Send a new message using JSON payload."""
    from sqlalchemy import select, or_

    lead_id = payload.lead_id
    if not lead_id:
        result = await db.execute(
            select(Lead).where(
                or_(
                    Lead.phone1 == payload.to,
                    Lead.phone2 == payload.to,
                    Lead.phone3 == payload.to
                )
            )
        )
        lead = result.scalar_one_or_none()
        if lead:
            lead_id = str(lead.id)

    if not lead_id:
        raise HTTPException(status_code=400, detail="lead_id is required")

    try:
        lead_uuid = uuid.UUID(str(lead_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid lead_id")

    default_org_id = uuid.UUID("12345678-1234-5678-9abc-123456789012")
    from_phone = payload.from_phone or settings.TWILIO_PHONE_NUMBER or "+10000000000"

    new_message = Message(
        id=uuid.uuid4(),
        organization_id=default_org_id,
        lead_id=lead_uuid,
        campaign_id=payload.campaign_id,
        direction="outbound",
        from_phone=from_phone,
        to_phone=payload.to,
        content=payload.body,
        status="queued"
    )

    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)

    return MessageResponse(
        id=str(new_message.id),
        campaign_id=str(new_message.campaign_id) if new_message.campaign_id else None,
        lead_id=str(new_message.lead_id),
        direction=new_message.direction,
        from_phone=new_message.from_phone,
        to_phone=new_message.to_phone,
        content=new_message.content,
        status=new_message.status,
        created_at=new_message.created_at,
        updated_at=new_message.updated_at
    )


class ConversationResponse(BaseModel):
    lead_id: str
    messages: List[MessageResponse]


class ConversationSummary(BaseModel):
    lead_id: str
    lead_name: str
    lead_phone: Optional[str] = None
    last_message: str
    last_message_time: datetime
    unread_count: int
    is_starred: bool
    is_archived: bool


@router.get("/conversations/", response_model=List[ConversationSummary])
async def list_conversations(
    status: Optional[str] = None,
    unread_count_gt: Optional[int] = None,
    starred: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List all conversations with filtering"""
    from sqlalchemy import select, func
    from app.models import Lead

    # Get unique lead IDs from messages
    msg_query = select(Message.lead_id).distinct()
    msg_result = await db.execute(msg_query)
    lead_ids = [row[0] for row in msg_result.all()]

    if not lead_ids:
        return []

    # Get leads by IDs
    query = select(Lead).where(Lead.id.in_(lead_ids))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    leads = result.scalars().all()

    # Get last message for each lead
    conversations = []
    for lead in leads:
        # Get the most recent message for this lead
        msg_result = await db.execute(
            select(Message)
            .where(Message.lead_id == lead.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_message = msg_result.scalar_one_or_none()

        if last_message:
            conversations.append(
                ConversationSummary(
                    lead_id=str(lead.id),
                    lead_name=lead.full_name or f"{lead.first_name} {lead.last_name}",
                    lead_phone=lead.phone1,
                    last_message=last_message.content[:100] if last_message.content else "",
                    last_message_time=last_message.created_at,
                    unread_count=0,  # Would calculate from read status
                    is_starred=False,  # Would query from database
                    is_archived=(status == "archived")
                )
            )

    # Sort by last message time
    conversations.sort(key=lambda x: x.last_message_time, reverse=True)

    return conversations


@router.get("/conversations/{lead_id}", response_model=ConversationResponse)
async def get_conversation(lead_id: str, db: AsyncSession = Depends(get_db)):
    """Get all messages for a conversation with a lead"""
    from sqlalchemy import select

    try:
        lead_uuid = uuid.UUID(lead_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid lead_id")

    query = select(Message).where(Message.lead_id == lead_uuid)
    query = query.order_by(Message.created_at.asc())

    result = await db.execute(query)
    messages = result.scalars().all()

    return ConversationResponse(
        lead_id=lead_id,
        messages=[
            MessageResponse(
                id=str(msg.id),
                campaign_id=str(msg.campaign_id) if msg.campaign_id else None,
                lead_id=str(msg.lead_id),
                direction=msg.direction,
                from_phone=msg.from_phone,
                to_phone=msg.to_phone,
                content=msg.content,
                status=msg.status,
                created_at=msg.created_at,
                updated_at=msg.updated_at
            )
            for msg in messages
        ]
    )


@router.post("/conversations/{lead_id}/messages", response_model=MessageResponse, status_code=201)
async def send_conversation_message(
    lead_id: str,
    payload: ConversationMessageRequest,
    db: AsyncSession = Depends(get_db)
):
    """Send a message to a lead conversation."""
    from sqlalchemy import select

    try:
        lead_uuid = uuid.UUID(lead_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid lead_id")

    result = await db.execute(select(Lead).where(Lead.id == lead_uuid))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    default_org_id = uuid.UUID("12345678-1234-5678-9abc-123456789012")
    from_phone = settings.TWILIO_PHONE_NUMBER or "+10000000000"

    new_message = Message(
        id=uuid.uuid4(),
        organization_id=default_org_id,
        lead_id=lead_uuid,
        direction="outbound",
        from_phone=from_phone,
        to_phone=lead.phone1,
        content=payload.content,
        status="queued"
    )

    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)

    return MessageResponse(
        id=str(new_message.id),
        campaign_id=str(new_message.campaign_id) if new_message.campaign_id else None,
        lead_id=str(new_message.lead_id),
        direction=new_message.direction,
        from_phone=new_message.from_phone,
        to_phone=new_message.to_phone,
        content=new_message.content,
        status=new_message.status,
        created_at=new_message.created_at,
        updated_at=new_message.updated_at
    )


@router.put("/conversations/{lead_id}/archive")
async def archive_conversation(lead_id: str):
    """Archive a conversation (placeholder)."""
    return {"success": True}


@router.delete("/conversations/{lead_id}")
async def delete_conversation(lead_id: str):
    """Delete a conversation (placeholder)."""
    return {"success": True}


@router.put("/conversations/{lead_id}/read")
async def mark_conversation_read(lead_id: str):
    """Mark a conversation as read (placeholder)."""
    return {"success": True}


@router.put("/conversations/{lead_id}/star")
async def star_conversation(lead_id: str):
    """Star a conversation (placeholder)."""
    return {"success": True}


@router.put("/conversations/{lead_id}/unstar")
async def unstar_conversation(lead_id: str):
    """Unstar a conversation (placeholder)."""
    return {"success": True}


@router.post("/broadcast")
async def broadcast_message(payload: BroadcastRequest):
    """Broadcast message placeholder."""
    return {"success": True, "queued": 0, "content": payload.content}
