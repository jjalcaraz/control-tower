from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class Template(Base):
    __tablename__ = "templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Organization relationship
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    # organization = relationship("Organization", back_populates="templates")
    
    # Template basic info
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Template content
    content = Column(Text, nullable=False)  # The message template with variables
    subject = Column(String, nullable=True)  # Optional subject line
    
    # Template metadata
    category = Column(String, nullable=False, index=True)  # initial, followup, help, stop, appointment
    language = Column(String, default="en", index=True)  # en, es
    
    # Variables and validation
    required_variables = Column(JSON, default=list)  # List of required variables like ["first_name", "county"]
    optional_variables = Column(JSON, default=list)  # List of optional variables
    variable_schema = Column(JSON, default=dict)     # JSON schema for variable validation
    
    # Performance tracking
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    performance_score = Column(Integer, default=0)  # Based on delivery/reply rates
    
    # Template settings
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)  # For compliance review
    priority = Column(Integer, default=100)       # Higher priority = used more often
    
    # Message length analysis
    min_length = Column(Integer, nullable=True)
    max_length = Column(Integer, nullable=True)
    avg_segments = Column(Integer, default=1)  # SMS segments when rendered
    
    # A/B Testing
    ab_test_group = Column(String, nullable=True)  # A, B, C, etc.
    ab_test_weight = Column(Integer, default=100)  # Relative weight for selection
    
    # Tags and categorization
    tags = Column(JSON, default=list)
    
    # Relationships
    # campaign_targets = relationship("CampaignTarget", back_populates="template")
    # messages = relationship("Message", back_populates="template")
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Soft delete
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<Template(id={self.id}, name='{self.name}', category='{self.category}')>"


class TemplateUsage(Base):
    """Track template usage for rotation algorithms"""
    __tablename__ = "template_usage"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Relationships
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id"), nullable=False, index=True)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False, index=True)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Usage tracking
    used_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    phone_number = Column(String, nullable=False)
    
    # Performance metrics for this usage
    was_delivered = Column(Boolean, nullable=True)
    was_replied = Column(Boolean, nullable=True)
    was_opted_out = Column(Boolean, nullable=True)
    
    # Message details
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id"), nullable=True)
    rendered_content = Column(Text, nullable=True)
    message_segments = Column(Integer, default=1)
    
    def __repr__(self):
        return f"<TemplateUsage(template_id={self.template_id}, lead_id={self.lead_id}, used_at={self.used_at})>"