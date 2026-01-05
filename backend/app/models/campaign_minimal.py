# Minimal Campaign model for development that matches the actual database schema
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import uuid


class Campaign(Base):
    """Minimal Campaign model for development - only includes essential fields"""
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    created_by = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    campaign_type = Column(String, nullable=False, default="blast")
    status = Column(String, default="draft", index=True)
    created_at = Column(DateTime(timezone=True), server_default="now()", index=True)
    updated_at = Column(DateTime(timezone=True), onupdate="now()")

    def __repr__(self):
        return f"<Campaign(id={self.id}, name='{self.name}', status='{self.status}')>"