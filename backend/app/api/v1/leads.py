# Leads API Routes
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Union
from pydantic import BaseModel
from datetime import datetime
import json
import uuid

from app.core.database import get_db
from app.models import Lead
from app.schemas.lead import LeadCreate, LeadCreateFrontend, LeadUpdate, LeadResponse, LeadImportPreview, LeadImportResult
from app.services.lead_import import LeadImportService

router = APIRouter()


def _parse_uuid(value: str, label: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail=f"Invalid {label}")


def _normalize_import_mappings(column_mappings: dict) -> dict:
    field_aliases = {
        "firstName": "first_name",
        "lastName": "last_name",
        "primaryPhone": "phone1",
        "secondaryPhone": "phone2",
        "alternatePhone": "phone3",
        "address.street": "address_line1",
        "address.city": "city",
        "address.state": "state",
        "address.zip": "zip_code",
        "address.county": "county",
        "property.propertyType": "property_type",
        "property.acreage": "acreage",
        "property.estimatedValue": "estimated_value",
        "property.parcelId": "parcel_id",
        "leadSource": "lead_source",
    }

    normalized = {}
    for csv_column, lead_field in column_mappings.items():
        normalized[csv_column] = field_aliases.get(lead_field, lead_field)
    return normalized


class BulkUpdateRequest(BaseModel):
    leadIds: List[str]
    updates: dict


@router.get("/")
async def list_leads(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    page: Optional[int] = Query(None, ge=1, description="Page number (alternative to skip)"),
    limit: int = Query(50, ge=1, le=1000, description="Number of records per page"),
    search: Optional[str] = None,
    county: Optional[str] = None,
    tags: Optional[List[str]] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all leads with filtering and pagination"""
    from sqlalchemy import select, func

    # Convert page to skip if page is provided
    if page is not None:
        skip = (page - 1) * limit

    query = select(Lead)

    # Apply filters based on actual model structure
    if search:
        query = query.where(
            (Lead.first_name.ilike(f"%{search}%")) |
            (Lead.last_name.ilike(f"%{search}%")) |
            (Lead.email.ilike(f"%{search}%")) |
            (Lead.phone1.ilike(f"%{search}%")) |
            (Lead.phone2.ilike(f"%{search}%")) |
            (Lead.phone3.ilike(f"%{search}%"))
        )

    if county:
        query = query.where(Lead.county == county)

    if status:
        query = query.where(Lead.status == status)

    # Total count (for pagination)
    count_query = select(func.count(Lead.id))
    if search:
        count_query = count_query.where(
            (Lead.first_name.ilike(f"%{search}%")) |
            (Lead.last_name.ilike(f"%{search}%")) |
            (Lead.email.ilike(f"%{search}%")) |
            (Lead.phone1.ilike(f"%{search}%")) |
            (Lead.phone2.ilike(f"%{search}%")) |
            (Lead.phone3.ilike(f"%{search}%"))
        )
    if county:
        count_query = count_query.where(Lead.county == county)
    if status:
        count_query = count_query.where(Lead.status == status)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    query = query.offset(skip).limit(limit).order_by(Lead.created_at.desc())
    result = await db.execute(query)
    leads = result.scalars().all()

    data = [
        LeadResponse(
            id=str(lead.id),
            first_name=lead.first_name,
            last_name=lead.last_name,
            full_name=lead.full_name,
            phone1=lead.phone1,
            phone2=lead.phone2,
            phone3=lead.phone3,
            email=lead.email,
            address_line1=lead.address_line1,
            address_line2=lead.address_line2,
            city=lead.city,
            state=lead.state,
            zip_code=lead.zip_code,
            county=lead.county,
            country=lead.country or "US",
            parcel_id=lead.parcel_id,
            property_type=lead.property_type,
            acreage=lead.acreage,
            estimated_value=lead.estimated_value,
            property_address=lead.property_address,
            lead_score=lead.lead_score,
            lead_source=lead.lead_source,
            status=lead.status,
            consent_status=lead.consent_status,
            notes=lead.notes,
            tags=lead.tags or [],
            created_at=lead.created_at,
            updated_at=lead.updated_at
        )
        for lead in leads
    ]

    page_size = limit
    current_page = page if page is not None else (skip // limit) + 1
    total_pages = (total + page_size - 1) // page_size if page_size else 1

    return {
        "success": True,
        "data": data,
        "pagination": {
            "page": current_page,
            "pageSize": page_size,
            "total": total,
            "totalPages": total_pages
        }
    }


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific lead by ID"""
    from sqlalchemy import select

    lead_uuid = _parse_uuid(lead_id, "lead_id")
    result = await db.execute(
        select(Lead).where(Lead.id == lead_uuid)
    )
    lead = result.scalar_one_or_none()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return LeadResponse(
        id=str(lead.id),
        first_name=lead.first_name,
        last_name=lead.last_name,
        full_name=lead.full_name,
        phone1=lead.phone1,
        phone2=lead.phone2,
        phone3=lead.phone3,
        email=lead.email,
        address_line1=lead.address_line1,
        address_line2=lead.address_line2,
        city=lead.city,
        state=lead.state,
        zip_code=lead.zip_code,
        county=lead.county,
        country=lead.country or "US",
        parcel_id=lead.parcel_id,
        property_type=lead.property_type,
        acreage=lead.acreage,
        estimated_value=lead.estimated_value,
        property_address=lead.property_address,
        lead_score=lead.lead_score,
        lead_source=lead.lead_source,
        status=lead.status,
        consent_status=lead.consent_status,
        notes=lead.notes,
        tags=lead.tags or [],
        created_at=lead.created_at,
        updated_at=lead.updated_at
    )


@router.post("/", response_model=LeadResponse, status_code=201)
async def create_lead(
    lead_data: Union[LeadCreate, LeadCreateFrontend],
    db: AsyncSession = Depends(get_db)
):
    """Create a new lead"""

    if isinstance(lead_data, LeadCreateFrontend):
        lead_data = lead_data.to_lead_create()

    new_lead = Lead(
        id=uuid.uuid4(),
        # Use default organization from seed data (TODO: get from auth context)
        organization_id=uuid.UUID("12345678-1234-5678-9abc-123456789012"),
        first_name=lead_data.first_name,
        last_name=lead_data.last_name,
        full_name=lead_data.full_name or f"{lead_data.first_name} {lead_data.last_name}",
        phone1=lead_data.phone1,
        phone2=lead_data.phone2,
        phone3=lead_data.phone3,
        email=lead_data.email,
        address_line1=lead_data.address_line1,
        address_line2=lead_data.address_line2,
        city=lead_data.city,
        state=lead_data.state,
        zip_code=lead_data.zip_code,
        county=lead_data.county,
        country=lead_data.country,
        parcel_id=lead_data.parcel_id,
        property_type=lead_data.property_type,
        acreage=lead_data.acreage,
        estimated_value=lead_data.estimated_value,
        property_address=lead_data.property_address,
        lead_score=lead_data.lead_score,
        lead_source=lead_data.lead_source,
        status=lead_data.status or "new",
        consent_status=lead_data.consent_status,
        notes=lead_data.notes,
        tags=lead_data.tags or []
    )

    db.add(new_lead)
    await db.commit()
    await db.refresh(new_lead)

    return LeadResponse(
        id=str(new_lead.id),
        first_name=new_lead.first_name,
        last_name=new_lead.last_name,
        full_name=new_lead.full_name,
        phone1=new_lead.phone1,
        phone2=new_lead.phone2,
        phone3=new_lead.phone3,
        email=new_lead.email,
        address_line1=new_lead.address_line1,
        address_line2=new_lead.address_line2,
        city=new_lead.city,
        state=new_lead.state,
        zip_code=new_lead.zip_code,
        county=new_lead.county,
        country=new_lead.country or "US",
        parcel_id=new_lead.parcel_id,
        property_type=new_lead.property_type,
        acreage=new_lead.acreage,
        estimated_value=new_lead.estimated_value,
        property_address=new_lead.property_address,
        lead_score=new_lead.lead_score,
        lead_source=new_lead.lead_source,
        status=new_lead.status,
        consent_status=new_lead.consent_status,
        notes=new_lead.notes,
        tags=new_lead.tags or [],
        created_at=new_lead.created_at,
        updated_at=new_lead.updated_at
    )


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, lead_data: LeadUpdate, db: AsyncSession = Depends(get_db)):
    """Update an existing lead"""
    from sqlalchemy import select

    lead_uuid = _parse_uuid(lead_id, "lead_id")
    result = await db.execute(
        select(Lead).where(Lead.id == lead_uuid)
    )
    lead = result.scalar_one_or_none()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Update fields that are provided
    update_data = lead_data.model_dump(exclude_unset=True)
    if "first_name" in update_data or "last_name" in update_data:
        first_name = update_data.get("first_name", lead.first_name)
        last_name = update_data.get("last_name", lead.last_name)
        update_data.setdefault("full_name", f"{first_name} {last_name}".strip())

    for field, value in update_data.items():
        if hasattr(lead, field):
            setattr(lead, field, value)

    await db.commit()
    await db.refresh(lead)

    return LeadResponse(
        id=str(lead.id),
        first_name=lead.first_name,
        last_name=lead.last_name,
        full_name=lead.full_name,
        phone1=lead.phone1,
        phone2=lead.phone2,
        phone3=lead.phone3,
        email=lead.email,
        address_line1=lead.address_line1,
        address_line2=lead.address_line2,
        city=lead.city,
        state=lead.state,
        zip_code=lead.zip_code,
        county=lead.county,
        country=lead.country or "US",
        parcel_id=lead.parcel_id,
        property_type=lead.property_type,
        acreage=lead.acreage,
        estimated_value=lead.estimated_value,
        property_address=lead.property_address,
        lead_score=lead.lead_score,
        lead_source=lead.lead_source,
        status=lead.status,
        consent_status=lead.consent_status,
        notes=lead.notes,
        tags=lead.tags or [],
        created_at=lead.created_at,
        updated_at=lead.updated_at
    )


@router.delete("/{lead_id}", status_code=204)
async def delete_lead(lead_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a lead"""
    from sqlalchemy import select

    lead_uuid = _parse_uuid(lead_id, "lead_id")
    result = await db.execute(
        select(Lead).where(Lead.id == lead_uuid)
    )
    lead = result.scalar_one_or_none()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    await db.delete(lead)
    await db.commit()

    return None


@router.post("/import/preview", response_model=LeadImportPreview)
async def preview_lead_import(
    file: UploadFile,
    db: AsyncSession = Depends(get_db)
):
    """Preview CSV import with column mapping"""
    import pandas as pd
    import io

    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))

    return LeadImportPreview(
        total_rows=len(df),
        columns=list(df.columns),
        preview_data=df.head(5).to_dict(orient="records"),
        suggested_mapping={
            col: "first_name" if "first" in col.lower() else
                "last_name" if "last" in col.lower() else
                "email" if "email" in col.lower() else
                "phone1" if "phone" in col.lower() and "1" in col else
                "phone2" if "phone" in col.lower() and "2" in col else
                "phone3" if "phone" in col.lower() and "3" in col else
                "address_line1" if "address" in col.lower() and "1" in col else
                "city" if "city" in col.lower() else
                "state" if "state" in col.lower() else
                "zip_code" if "zip" in col.lower() else
                "county" if "county" in col.lower() else
                "unknown"
            for col in df.columns
        },
        validation_warnings=[],
        phone_validation_summary={},
        email_validation_summary={}
    )


@router.post("/import/execute")
async def execute_lead_import(
    file: UploadFile,
    db: AsyncSession = Depends(get_db)
):
    """Execute CSV import"""
    import pandas as pd
    import io
    import uuid

    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))

    imported = 0
    errors = []

    for _, row in df.iterrows():
        try:
            lead = Lead(
                id=uuid.uuid4(),
                organization_id=uuid.uuid4(),  # Would get from auth context
                first_name=row.get("first_name", ""),
                last_name=row.get("last_name", ""),
                full_name=f"{row.get('first_name', '')} {row.get('last_name', '')}".strip(),
                phone1=row.get("phone1", row.get("primary_phone", "")),
                phone2=row.get("phone2", row.get("secondary_phone", "")),
                phone3=row.get("phone3", row.get("alternate_phone", "")),
                email=row.get("email"),
                address_line1=row.get("address_line1", row.get("street", "")),
                city=row.get("city"),
                state=row.get("state"),
                zip_code=row.get("zip_code", row.get("zip", "")),
                county=row.get("county"),
                country=row.get("country", "US"),
                status="new",
                lead_score="cold"
            )
            db.add(lead)
            imported += 1
        except Exception as e:
            errors.append({"row": _, "error": str(e)})

    await db.commit()

    return {
        "total_rows": len(df),
        "imported": imported,
        "errors": errors
    }


@router.post("/import", response_model=LeadImportResult)
async def import_leads(
    file: UploadFile,
    mappings: str = Form(...),
    bulkTags: Optional[str] = Form(None),
    autoTaggingEnabled: Optional[bool] = Form(False),
    taggingOptions: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """Execute CSV import using enhanced service (frontend-compatible)."""
    try:
        column_mappings = json.loads(mappings) if mappings else {}
        column_mappings = _normalize_import_mappings(column_mappings)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid mappings payload")

    try:
        bulk_tags = json.loads(bulkTags) if bulkTags else []
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid bulkTags payload")

    try:
        tagging_options = json.loads(taggingOptions) if taggingOptions else {}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid taggingOptions payload")

    import_service = LeadImportService(db)
    default_org_id = "12345678-1234-5678-9abc-123456789012"
    default_user_id = "12345678-1234-5678-9abc-123456789013"

    result = await import_service.execute_import(
        file=file,
        column_mappings=column_mappings,
        skip_duplicates=True,
        update_existing=False,
        organization_id=default_org_id,
        user_id=default_user_id,
        bulk_tags=bulk_tags,
        auto_tagging_enabled=autoTaggingEnabled,
        tagging_options=tagging_options
    )

    return result


@router.get("/import/{import_id}", response_model=LeadImportResult)
async def get_import_status(
    import_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get import status for progress tracking."""
    import_service = LeadImportService(db)
    default_org_id = "12345678-1234-5678-9abc-123456789012"
    result = await import_service.get_import_status(import_id, default_org_id)
    if not result:
        raise HTTPException(status_code=404, detail="Import not found")
    return result


@router.put("/bulk")
async def bulk_update_leads(
    payload: BulkUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Bulk update leads."""
    from sqlalchemy import select

    lead_ids = []
    for lead_id in payload.leadIds:
        try:
            lead_ids.append(uuid.UUID(str(lead_id)))
        except ValueError:
            continue

    if not lead_ids:
        return {"success": True, "updated": 0}

    result = await db.execute(select(Lead).where(Lead.id.in_(lead_ids)))
    leads = result.scalars().all()

    for lead in leads:
        for field, value in payload.updates.items():
            if hasattr(lead, field):
                setattr(lead, field, value)

    await db.commit()

    return {"success": True, "updated": len(leads)}
