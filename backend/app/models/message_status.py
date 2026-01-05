from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class MessageStatusEvent(Base):
    """Track message status events from provider callbacks"""
    __tablename__ = "message_status_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Relationships
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    # message = relationship("Message", back_populates="status_events")
    
    # Status information
    status = Column(String, nullable=False, index=True)  # queued, sent, delivered, failed, undelivered, etc.
    error_code = Column(String, nullable=True)
    
    # Raw provider data
    raw_data = Column(JSON, default=dict)  # Store complete webhook payload
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<MessageStatusEvent(id={self.id}, message_id={self.message_id}, status='{self.status}')>"