from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Integer, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class PhoneNumber(Base):
    __tablename__ = "phone_numbers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Organization relationship
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    # organization = relationship("Organization", back_populates="phone_numbers")
    
    # Phone number details
    phone_number = Column(String, nullable=False, unique=True, index=True)
    formatted_number = Column(String, nullable=False)  # E.164 format
    display_number = Column(String, nullable=False)    # Human readable format
    
    # Provider information
    provider = Column(String, default="twilio", index=True)  # twilio, bandwidth, etc.
    provider_sid = Column(String, nullable=True)  # Provider's unique identifier
    messaging_service_sid = Column(String, nullable=True)  # Twilio Messaging Service
    
    # Capabilities
    sms_enabled = Column(Boolean, default=True)
    mms_enabled = Column(Boolean, default=False)
    voice_enabled = Column(Boolean, default=False)
    
    # Status and health
    status = Column(String, default="active", index=True)  # active, suspended, failed, pending
    health_score = Column(Integer, default=100)  # 0-100, based on delivery rates
    last_health_check = Column(DateTime(timezone=True), nullable=True)
    
    # Usage statistics
    daily_message_count = Column(Integer, default=0)
    weekly_message_count = Column(Integer, default=0)
    monthly_message_count = Column(Integer, default=0)
    total_message_count = Column(Integer, default=0)
    
    # Rate limiting
    rate_limit_mps = Column(Integer, default=3)  # Messages per second for this number
    daily_limit = Column(Integer, nullable=True)  # Max messages per day
    current_daily_count = Column(Integer, default=0)
    
    # Performance metrics
    delivery_rate = Column(Float, default=0.0)  # Percentage of messages delivered
    reply_rate = Column(Float, default=0.0)     # Percentage that received replies
    opt_out_rate = Column(Float, default=0.0)   # Percentage that opted out
    spam_rate = Column(Float, default=0.0)      # Spam reports
    
    # Last activity
    last_used_at = Column(DateTime(timezone=True), nullable=True, index=True)
    last_message_sent = Column(DateTime(timezone=True), nullable=True)
    last_message_received = Column(DateTime(timezone=True), nullable=True)
    
    # Configuration
    is_dedicated = Column(Boolean, default=False)  # Dedicated short code vs shared pool
    assigned_campaigns = Column(JSON, default=list)  # Campaign IDs this number is assigned to
    blocked_keywords = Column(JSON, default=list)    # Keywords that can't be sent from this number
    
    # Compliance and carrier info
    carrier_name = Column(String, nullable=True)
    carrier_type = Column(String, nullable=True)  # mobile, landline, voip
    registered_brand = Column(String, nullable=True)  # A2P 10DLC brand registration
    campaign_registry = Column(JSON, default=dict)    # A2P 10DLC campaign registrations
    
    # Costs
    acquisition_cost = Column(Float, default=0.0)
    monthly_cost = Column(Float, default=1.00)  # Default Twilio phone number cost
    cost_per_message = Column(Float, default=0.0075)  # Default SMS cost
    
    # Phone number pool assignment
    pool_priority = Column(Integer, default=100)  # Higher = preferred for new campaigns
    is_primary = Column(Boolean, default=False)   # Primary number for organization
    
    # Geographic info
    country_code = Column(String, default="US")
    area_code = Column(String, nullable=True)
    region = Column(String, nullable=True)
    city = Column(String, nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    acquired_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Soft delete
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<PhoneNumber(id={self.id}, number='{self.phone_number}', status='{self.status}')>"
    
    @property
    def is_healthy(self):
        """Check if phone number is healthy for sending"""
        return (
            self.status == "active" and 
            self.health_score >= 70 and 
            self.delivery_rate >= 0.85
        )
    
    @property
    def can_send_message(self):
        """Check if number can send another message today"""
        if self.daily_limit is None:
            return True
        return self.current_daily_count < self.daily_limit
    
    @property
    def is_rate_limited(self):
        """Check if number is currently rate limited"""
        # This would need to check Redis or recent message timestamps
        return False  # Implementation depends on rate limiting strategy