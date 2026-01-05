from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime


class PhoneNumberCreate(BaseModel):
    """Schema for creating phone number"""
    e164: str
    mps: int = 1
    daily_cap: Optional[int] = None
    status: str = "active"


class PhoneNumberUpdate(BaseModel):
    """Schema for updating phone number"""
    mps: Optional[int] = None
    daily_cap: Optional[int] = None
    status: Optional[str] = None
    health_score: Optional[int] = None
    reputation_status: Optional[str] = None


class PhoneNumberResponse(BaseModel):
    """Response schema for phone number"""
    id: str
    e164: Optional[str] = None
    phone_number: Optional[str] = None
    formatted_number: Optional[str] = None
    display_number: Optional[str] = None
    mps: Optional[int] = None
    daily_cap: Optional[int] = None
    status: str
    health_score: Optional[int] = None
    reputation_status: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PhoneNumberHealthResponse(BaseModel):
    """Response schema for phone number health metrics"""
    health_score: int
    reputation_status: str
    delivery_rate: float
    blocked_carriers: List[str]
    daily_volume: int
    daily_cap: int
    mps_current: int
    mps_limit: int
    last_activity: Optional[str] = None
    performance_trend: str
    recommendations: List[str]


class PhoneNumberAcquireRequest(BaseModel):
    """Schema for acquiring new phone number"""
    area_code: Optional[str] = None
    country: str = "US"
    messaging_service_sid: Optional[str] = None
    mps: Optional[int] = 1
    daily_cap: Optional[int] = None


class PhoneNumberBulkActionRequest(BaseModel):
    """Schema for bulk phone number actions"""
    number_ids: List[str]
    action: str  # activate, deactivate, quarantine, delete, update_mps, update_daily_cap
    mps: Optional[int] = None
    daily_cap: Optional[int] = None
