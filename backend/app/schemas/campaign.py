from pydantic import BaseModel, field_validator, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

from app.schemas.common import BaseTimestamps


class CampaignType(str, Enum):
    """Campaign types"""
    manual = "manual"
    drip = "drip"
    blast = "blast"
    followup = "followup"


class CampaignStatus(str, Enum):
    """Campaign status"""
    draft = "draft"
    scheduled = "scheduled"
    running = "running"
    paused = "paused"
    completed = "completed"
    cancelled = "cancelled"


class CampaignSchedule(BaseModel):
    """Campaign scheduling configuration"""
    start_at: datetime
    end_at: Optional[datetime] = None
    timezone: str = "America/Chicago"

    # Quiet hours
    quiet_hours_start: str = "20:00"
    quiet_hours_end: str = "08:00"

    # Sending days (0=Sunday, 6=Saturday)
    allowed_days: List[int] = Field(default=[1, 2, 3, 4, 5])  # Mon-Fri default

    # Rate limiting
    messages_per_minute: int = Field(default=10, ge=1, le=100)
    daily_limit: Optional[int] = Field(default=None, ge=1)


class CampaignTargeting(BaseModel):
    """Campaign targeting criteria"""
    # Lead filtering
    lead_sources: Optional[List[str]] = None
    lead_scores: Optional[List[str]] = None
    lead_statuses: Optional[List[str]] = None
    tags: Optional[List[str]] = None

    # Geographic targeting
    states: Optional[List[str]] = None
    counties: Optional[List[str]] = None
    cities: Optional[List[str]] = None

    # Property targeting
    property_types: Optional[List[str]] = None
    min_acreage: Optional[float] = None
    max_acreage: Optional[float] = None

    # Engagement filtering
    exclude_opted_out: bool = True
    exclude_recently_contacted: bool = True
    days_since_last_contact: int = Field(default=7, ge=0)

    # Custom filters
    custom_sql_filter: Optional[str] = None


class CampaignBase(BaseModel):
    """Base campaign fields"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)

    campaign_type: CampaignType
    status: CampaignStatus = CampaignStatus.draft

    # Template selection
    template_ids: List[str] = Field(..., min_length=1)
    template_rotation_method: str = Field(default="sequential", pattern="^(sequential|random|weighted|ab_test)$")

    # Targeting and scheduling
    targeting: CampaignTargeting
    schedule: CampaignSchedule

    # Configuration
    send_from_phone_pool: bool = True  # Use phone pool vs specific number
    from_phone_number: Optional[str] = None  # Specific phone if not using pool

    # A/B Testing
    ab_test_enabled: bool = False
    ab_test_split: float = Field(default=0.5, ge=0.1, le=0.9)

    # Auto-responses
    enable_auto_responses: bool = True
    enable_stop_processing: bool = True

    tags: Optional[List[str]] = []

    @field_validator('template_ids')
    @classmethod
    def validate_template_ids(cls, v):
        if not v:
            raise ValueError("At least one template ID is required")
        return v


class CampaignCreate(CampaignBase):
    """Schema for creating a new campaign"""
    pass


class CampaignUpdate(BaseModel):
    """Schema for updating an existing campaign - all fields optional"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)

    status: Optional[CampaignStatus] = None

    template_ids: Optional[List[str]] = None
    template_rotation_method: Optional[str] = Field(None, pattern="^(sequential|random|weighted|ab_test)$")

    targeting: Optional[CampaignTargeting] = None
    schedule: Optional[CampaignSchedule] = None

    send_from_phone_pool: Optional[bool] = None
    from_phone_number: Optional[str] = None

    ab_test_enabled: Optional[bool] = None
    ab_test_split: Optional[float] = Field(None, ge=0.1, le=0.9)

    enable_auto_responses: Optional[bool] = None
    enable_stop_processing: Optional[bool] = None

    tags: Optional[List[str]] = None


class CampaignStats(BaseModel):
    """Campaign performance statistics"""
    total_targets: int = 0
    messages_sent: int = 0
    messages_delivered: int = 0
    messages_failed: int = 0

    replies_received: int = 0
    opt_outs: int = 0

    # Calculated metrics
    delivery_rate: float = 0.0  # delivered / sent
    reply_rate: float = 0.0     # replies / delivered
    opt_out_rate: float = 0.0   # opt_outs / sent

    # Cost tracking
    estimated_cost: float = 0.0
    actual_cost: float = 0.0

    # Template performance
    template_stats: Dict[str, Dict[str, Any]] = {}


class CampaignResponse(BaseTimestamps):
    """Schema for campaign responses"""
    id: str
    name: str
    description: Optional[str] = None
    campaign_type: Optional[CampaignType] = None
    status: CampaignStatus = CampaignStatus.draft

    template_ids: List[str] = []
    template_rotation_method: Optional[str] = None

    targeting: Optional[CampaignTargeting] = None
    schedule: Optional[CampaignSchedule] = None

    send_from_phone_pool: Optional[bool] = None
    from_phone_number: Optional[str] = None

    ab_test_enabled: Optional[bool] = None
    ab_test_split: Optional[float] = None

    enable_auto_responses: Optional[bool] = None
    enable_stop_processing: Optional[bool] = None

    tags: List[str] = []

    organization_id: Optional[str] = None
    created_by: Optional[str] = None

    # Runtime status
    targets_generated: bool = False
    targets_count: int = 0
    last_sent_at: Optional[datetime] = None
    next_send_at: Optional[datetime] = None

    # Performance metrics
    stats: CampaignStats = CampaignStats()

    model_config = ConfigDict(from_attributes=True)


class CampaignTarget(BaseModel):
    """Individual campaign target"""
    id: str
    campaign_id: str
    lead_id: str

    phone_number: str
    from_phone_number: Optional[str] = None

    # Template assignment
    template_id: str
    message_body: Optional[str] = None

    # Status tracking
    status: str = "queued"  # queued, sent, delivered, failed, replied, opted_out

    # Twilio tracking
    twilio_message_sid: Optional[str] = None
    twilio_status: Optional[str] = None
    twilio_error_code: Optional[str] = None

    # Timing
    scheduled_send_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None

    # Cost
    estimated_cost: float = 0.0075  # Default SMS cost
    actual_cost: float = 0.0


class CampaignExecuteRequest(BaseModel):
    """Request to start/execute a campaign"""
    dry_run: bool = False  # Preview without sending
    force_send: bool = False  # Override quiet hours/limits


class CampaignExecuteResponse(BaseModel):
    """Response when starting a campaign"""
    campaign_id: str
    status: str
    targets_generated: int
    estimated_cost: float
    estimated_messages: int
    next_send_at: Optional[datetime] = None
    warnings: List[str] = []
