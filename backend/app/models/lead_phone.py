from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class LeadPhone(Base):
    """Normalized phone numbers for leads - supports up to 3 per lead"""
    __tablename__ = "lead_phones"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    
    # Relationships
    lead_id = Column(String(36), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    # lead = relationship("Lead", back_populates="phones")
    
    # Phone information
    e164 = Column(String, nullable=False, index=True)  # E.164 formatted phone number
    label = Column(String, nullable=True)  # "primary", "secondary", "work", etc.
    is_primary = Column(Boolean, default=False)
    
    # Consent and compliance per phone number
    consent_status = Column(String, default="unknown")  # opt_in, opt_out, unknown
    is_valid = Column(Boolean, default=True)
    
    # Carrier information
    carrier_info = Column(JSON, default=dict)  # Store carrier lookup results
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<LeadPhone(id={self.id}, lead_id={self.lead_id}, e164='{self.e164}', label='{self.label}')>"
    
    @property
    def formatted_number(self):
        """Return formatted US phone number"""
        if len(self.e164) == 12 and self.e164.startswith('+1'):
            num = self.e164[2:]  # Remove +1
            return f"({num[:3]}) {num[3:6]}-{num[6:]}"
        return self.e164