from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class WebhookLog(Base):
    """Log all incoming webhook requests for debugging and audit"""
    __tablename__ = "webhook_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Organization (optional - some webhooks may not be org-specific)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True, index=True)
    
    # Webhook details
    webhook_type = Column(String, nullable=False, index=True)  # twilio_status, twilio_inbound, etc.
    provider = Column(String, nullable=False, index=True)  # twilio, sendgrid, etc.
    
    # Request data
    headers = Column(JSON, default=dict)
    payload = Column(JSON, default=dict)
    
    # Processing status
    processed = Column(Boolean, default=False, index=True)
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<WebhookLog(id={self.id}, webhook_type='{self.webhook_type}', provider='{self.provider}', processed={self.processed})>"