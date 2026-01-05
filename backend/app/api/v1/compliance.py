# Compliance API Routes
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date
import uuid

from app.core.database import get_db
from app.models import Suppression, AuditEvent

router = APIRouter()


class OptOutResponse(BaseModel):
    id: str
    phone_number: str
    source: str
    reason: Optional[str]
    campaign_id: Optional[str]
    is_active: bool
    created_at: datetime


@router.get("/opt-outs", response_model=List[OptOutResponse])
async def list_opt_outs(
    search: Optional[str] = None,
    source: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List all opt-outs with filtering"""
    from sqlalchemy import select

    query = select(Suppression).where(Suppression.reason == "opt_out")

    if search:
        query = query.where(Suppression.phone_number.ilike(f"%{search}%"))
    if source:
        query = query.where(Suppression.source == source)
    if is_active is not None:
        query = query.where(Suppression.is_active == is_active)

    query = query.order_by(Suppression.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    opt_outs = result.scalars().all()

    return [
        OptOutResponse(
            id=str(opt.id),
            phone_number=opt.phone_number,
            source=opt.source,
            reason=opt.reason,
            campaign_id=str(opt.campaign_id) if opt.campaign_id else None,
            is_active=opt.is_active,
            created_at=opt.created_at
        )
        for opt in opt_outs
    ]


@router.post("/opt-outs/bulk")
async def bulk_add_opt_outs(
    phone_numbers: List[str],
    source: str = "manual",
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Bulk add opt-outs"""
    added = []
    for phone in phone_numbers:
        # Check if already exists
        from sqlalchemy import select
        existing = await db.execute(
            select(Suppression).where(
                Suppression.phone_number == phone,
                Suppression.reason == "opt_out"
            )
        )
        existing_opt = existing.scalar_one_or_none()

        if not existing_opt:
            new_opt = Suppression(
                id=uuid.uuid4(),
                phone_number=phone,
                normalized_phone=phone,  # Would normalize to E.164
                source=source,
                reason=reason or "opt_out",
                is_active=True
            )
            db.add(new_opt)
            added.append(phone)

    await db.commit()

    return {
        "added": len(added),
        "phone_numbers": added
    }


@router.delete("/opt-outs/{opt_out_id}", status_code=204)
async def remove_opt_out(opt_out_id: str, db: AsyncSession = Depends(get_db)):
    """Remove an opt-out (deactivate)"""
    from sqlalchemy import select

    result = await db.execute(
        select(Suppression).where(Suppression.id == opt_out_id)
    )
    opt_out = result.scalar_one_or_none()

    if not opt_out:
        raise HTTPException(status_code=404, detail="Opt-out not found")

    opt_out.is_active = False
    await db.commit()

    return None


@router.get("/audit-logs")
async def get_audit_logs(
    event_type: Optional[str] = None,
    phone_number: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get compliance audit logs"""
    from sqlalchemy import select

    query = select(AuditEvent)

    if event_type:
        query = query.where(AuditEvent.event_type == event_type)
    if phone_number:
        query = query.where(AuditEvent.phone_number == phone_number)
    if start_date:
        query = query.where(AuditEvent.created_at >= start_date)
    if end_date:
        query = query.where(AuditEvent.created_at <= end_date)

    query = query.order_by(AuditEvent.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    events = result.scalars().all()

    return {
        "total": len(events),
        "events": [
            {
                "id": str(event.id),
                "event_type": event.event_type,
                "phone_number": event.phone_number,
                "details": event.details,
                "compliance_status": event.compliance_status,
                "created_at": event.created_at
            }
            for event in events
        ]
    }


@router.post("/reports/generate")
async def generate_compliance_report(
    report_type: str,
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db)
):
    """Generate a compliance report"""
    # Placeholder report generation
    return {
        "report_type": report_type,
        "start_date": start_date,
        "end_date": end_date,
        "status": "generated",
        "download_url": f"/api/v1/compliance/reports/download/{uuid.uuid4()}",
        "generated_at": datetime.now()
    }
