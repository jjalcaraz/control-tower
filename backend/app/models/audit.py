from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class AuditEvent(Base):
    """Track all compliance and business events for audit purposes"""
    __tablename__ = "audit_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Organization relationship
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    organization = relationship("Organization")
    
    # Event details
    event_type = Column(String, nullable=False, index=True)  # opt_out, consent_granted, message_sent, violation_detected, etc.
    phone_number = Column(String, nullable=True, index=True)
    
    # Related entities
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=True)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Event data
    details = Column(JSON, default=dict)  # Flexible event details
    compliance_status = Column(String, default="compliant")  # compliant, violation, warning
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<AuditEvent(id={self.id}, event_type='{self.event_type}', compliance_status='{self.compliance_status}')>"