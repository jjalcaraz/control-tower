from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Boolean, Integer, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Organization relationship - disabled for development
    # organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    # organization = relationship("Organization", back_populates="campaigns")
    
    # Campaign basic info
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Campaign type and strategy
    campaign_type = Column(String, nullable=False, index=True)  # broadcast, drip, trigger, followup
    status = Column(String, default="draft", index=True)  # draft, scheduled, running, paused, completed, cancelled
    
    # Target criteria (stored as JSON for flexibility)
    target_criteria = Column(JSON, default=dict)  # county, tags, lead_score, date_range, etc.
    
    # Scheduling
    scheduled_start = Column(DateTime(timezone=True), nullable=True)
    scheduled_end = Column(DateTime(timezone=True), nullable=True)
    actual_start = Column(DateTime(timezone=True), nullable=True)
    actual_end = Column(DateTime(timezone=True), nullable=True)
    
    # Rate limiting and timing
    rate_limit_mps = Column(Integer, default=3)  # Messages per second
    daily_limit = Column(Integer, nullable=True)  # Max messages per day
    respect_quiet_hours = Column(Boolean, default=True)
    timezone = Column(String, default="America/Chicago")
    
    # Template settings
    template_rotation = Column(Boolean, default=True)
    selected_templates = Column(JSON, default=list)  # Template IDs to use
    
    # Phone number pool
    phone_number_pool = Column(JSON, default=list)  # Phone number IDs to use
    rotate_numbers = Column(Boolean, default=True)
    
    # Campaign metrics (cached for performance)
    total_targets = Column(Integer, default=0)
    targets_queued = Column(Integer, default=0)
    targets_sent = Column(Integer, default=0)
    targets_delivered = Column(Integer, default=0)
    targets_failed = Column(Integer, default=0)
    targets_replied = Column(Integer, default=0)
    targets_opted_out = Column(Integer, default=0)
    
    # Performance metrics
    delivery_rate = Column(Float, default=0.0)
    reply_rate = Column(Float, default=0.0)
    opt_out_rate = Column(Float, default=0.0)
    cost_per_send = Column(Float, default=0.0)
    estimated_cost = Column(Float, default=0.0)
    actual_cost = Column(Float, default=0.0)
    
    # Compliance and safety
    compliance_checked = Column(Boolean, default=False)
    compliance_issues = Column(JSON, default=list)
    
    # Relationships
    # campaign_targets = relationship("CampaignTarget", back_populates="campaign", cascade="all, delete-orphan")
    # messages = relationship("Message", back_populates="campaign")
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    def __repr__(self):
        return f"<Campaign(id={self.id}, name='{self.name}', status='{self.status}')>"


class CampaignTarget(Base):
    """Individual lead targeted by a campaign"""
    __tablename__ = "campaign_targets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Relationships
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False, index=True)
    # campaign = relationship("Campaign", back_populates="campaign_targets")
    
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False, index=True)
    # lead = relationship("Lead", back_populates="campaign_targets")
    
    # Target details
    phone_number = Column(String, nullable=False, index=True)  # The specific phone to target
    from_phone_number = Column(String, nullable=True)  # The phone number pool assignment
    
    # Status tracking
    status = Column(String, default="queued", index=True)  # queued, sent, delivered, failed, replied, opted_out
    
    # Message details
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id"), nullable=True)
    # template = relationship("Template", back_populates="campaign_targets")
    message_body = Column(Text, nullable=True)  # Rendered message
    message_segments = Column(Integer, default=1)
    
    # Twilio tracking
    twilio_message_sid = Column(String, nullable=True, index=True)
    twilio_status = Column(String, nullable=True)
    twilio_error_code = Column(String, nullable=True)
    twilio_error_message = Column(String, nullable=True)
    
    # Timing
    scheduled_send_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True, index=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)
    replied_at = Column(DateTime(timezone=True), nullable=True)
    
    # Costs
    estimated_cost = Column(Float, default=0.0)
    actual_cost = Column(Float, default=0.0)
    
    # Retry logic
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<CampaignTarget(id={self.id}, campaign_id={self.campaign_id}, phone='{self.phone_number}', status='{self.status}')>"