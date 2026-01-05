from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class User(Base):
    __tablename__ = "users"

    # Use UUID to match actual database schema
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)  # Column is 'hashed_password' in database

    # Profile information
    first_name = Column(String, nullable=True)  # Separate columns in database
    last_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)

    # Role and permissions
    role = Column(String, default="operator")
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)  # Has is_verified column
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String, nullable=True)
    # No permissions column in database

    # Organization relationship - required in database
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    # organization = relationship("Organization", back_populates="users")

    # Audit fields - match database column names
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)  # Column is 'last_login_at' in database
    deleted_at = Column(DateTime(timezone=True), nullable=True)  # Soft delete support

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"