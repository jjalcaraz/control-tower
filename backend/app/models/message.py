from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Integer, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Organization relationship
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Relationships
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False, index=True)
    # lead = relationship("Lead", back_populates="messages")
    
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=True, index=True)
    # campaign = relationship("Campaign", back_populates="messages")
    
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id"), nullable=True, index=True)
    # template = relationship("Template", back_populates="messages")
    
    # Status events relationship
    # status_events = relationship("MessageStatusEvent", back_populates="message", cascade="all, delete-orphan")
    
    # Message details
    direction = Column(String, nullable=False, index=True)  # inbound, outbound
    content = Column(Text, nullable=False)
    
    # Phone numbers
    to_phone = Column(String, nullable=False, index=True)
    from_phone = Column(String, nullable=False, index=True)
    
    # Message status
    status = Column(String, default="pending", index=True)  # pending, queued, sent, delivered, failed, read
    
    # Twilio integration
    twilio_message_sid = Column(String, nullable=True, unique=True, index=True)
    twilio_status = Column(String, nullable=True)
    twilio_error_code = Column(String, nullable=True)
    twilio_error_message = Column(Text, nullable=True)
    twilio_num_segments = Column(Integer, default=1)
    
    # Pricing
    estimated_cost = Column(Float, default=0.0)
    actual_cost = Column(Float, default=0.0)
    
    # Message metadata
    message_type = Column(String, default="sms")  # sms, mms
    media_urls = Column(Text, nullable=True)  # JSON array of media URLs for MMS
    
    # Compliance tracking
    contains_keywords = Column(String, nullable=True)  # STOP, HELP, etc.
    compliance_action = Column(String, nullable=True)  # suppressed, auto_response, etc.
    
    # Threading and conversation
    conversation_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    parent_message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id"), nullable=True)
    
    # Timing
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True, index=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Retry logic for outbound messages
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
    
    # Analytics and tracking
    opened = Column(Boolean, default=False)
    clicked = Column(Boolean, default=False)
    bounced = Column(Boolean, default=False)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Message(id={self.id}, direction='{self.direction}', status='{self.status}', to='{self.to_phone}')>"
    
    @property
    def is_inbound(self):
        return self.direction == "inbound"
    
    @property
    def is_outbound(self):
        return self.direction == "outbound"
    
    @property
    def is_delivered(self):
        return self.status in ["delivered", "read"]
    
    @property
    def is_failed(self):
        return self.status == "failed"


class Conversation(Base):
    """Conversation threads for messages"""
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Organization relationship
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Conversation participants
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False, index=True)
    lead_phone = Column(String, nullable=False, index=True)
    our_phone = Column(String, nullable=False, index=True)
    
    # Conversation state
    status = Column(String, default="active", index=True)  # active, closed, archived
    unread_count = Column(Integer, default=0)
    
    # Last activity
    last_message_at = Column(DateTime(timezone=True), nullable=True, index=True)
    last_inbound_at = Column(DateTime(timezone=True), nullable=True)
    last_outbound_at = Column(DateTime(timezone=True), nullable=True)
    
    # Assignment and notes
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)  # JSON array
    
    # Analytics
    total_messages = Column(Integer, default=0)
    inbound_messages = Column(Integer, default=0)
    outbound_messages = Column(Integer, default=0)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Conversation(id={self.id}, lead_id={self.lead_id}, status='{self.status}')>"