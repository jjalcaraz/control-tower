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
    start_date: date = Query(None),
    end_date: date = Query(None),
    timeRange: str = Query("30d"),
    db: AsyncSession = Depends(get_db)
):
    """Get ROI calculations"""
    # If timeRange is provided, calculate dates
    if timeRange and not (start_date and end_date):
        if timeRange == "7d":
            days = 7
        elif timeRange == "30d":
            days = 30
        else:
            days = 90

        end_date = date.today()
        start_date = end_date - timedelta(days=days)
    elif not start_date:
        start_date = date.today() - timedelta(days=30)
    elif not end_date:
        end_date = date.today()

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


@router.get("/campaigns/{campaign_id}")
async def get_campaign_analytics(
    campaign_id: str,
    timeRange: str = Query("30d"),
    db: AsyncSession = Depends(get_db)
):
    """Get analytics for a specific campaign"""
    from sqlalchemy import select
    from app.models import Campaign

    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Placeholder campaign analytics
    return {
        "campaign_id": str(campaign.id),
        "campaign_name": campaign.name,
        "status": campaign.status,
        "time_range": timeRange,
        "metrics": {
            "messages_sent": 150,
            "delivery_rate": 95.0,
            "reply_rate": 12.0,
            "conversion_rate": 5.0,
            "total_cost": 75.00,
            "revenue": 1125.00
        },
        "daily_stats": [
            {"date": "2026-01-01", "sent": 20, "delivered": 19, "replies": 3},
            {"date": "2026-01-02", "sent": 25, "delivered": 24, "replies": 4},
            {"date": "2026-01-03", "sent": 30, "delivered": 29, "replies": 5}
        ]
    }


@router.get("/leads")
async def get_lead_analytics(
    timeRange: str = Query("30d"),
    db: AsyncSession = Depends(get_db)
):
    """Get lead analytics"""
    from sqlalchemy import select, func

    # Calculate date range
    if timeRange == "7d":
        days = 7
    elif timeRange == "30d":
        days = 30
    else:
        days = 90

    from datetime import timedelta
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    # Get lead stats
    result = await db.execute(
        select(func.count(Lead.id)).where(Lead.created_at >= start_date)
    )
    new_leads = result.scalar()

    return {
        "time_range": timeRange,
        "start_date": start_date,
        "end_date": end_date,
        "total_leads": new_leads or 0,
        "leads_by_source": [
            {"source": "Website", "count": 45},
            {"source": "Referral", "count": 30},
            {"source": "Social Media", "count": 25}
        ],
        "leads_by_status": [
            {"status": "new", "count": 50},
            {"status": "contacted", "count": 30},
            {"status": "qualified", "count": 15},
            {"status": "converted", "count": 5}
        ],
        "conversion_rate": 11.1
    }


@router.get("/messages")
async def get_message_analytics(
    timeRange: str = Query("30d"),
    db: AsyncSession = Depends(get_db)
):
    """Get message analytics"""
    from sqlalchemy import select, func
    from datetime import timedelta

    # Calculate date range
    if timeRange == "7d":
        days = 7
    elif timeRange == "30d":
        days = 30
    else:
        days = 90

    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    # Get message stats
    result = await db.execute(
        select(func.count(Message.id)).where(Message.created_at >= start_date)
    )
    total_messages = result.scalar()

    return {
        "time_range": timeRange,
        "start_date": start_date,
        "end_date": end_date,
        "total_messages": total_messages or 0,
        "messages_by_direction": [
            {"direction": "inbound", "count": 80},
            {"direction": "outbound", "count": 120}
        ],
        "messages_by_status": [
            {"status": "sent", "count": 180},
            {"status": "delivered", "count": 170},
            {"status": "failed", "count": 10},
            {"status": "pending", "count": 10}
        ],
        "delivery_rate": 94.4,
        "average_response_time": 2.5  # hours
    }


@router.post("/campaigns-comparison")
async def compare_campaigns(
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Compare multiple campaigns"""
    from sqlalchemy import select
    from app.models import Campaign

    campaign_ids = data.get("campaignIds", [])
    metrics = data.get("metrics", ["messages_sent", "delivery_rate"])

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
                "metrics": {
                    "messages_sent": 150,
                    "delivery_rate": 95.0,
                    "reply_rate": 12.0
                }
            })

    return {
        "campaigns": campaigns_data,
        "comparison_metrics": metrics
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
