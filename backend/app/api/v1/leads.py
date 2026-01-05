# Leads API Routes
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models import Lead
from app.schemas.lead import LeadCreate, LeadUpdate, LeadResponse, LeadImportPreview

router = APIRouter()


@router.get("/", response_model=List[LeadResponse])
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
            (Lead.email.ilike(f"%{search}%"))
        )

    if county:
        query = query.where(Lead.county == county)

    if status:
        query = query.where(Lead.status == status)

    # Apply pagination
    query = query.offset(skip).limit(limit).order_by(Lead.created_at.desc())
    result = await db.execute(query)
    leads = result.scalars().all()

    return [
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
            country=lead.country,
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


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific lead by ID"""
    from sqlalchemy import select

    result = await db.execute(
        select(Lead).where(Lead.id == lead_id)
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
        country=lead.country,
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
async def create_lead(lead_data: LeadCreate, db: AsyncSession = Depends(get_db)):
    """Create a new lead"""
    import uuid

    new_lead = Lead(
        id=uuid.uuid4(),
        # Use default organization from seed data (TODO: get from auth context)
        organization_id=uuid.UUID("12345678-1234-5678-9abc-123456789012"),
        first_name=lead_data.first_name,
        last_name=lead_data.last_name,
        full_name=f"{lead_data.first_name} {lead_data.last_name}",
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
        country=new_lead.country,
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

    result = await db.execute(
        select(Lead).where(Lead.id == lead_id)
    )
    lead = result.scalar_one_or_none()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Update fields that are provided
    update_data = lead_data.dict(exclude_unset=True)
    field_mapping = {
        "owner_name": "full_name",
        "phone_number_1": "phone1",
        "phone_number_2": "phone2",
        "phone_number_3": "phone3",
        "street_address": "address_line1",
        "zip": "zip_code",
        "property_value": "estimated_value",
        "square_feet": None,  # Not in model
        "lead_source": "lead_source",
        "source_of_lead": "lead_source"
    }

    for field, value in update_data.items():
        model_field = field_mapping.get(field, field)
        if hasattr(lead, model_field):
            setattr(lead, model_field, value)

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
        country=lead.country,
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

    result = await db.execute(
        select(Lead).where(Lead.id == lead_id)
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
