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


def _parse_number_id(number_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(number_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid phone number ID format.")


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


class PhoneNumberSettingsUpdate(BaseModel):
    rate_limit_mps: Optional[int] = None
    daily_limit: Optional[int] = None
    status: Optional[str] = None
    sms_enabled: Optional[bool] = None


@router.get("/")
async def list_phone_numbers(
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List all phone numbers"""
    from sqlalchemy import select, func

    query = select(PhoneNumber)

    if is_active is not None:
        query = query.where(PhoneNumber.status == "active" if is_active else "inactive")

    count_query = select(func.count(PhoneNumber.id))
    if is_active is not None:
        count_query = count_query.where(PhoneNumber.status == "active" if is_active else "inactive")
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    numbers = result.scalars().all()

    data = [
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


@router.get("/{number_id}", response_model=PhoneNumberResponse)
async def get_phone_number(number_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific phone number"""
    from sqlalchemy import select

    number_uuid = _parse_number_id(number_id)
    result = await db.execute(
        select(PhoneNumber).where(PhoneNumber.id == number_uuid)
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

    number_uuid = _parse_number_id(number_id)
    result = await db.execute(
        select(PhoneNumber).where(PhoneNumber.id == number_uuid)
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


@router.post("/purchase", response_model=PhoneNumberResponse, status_code=201)
async def purchase_phone_number(payload: dict, db: AsyncSession = Depends(get_db)):
    """Purchase a phone number (alias for acquire)."""
    area_code = payload.get("areaCode") or payload.get("area_code") or "000"
    return await acquire_phone_number(area_code, db)


@router.post("/sync-twilio")
async def sync_twilio_numbers():
    """Sync phone numbers from Twilio (placeholder)."""
    return {"success": True, "synced": 0}


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

    number_uuid = _parse_number_id(number_id)
    result = await db.execute(
        select(PhoneNumber).where(PhoneNumber.id == number_uuid)
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


@router.put("/{number_id}/settings")
async def update_number_settings_put(
    number_id: str,
    payload: PhoneNumberSettingsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update phone number settings (PUT alias)."""
    from sqlalchemy import select

    number_uuid = _parse_number_id(number_id)
    result = await db.execute(
        select(PhoneNumber).where(PhoneNumber.id == number_uuid)
    )
    number = result.scalar_one_or_none()

    if not number:
        raise HTTPException(status_code=404, detail="Phone number not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "rate_limit_mps" in update_data:
        number.rate_limit_mps = update_data["rate_limit_mps"]
    if "daily_limit" in update_data:
        number.daily_limit = update_data["daily_limit"]
    if "status" in update_data:
        number.status = update_data["status"]
    if "sms_enabled" in update_data:
        number.sms_enabled = update_data["sms_enabled"]

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


@router.post("/{number_id}/test")
async def test_phone_number(number_id: str):
    """Test a phone number (placeholder)."""
    return {"success": True, "phone_number_id": number_id}


@router.get("/{number_id}/analytics")
async def get_phone_number_analytics(number_id: str, timeRange: Optional[str] = None):
    """Get phone number analytics (placeholder)."""
    return {
        "success": True,
        "data": {
            "phone_number_id": number_id,
            "time_range": timeRange or "30d",
            "sent": 0,
            "delivered": 0,
            "replies": 0
        }
    }


@router.delete("/{number_id}", status_code=204)
async def delete_phone_number(number_id: str, db: AsyncSession = Depends(get_db)):
    """Delete/release a phone number"""
    from sqlalchemy import select

    number_uuid = _parse_number_id(number_id)
    result = await db.execute(
        select(PhoneNumber).where(PhoneNumber.id == number_uuid)
    )
    number = result.scalar_one_or_none()

    if not number:
        raise HTTPException(status_code=404, detail="Phone number not found")

    await db.delete(number)
    await db.commit()

    return None
