from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class Suppression(Base):
    """Global suppression list for opt-outs and compliance"""
    __tablename__ = "suppressions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Organization relationship (can be NULL for global suppressions)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True, index=True)
    
    # Phone number to suppress
    phone_number = Column(String, nullable=False, index=True)
    normalized_phone = Column(String, nullable=False, index=True)  # E.164 format for lookups
    
    # Suppression details
    reason = Column(String, nullable=False, index=True)  # opt_out, spam_complaint, invalid, bounce, manual
    source = Column(String, nullable=False)  # sms_reply, web_form, api, manual, twilio_webhook
    
    # Associated data
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=True, index=True)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=True, index=True)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id"), nullable=True, index=True)
    
    # Opt-out message details
    opt_out_message = Column(Text, nullable=True)  # The actual message that triggered opt-out
    detected_keywords = Column(String, nullable=True)  # STOP, QUIT, etc.
    
    # Scope of suppression
    is_global = Column(Boolean, default=False)  # Global across all organizations
    suppressed_campaigns = Column(String, nullable=True)  # JSON array of campaign IDs
    suppressed_from_phones = Column(String, nullable=True)  # JSON array of phone numbers
    
    # Status and verification
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)  # Manual verification of opt-out
    verification_notes = Column(Text, nullable=True)
    
    # Resubscription tracking
    resubscribed_at = Column(DateTime(timezone=True), nullable=True)
    resubscription_method = Column(String, nullable=True)  # web_form, sms_optin, api
    resubscription_notes = Column(Text, nullable=True)
    
    # Compliance fields
    compliance_type = Column(String, nullable=True)  # tcpa, can_spam, gdpr, etc.
    legal_basis = Column(String, nullable=True)  # User requested, legal requirement, etc.
    retention_period = Column(String, nullable=True)  # How long to keep this suppression
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Processing tracking
    processed_at = Column(DateTime(timezone=True), nullable=True)
    processed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    def __repr__(self):
        return f"<Suppression(id={self.id}, phone='{self.phone_number}', reason='{self.reason}')>"
    
    @property
    def is_opt_out(self):
        """Check if this is an opt-out suppression"""
        return self.reason in ["opt_out", "stop_keyword", "spam_complaint"]
    
    @property
    def can_resubscribe(self):
        """Check if this suppression allows resubscription"""
        return self.reason not in ["spam_complaint", "legal_block"] and self.is_active


class DNCList(Base):
    """Do Not Call / Do Not Contact list entries"""
    __tablename__ = "dnc_list"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Phone number
    phone_number = Column(String, nullable=False, index=True)
    normalized_phone = Column(String, nullable=False, unique=True, index=True)
    
    # DNC details
    list_source = Column(String, nullable=False)  # federal_dnc, state_dnc, internal, carrier
    list_type = Column(String, nullable=False)    # dnc, dnd (do not disturb), wireless
    
    # Registration details
    registered_date = Column(DateTime(timezone=True), nullable=True)
    expiration_date = Column(DateTime(timezone=True), nullable=True)
    
    # Geographic scope
    state = Column(String, nullable=True)
    country = Column(String, default="US")
    
    # Status
    is_active = Column(Boolean, default=True)
    last_verified = Column(DateTime(timezone=True), nullable=True)
    
    # Source tracking
    import_batch_id = Column(String, nullable=True)
    source_file = Column(String, nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<DNCList(phone='{self.phone_number}', source='{self.list_source}')>"


# Add the missing CampaignTarget relationship to models/__init__.py
# This is referenced in campaign.py but needs to be importable