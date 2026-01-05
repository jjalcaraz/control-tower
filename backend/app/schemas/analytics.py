from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime


class DashboardMetricsResponse(BaseModel):
    """Response schema for dashboard metrics"""
    total_leads: int
    active_campaigns: int
    messages_today: int
    delivery_rate: float
    reply_rate: float
    opt_out_rate: float
    recent_activity: List[Dict[str, Any]]
    campaign_performance: List[Dict[str, Any]]
    system_health: Dict[str, Any]
    revenue_metrics: Optional[Dict[str, Any]] = None
    growth_metrics: Optional[Dict[str, Any]] = None
    top_performing_templates: Optional[List[Dict[str, Any]]] = None
    phone_number_health: Optional[List[Dict[str, Any]]] = None


class CampaignAnalyticsResponse(BaseModel):
    """Response schema for campaign analytics"""
    campaign_id: str
    total_targets: int
    messages_sent: int
    delivered: int
    delivery_rate: float
    replies: int
    reply_rate: float
    opt_outs: int
    opt_out_rate: float


class ROIAnalyticsResponse(BaseModel):
    """Response schema for ROI analytics"""
    total_cost: float
    total_revenue: float
    roi: float
    cost_per_lead: float
    revenue_per_lead: float


class TrendAnalyticsResponse(BaseModel):
    """Response schema for trend analytics"""
    metric: str
    period: str
    data_points: List[Dict[str, Any]]
    trend: str


class ConversionFunnelResponse(BaseModel):
    """Response schema for conversion funnel"""
    stages: List[Dict[str, Any]]


class CustomReportResponse(BaseModel):
    """Response schema for custom reports"""
    report_id: str
    config: Dict[str, Any]
    generated_at: str
    data: Dict[str, Any]