# Messages API Routes
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.core.database import get_db
from app.models import Message

router = APIRouter()


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


@router.get("/", response_model=List[MessageResponse])
async def list_messages(
    campaign_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    direction: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List all messages with filtering"""
    from sqlalchemy import select

    query = select(Message)

    if campaign_id:
        query = query.where(Message.campaign_id == campaign_id)
    if lead_id:
        query = query.where(Message.lead_id == lead_id)
    if direction:
        query = query.where(Message.direction == direction)

    query = query.order_by(Message.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    messages = result.scalars().all()

    return [
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


@router.get("/{message_id}", response_model=MessageResponse)
async def get_message(message_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific message"""
    from sqlalchemy import select

    result = await db.execute(
        select(Message).where(Message.id == message_id)
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

    new_message = Message(
        id=uuid.uuid4(),
        organization_id=default_org_id,
        lead_id=lead_id,
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


class ConversationResponse(BaseModel):
    lead_id: str
    messages: List[MessageResponse]


class ConversationSummary(BaseModel):
    lead_id: str
    lead_name: str
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

    query = select(Message).where(Message.lead_id == lead_id)
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
