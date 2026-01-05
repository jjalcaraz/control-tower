# Analytics API Routes
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from datetime import date, timedelta

from app.core.database import get_db
from app.models import Lead, Campaign, Message

router = APIRouter()


class DashboardMetrics(BaseModel):
    total_leads: int
    active_campaigns: int
    messages_today: int
    delivery_rate: float
    reply_rate: float
    opt_out_rate: float


@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard_metrics(db: AsyncSession = Depends(get_db)):
    """Get dashboard metrics for frontend"""
    from sqlalchemy import select, func

    # Total leads
    leads_result = await db.execute(select(func.count(Lead.id)))
    total_leads = leads_result.scalar()

    # Active campaigns
    campaigns_result = await db.execute(
        select(func.count(Campaign.id)).where(Campaign.status == "active")
    )
    active_campaigns = campaigns_result.scalar()

    # Messages today
    today = date.today()
    messages_result = await db.execute(
        select(func.count(Message.id)).where(
            func.date(Message.created_at) == today
        )
    )
    messages_today = messages_result.scalar()

    # Calculate rates (placeholders - would calculate from actual data)
    return DashboardMetrics(
        total_leads=total_leads or 0,
        active_campaigns=active_campaigns or 0,
        messages_today=messages_today or 0,
        delivery_rate=95.0,
        reply_rate=15.0,
        opt_out_rate=2.0
    )


@router.get("/campaigns/comparison")
async def compare_campaigns(
    campaign_ids: list[str] = Query(...),
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Compare multiple campaigns"""
    from sqlalchemy import select

    campaigns_data = []
    for campaign_id in campaign_ids:
        result = await db.execute(
            select(Campaign).where(Campaign.id == campaign_id)
        )
        campaign = result.scalar_one_or_none()

        if campaign:
            campaigns_data.append({
                "id": str(campaign.id),
                "name": campaign.name,
                "status": campaign.status,
                "created_at": campaign.created_at
            })

    return {
        "campaigns": campaigns_data,
        "start_date": start_date,
        "end_date": end_date
    }


@router.get("/trends")
async def get_trends(
    date_range: str = Query("7d"),
    db: AsyncSession = Depends(get_db)
):
    """Get trend analysis data"""
    # Parse date range
    if date_range == "7d":
        days = 7
    elif date_range == "30d":
        days = 30
    else:
        days = 90

    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    # Placeholder trend data
    return {
        "start_date": start_date,
        "end_date": end_date,
        "trends": {
            "messages_sent": [10, 15, 20, 25, 30, 35, 40],
            "delivery_rate": [94.0, 95.0, 96.0, 95.5, 97.0, 96.5, 98.0],
            "reply_rate": [12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0]
        }
    }


@router.get("/roi")
async def get_roi(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Get ROI calculations"""
    # Placeholder ROI data
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_cost": 150.00,
        "total_revenue": 4500.00,
        "roi_percentage": 2900.0,
        "cost_per_lead": 0.50,
        "revenue_per_lead": 15.00
    }


@router.get("/conversion-funnel")
async def get_conversion_funnel(
    date_range: str = Query("30d"),
    db: AsyncSession = Depends(get_db)
):
    """Get lead conversion funnel data"""
    # Placeholder funnel data
    return {
        "stages": {
            "total_leads": 1000,
            "contacted": 800,
            "interested": 300,
            "negotiating": 100,
            "closed": 50
        },
        "conversion_rates": {
            "contacted_rate": 80.0,
            "interested_rate": 37.5,
            "negotiating_rate": 33.3,
            "closed_rate": 50.0
        }
    }


@router.get("/phone-health")
async def get_phone_health(db: AsyncSession = Depends(get_db)):
    """Get phone number health metrics"""
    from sqlalchemy import select
    from app.models import PhoneNumber

    # Get all phone numbers
    result = await db.execute(select(PhoneNumber))
    phone_numbers = result.scalars().all()

    # Calculate health metrics
    total_numbers = len(phone_numbers)
    active_numbers = sum(1 for pn in phone_numbers if pn.is_active)
    healthy_numbers = sum(1 for pn in phone_numbers if pn.status == "healthy")

    return {
        "total_numbers": total_numbers,
        "active_numbers": active_numbers,
        "healthy_numbers": healthy_numbers,
        "health_percentage": (healthy_numbers / total_numbers * 100) if total_numbers > 0 else 100.0,
        "phone_numbers": [
            {
                "id": str(pn.id),
                "phone_number": pn.phone_number,
                "status": pn.status,
                "is_active": pn.is_active,
                "carrier": pn.carrier,
                "quality_score": getattr(pn, 'quality_score', 95.0)
            }
            for pn in phone_numbers
        ]
    }
