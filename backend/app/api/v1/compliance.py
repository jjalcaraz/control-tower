# Compliance API Routes
import copy

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date, timezone
import uuid

from app.core.database import get_db
from app.core.auth import DEFAULT_ORG_ID, DEFAULT_ORG_NAME, DEFAULT_ORG_SLUG, DEFAULT_BRAND_NAME
from app.models import Suppression, AuditEvent, Lead, Organization

router = APIRouter()


def _parse_opt_out_id(opt_out_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(opt_out_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid opt-out ID format.")


class OptOutResponse(BaseModel):
    id: str
    phone_number: str
    source: str
    reason: Optional[str]
    campaign_id: Optional[str]
    is_active: bool
    created_at: datetime


class OptOutCreate(BaseModel):
    phoneNumber: str
    source: Optional[str] = "manual"
    reason: Optional[str] = None


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


@router.get("/opt-outs")
async def list_opt_outs(
    search: Optional[str] = None,
    source: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List all opt-outs with filtering"""
    from sqlalchemy import select, func

    query = select(Suppression).where(Suppression.reason == "opt_out")

    if search:
        query = query.where(Suppression.phone_number.ilike(f"%{search}%"))
    if source:
        query = query.where(Suppression.source == source)
    if is_active is not None:
        query = query.where(Suppression.is_active == is_active)

    count_query = select(func.count(Suppression.id)).where(Suppression.reason == "opt_out")
    if search:
        count_query = count_query.where(Suppression.phone_number.ilike(f"%{search}%"))
    if source:
        count_query = count_query.where(Suppression.source == source)
    if is_active is not None:
        count_query = count_query.where(Suppression.is_active == is_active)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Suppression.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    opt_outs = result.scalars().all()

    data = [
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


@router.post("/opt-outs/bulk")
async def bulk_add_opt_outs(
    payload: object = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Bulk add opt-outs"""
    phone_numbers: List[str] = []
    source = "manual"
    reason = None

    if isinstance(payload, list):
        phone_numbers = payload
    elif isinstance(payload, dict):
        raw_numbers = payload.get("phoneNumbers") or payload.get("phone_numbers") or []
        phone_numbers = list(raw_numbers) if isinstance(raw_numbers, list) else []
        source = payload.get("source") or source
        reason = payload.get("reason")

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


@router.post("/opt-outs")
async def add_opt_out(payload: OptOutCreate, db: AsyncSession = Depends(get_db)):
    """Add a single opt-out."""
    new_opt = Suppression(
        id=uuid.uuid4(),
        phone_number=payload.phoneNumber,
        normalized_phone=payload.phoneNumber,
        source=payload.source or "manual",
        reason=payload.reason or "opt_out",
        is_active=True
    )
    db.add(new_opt)
    await db.commit()
    await db.refresh(new_opt)

    return {
        "success": True,
        "data": OptOutResponse(
            id=str(new_opt.id),
            phone_number=new_opt.phone_number,
            source=new_opt.source,
            reason=new_opt.reason,
            campaign_id=None,
            is_active=new_opt.is_active,
            created_at=new_opt.created_at
        )
    }


@router.delete("/opt-outs/{opt_out_id}", status_code=204)
async def remove_opt_out(opt_out_id: str, db: AsyncSession = Depends(get_db)):
    """Remove an opt-out (deactivate)"""
    from sqlalchemy import select, func

    opt_out_uuid = _parse_opt_out_id(opt_out_id)
    result = await db.execute(
        select(Suppression).where(Suppression.id == opt_out_uuid)
    )
    opt_out = result.scalar_one_or_none()

    if not opt_out:
        raise HTTPException(status_code=404, detail="Opt-out not found")

    opt_out.is_active = False
    await db.commit()

    return None


@router.get("/dashboard")
async def get_compliance_dashboard(db: AsyncSession = Depends(get_db)):
    """Get compliance dashboard metrics"""
    from sqlalchemy import select, func

    # Get counts for various compliance metrics
    opt_outs_query = select(func.count(Suppression.id)).where(
        Suppression.reason == "opt_out",
        Suppression.is_active == True
    )
    total_suppressions_query = select(func.count(Suppression.id)).where(
        Suppression.is_active == True
    )
    audit_events_query = select(func.count(AuditEvent.id))

    opt_outs_result = await db.execute(opt_outs_query)
    total_suppressions_result = await db.execute(total_suppressions_query)
    audit_events_result = await db.execute(audit_events_query)

    opt_out_count = opt_outs_result.scalar() or 0
    total_suppressions = total_suppressions_result.scalar() or 0
    audit_event_count = audit_events_result.scalar() or 0

    return {
        "total_opt_outs": opt_out_count,
        "total_suppressions": total_suppressions,
        "audit_events_count": audit_event_count,
        "compliance_rate": 98.5,  # Placeholder calculation
        "pending_actions": 0,  # Placeholder
        "last_audit": None  # Would query for actual last audit date
    }


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
    from sqlalchemy import select, func

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
    count_query = select(func.count(AuditEvent.id))
    if event_type:
        count_query = count_query.where(AuditEvent.event_type == event_type)
    if phone_number:
        count_query = count_query.where(AuditEvent.phone_number == phone_number)
    if start_date:
        count_query = count_query.where(AuditEvent.created_at >= start_date)
    if end_date:
        count_query = count_query.where(AuditEvent.created_at <= end_date)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(query)
    events = result.scalars().all()

    data = [
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


@router.get("/reports")
async def list_compliance_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List compliance reports"""
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    reports = list(store.get("reports", []))
    total = len(reports)
    paginated = reports[skip:skip + limit]
    return {
        "success": True,
        "data": paginated,
        "pagination": {
            "page": (skip // limit) + 1,
            "pageSize": limit,
            "total": total,
            "totalPages": (total + limit - 1) // limit if limit else 1
        }
    }


@router.post("/reports/generate")
async def generate_compliance_report(
    report_type: str,
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db)
):
    """Generate a compliance report"""
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    reports = list(store.get("reports", []))
    report_id = str(uuid.uuid4())
    report = {
        "id": report_id,
        "type": report_type,
        "start_date": str(start_date),
        "end_date": str(end_date),
        "status": "generated",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    reports.append(report)
    store["reports"] = reports
    organization.compliance_settings = store
    await db.commit()

    return {
        "report_type": report_type,
        "start_date": start_date,
        "end_date": end_date,
        "status": "generated",
        "download_url": f"/api/v1/compliance/reports/{report_id}/download",
        "generated_at": datetime.now(timezone.utc)
    }


@router.post("/reports")
async def generate_compliance_report_alias(payload: dict, db: AsyncSession = Depends(get_db)):
    """Generate a compliance report (alias)."""
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    reports = list(store.get("reports", []))
    report_id = str(uuid.uuid4())
    report = {
        "id": report_id,
        "type": payload.get("type"),
        "start_date": payload.get("startDate"),
        "end_date": payload.get("endDate"),
        "format": payload.get("format", "csv"),
        "status": "generated",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    reports.append(report)
    store["reports"] = reports
    organization.compliance_settings = store
    await db.commit()

    return {
        "success": True,
        "data": {
            "id": report_id,
            "type": report.get("type"),
            "startDate": report.get("start_date"),
            "endDate": report.get("end_date"),
            "format": report.get("format"),
            "status": report.get("status")
        }
    }


@router.get("/reports/{report_id}/download")
async def download_report(report_id: str, db: AsyncSession = Depends(get_db)):
    """Download a compliance report."""
    organization = await _get_or_create_default_org(db)
    store = _get_store(organization)
    reports = store.get("reports", [])
    report = next((item for item in reports if item.get("id") == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    content = "report_id,type,start_date,end_date,status,created_at\n"
    content += f"{report_id},{report.get('type')},{report.get('start_date')},{report.get('end_date')},{report.get('status')},{report.get('created_at')}\n"

    return {"id": report_id, "content": content}


@router.get("/consent-records")
async def list_consent_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List consent records (placeholder)."""
    from sqlalchemy import select, func

    query = select(Lead).where(Lead.consent_status.is_not(None))
    count_result = await db.execute(select(func.count(Lead.id)).where(Lead.consent_status.is_not(None)))
    total = count_result.scalar() or 0

    result = await db.execute(query.offset(skip).limit(limit))
    leads = result.scalars().all()

    data = [
        {
            "id": str(lead.id),
            "phone_number": lead.phone1,
            "status": lead.consent_status,
            "consent_date": lead.consent_date,
            "lead_name": lead.full_name
        }
        for lead in leads
    ]

    return {
        "success": True,
        "data": data,
        "pagination": {
            "page": (skip // limit) + 1,
            "pageSize": limit,
            "total": total,
            "totalPages": (total + limit - 1) // limit if limit else 1
        }
    }
