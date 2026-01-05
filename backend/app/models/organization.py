from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    
    # Contact information
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    
    # Address
    address_line1 = Column(String, nullable=True)
    address_line2 = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    country = Column(String, default="US")
    
    # SMS Settings
    brand_name = Column(String, nullable=False)  # Used in SMS messages
    default_timezone = Column(String, default="America/Chicago")
    quiet_hours_start = Column(String, default="20:00")  # 8 PM
    quiet_hours_end = Column(String, default="08:00")    # 8 AM
    
    # Rate limiting
    default_rate_limit_mps = Column(Integer, default=3)  # Messages per second
    daily_message_limit = Column(Integer, default=10000)
    
    # Features and limits
    max_users = Column(Integer, default=10)
    max_phone_numbers = Column(Integer, default=5)
    max_templates = Column(Integer, default=50)
    
    # Compliance settings
    compliance_settings = Column(JSON, default=dict)
    
    # Status
    is_active = Column(Boolean, default=True)
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships (temporarily simplified for development)
    # users = relationship("User", back_populates="organization")
    # leads = relationship("Lead", back_populates="organization")
    # campaigns = relationship("Campaign", back_populates="organization")
    # templates = relationship("Template", back_populates="organization")
    # phone_numbers = relationship("PhoneNumber", back_populates="organization")
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Organization(id={self.id}, name='{self.name}')>"