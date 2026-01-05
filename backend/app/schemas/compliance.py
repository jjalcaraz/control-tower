from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class OptOutCreate(BaseModel):
    """Schema for creating opt-out"""
    phone_number: str = Field(..., alias="phoneNumber")
    source: Optional[str] = "manual"
    reason: Optional[str] = None
    campaign_id: Optional[str] = Field(None, alias="campaignId")

    class Config:
        allow_population_by_field_name = True


class OptOutUpdate(BaseModel):
    """Schema for updating opt-out"""
    is_active: Optional[bool] = None
    reason: Optional[str] = None


class OptOutResponse(BaseModel):
    """Response schema for opt-out"""
    id: str
    phone_number: str
    source: str
    reason: Optional[str] = None
    campaign_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    opt_out_date: Optional[datetime] = None
    campaign_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class AuditEventResponse(BaseModel):
    """Response schema for audit event"""
    id: str
    event_type: str
    phone_number: Optional[str] = None
    campaign_id: Optional[str] = None
    lead_id: Optional[str] = None
    user_id: Optional[str] = None
    details: Dict[str, Any]
    compliance_status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class ComplianceReportResponse(BaseModel):
    """Response schema for compliance report"""
    report_type: str
    period: Dict[str, str]
    format: str
    data: Dict[str, Any]
    generated_at: str


class ComplianceDashboardResponse(BaseModel):
    """Response schema for compliance dashboard"""
    total_opt_outs: int
    opt_out_rate: float
    compliance_score: float
    violations: List[Dict[str, Any]]
    recent_opt_outs: List[Dict[str, Any]]
    help_requests: int


class OptOutBulkActionRequest(BaseModel):
    """Schema for bulk opt-out actions"""
    opt_out_ids: List[str]
    action: str  # reactivate, deactivate
    reason: Optional[str] = None
