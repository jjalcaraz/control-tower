# Phone Numbers API Routes
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.core.database import get_db
from app.models import PhoneNumber

router = APIRouter()


class PhoneNumberResponse(BaseModel):
    id: str
    phone_number: str
    formatted_number: str
    display_number: str
    status: str
    health_score: int
    sms_enabled: bool
    delivery_rate: float
    created_at: datetime
    updated_at: Optional[datetime]


@router.get("/", response_model=List[PhoneNumberResponse])
async def list_phone_numbers(
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List all phone numbers"""
    from sqlalchemy import select

    query = select(PhoneNumber)

    if is_active is not None:
        query = query.where(PhoneNumber.status == "active" if is_active else "inactive")

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    numbers = result.scalars().all()

    return [
        PhoneNumberResponse(
            id=str(num.id),
            phone_number=num.phone_number,
            formatted_number=num.formatted_number,
            display_number=num.display_number,
            status=num.status,
            health_score=num.health_score,
            sms_enabled=num.sms_enabled,
            delivery_rate=num.delivery_rate,
            created_at=num.created_at,
            updated_at=num.updated_at
        )
        for num in numbers
    ]


@router.get("/{number_id}", response_model=PhoneNumberResponse)
async def get_phone_number(number_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific phone number"""
    from sqlalchemy import select

    result = await db.execute(
        select(PhoneNumber).where(PhoneNumber.id == number_id)
    )
    number = result.scalar_one_or_none()

    if not number:
        raise HTTPException(status_code=404, detail="Phone number not found")

    return PhoneNumberResponse(
        id=str(number.id),
        phone_number=number.phone_number,
        formatted_number=number.formatted_number,
        display_number=number.display_number,
        status=number.status,
        health_score=number.health_score,
        sms_enabled=number.sms_enabled,
        delivery_rate=number.delivery_rate,
        created_at=number.created_at,
        updated_at=number.updated_at
    )


@router.get("/{number_id}/health")
async def get_number_health(number_id: str, db: AsyncSession = Depends(get_db)):
    """Get detailed health metrics for a phone number"""
    from sqlalchemy import select

    result = await db.execute(
        select(PhoneNumber).where(PhoneNumber.id == number_id)
    )
    number = result.scalar_one_or_none()

    if not number:
        raise HTTPException(status_code=404, detail="Phone number not found")

    return {
        "health_score": number.health_score,
        "status": number.status,
        "delivery_rate": number.delivery_rate,
        "reply_rate": number.reply_rate,
        "opt_out_rate": number.opt_out_rate,
        "daily_volume": number.daily_message_count,
        "daily_limit": number.daily_limit,
        "rate_limit_mps": number.rate_limit_mps,
        "last_activity": number.last_used_at
    }


@router.post("/acquire", response_model=PhoneNumberResponse, status_code=201)
async def acquire_phone_number(
    area_code: str,
    db: AsyncSession = Depends(get_db)
):
    """Acquire a new phone number (placeholder for Twilio integration)"""
    # This would integrate with Twilio to acquire a number
    new_number = PhoneNumber(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),  # Would get from auth context
        phone_number=f"+1{area_code}5550100",  # Placeholder
        formatted_number=f"+1{area_code}5550100",
        display_number=f"({area_code}) 555-0100",
        status="active",
        health_score=100,
        sms_enabled=True,
        delivery_rate=0.0,
        reply_rate=0.0,
        opt_out_rate=0.0
    )

    db.add(new_number)
    await db.commit()
    await db.refresh(new_number)

    return PhoneNumberResponse(
        id=str(new_number.id),
        phone_number=new_number.phone_number,
        formatted_number=new_number.formatted_number,
        display_number=new_number.display_number,
        status=new_number.status,
        health_score=new_number.health_score,
        sms_enabled=new_number.sms_enabled,
        delivery_rate=new_number.delivery_rate,
        created_at=new_number.created_at,
        updated_at=new_number.updated_at
    )


@router.patch("/{number_id}/settings")
async def update_number_settings(
    number_id: str,
    rate_limit_mps: Optional[int] = None,
    daily_limit: Optional[int] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Update phone number settings"""
    from sqlalchemy import select

    result = await db.execute(
        select(PhoneNumber).where(PhoneNumber.id == number_id)
    )
    number = result.scalar_one_or_none()

    if not number:
        raise HTTPException(status_code=404, detail="Phone number not found")

    if rate_limit_mps is not None:
        number.rate_limit_mps = rate_limit_mps
    if daily_limit is not None:
        number.daily_limit = daily_limit
    if status is not None:
        number.status = status

    await db.commit()
    await db.refresh(number)

    return PhoneNumberResponse(
        id=str(number.id),
        phone_number=number.phone_number,
        formatted_number=number.formatted_number,
        display_number=number.display_number,
        status=number.status,
        health_score=number.health_score,
        sms_enabled=number.sms_enabled,
        delivery_rate=number.delivery_rate,
        created_at=number.created_at,
        updated_at=number.updated_at
    )


@router.delete("/{number_id}", status_code=204)
async def delete_phone_number(number_id: str, db: AsyncSession = Depends(get_db)):
    """Delete/release a phone number"""
    from sqlalchemy import select

    result = await db.execute(
        select(PhoneNumber).where(PhoneNumber.id == number_id)
    )
    number = result.scalar_one_or_none()

    if not number:
        raise HTTPException(status_code=404, detail="Phone number not found")

    await db.delete(number)
    await db.commit()

    return None
