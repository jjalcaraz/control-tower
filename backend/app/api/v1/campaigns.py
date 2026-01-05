# Campaigns API Routes
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.core.database import get_db
from app.models import Campaign

router = APIRouter()


class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    campaign_type: str = "blast"


class CampaignResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    campaign_type: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime]


@router.get("/", response_model=List[CampaignResponse])
async def list_campaigns(
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List all campaigns"""
    from sqlalchemy import select

    query = select(Campaign)

    if status:
        query = query.where(Campaign.status == status)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    campaigns = result.scalars().all()

    return [
        CampaignResponse(
            id=str(campaign.id),
            name=campaign.name,
            description=campaign.description,
            campaign_type=campaign.campaign_type,
            status=campaign.status,
            created_at=campaign.created_at,
            updated_at=campaign.updated_at
        )
        for campaign in campaigns
    ]


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific campaign"""
    from sqlalchemy import select

    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return CampaignResponse(
        id=str(campaign.id),
        name=campaign.name,
        description=campaign.description,
        campaign_type=campaign.campaign_type,
        status=campaign.status,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at
    )


@router.post("/", response_model=CampaignResponse, status_code=201)
async def create_campaign(campaign_data: CampaignCreate, db: AsyncSession = Depends(get_db)):
    """Create a new campaign"""
    # Use default organization and user from seed data (TODO: get from auth context)
    default_org_id = uuid.UUID("12345678-1234-5678-9abc-123456789012")
    default_user_id = uuid.UUID("12345678-1234-5678-9abc-123456789013")

    new_campaign = Campaign(
        id=uuid.uuid4(),
        organization_id=default_org_id,
        created_by=default_user_id,
        name=campaign_data.name,
        description=campaign_data.description,
        campaign_type=campaign_data.campaign_type,
        status="draft"
    )

    db.add(new_campaign)
    await db.commit()
    await db.refresh(new_campaign)

    return CampaignResponse(
        id=str(new_campaign.id),
        name=new_campaign.name,
        description=new_campaign.description,
        campaign_type=new_campaign.campaign_type,
        status=new_campaign.status,
        created_at=new_campaign.created_at,
        updated_at=new_campaign.updated_at
    )


@router.patch("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: str,
    campaign_data: CampaignCreate,
    db: AsyncSession = Depends(get_db)
):
    """Update a campaign"""
    from sqlalchemy import select

    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.name = campaign_data.name
    campaign.description = campaign_data.description
    campaign.campaign_type = campaign_data.campaign_type

    await db.commit()
    await db.refresh(campaign)

    return CampaignResponse(
        id=str(campaign.id),
        name=campaign.name,
        description=campaign.description,
        campaign_type=campaign.campaign_type,
        status=campaign.status,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at
    )


@router.post("/{campaign_id}/start", response_model=CampaignResponse)
async def start_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Start a campaign"""
    from sqlalchemy import select

    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = "active"
    await db.commit()
    await db.refresh(campaign)

    return CampaignResponse(
        id=str(campaign.id),
        name=campaign.name,
        description=campaign.description,
        campaign_type=campaign.campaign_type,
        status=campaign.status,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at
    )


@router.post("/{campaign_id}/pause", response_model=CampaignResponse)
async def pause_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Pause a running campaign"""
    from sqlalchemy import select

    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = "paused"
    await db.commit()
    await db.refresh(campaign)

    return CampaignResponse(
        id=str(campaign.id),
        name=campaign.name,
        description=campaign.description,
        campaign_type=campaign.campaign_type,
        status=campaign.status,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at
    )


@router.post("/{campaign_id}/stop", response_model=CampaignResponse)
async def stop_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Stop a campaign"""
    from sqlalchemy import select

    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = "stopped"
    await db.commit()
    await db.refresh(campaign)

    return CampaignResponse(
        id=str(campaign.id),
        name=campaign.name,
        description=campaign.description,
        campaign_type=campaign.campaign_type,
        status=campaign.status,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at
    )


@router.get("/{campaign_id}/stats")
async def get_campaign_stats(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Get campaign statistics"""
    # Placeholder - would query message table for actual stats
    return {
        "campaign_id": campaign_id,
        "total_targets": 0,
        "sent": 0,
        "delivered": 0,
        "failed": 0,
        "pending": 0,
        "delivery_rate": 0
    }


@router.delete("/{campaign_id}", status_code=204)
async def delete_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a campaign"""
    from sqlalchemy import select

    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    await db.delete(campaign)
    await db.commit()

    return None
