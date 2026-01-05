from sqlalchemy import Column, String, DateTime, Text, JSON, Boolean, Integer, Float, UUID
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class Lead(Base):
    __tablename__ = "leads"

    # Primary Keys - UUID type to match actual database
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Owner information - matches actual database schema
    first_name = Column(String, nullable=False, index=True)
    last_name = Column(String, nullable=False, index=True)
    full_name = Column(String, nullable=True, index=True)

    # Phone numbers - matches actual database column names
    phone1 = Column(String, nullable=False, index=True)
    phone2 = Column(String, nullable=True, index=True)
    phone3 = Column(String, nullable=True, index=True)
    phone1_valid = Column(Boolean, nullable=True)
    phone2_valid = Column(Boolean, nullable=True)
    phone3_valid = Column(Boolean, nullable=True)

    email = Column(String, nullable=True, index=True)

    # Address - matches actual database column names
    address_line1 = Column(String, nullable=True)
    address_line2 = Column(String, nullable=True)
    address_valid = Column(Boolean, nullable=True)
    city = Column(String, nullable=True, index=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True, index=True)
    county = Column(String, nullable=True, index=True)
    country = Column(String, nullable=True)
    parcel_id = Column(String, nullable=True, index=True)

    # Property information - matches actual database column names
    property_type = Column(String, nullable=True, index=True)
    acreage = Column(Float, nullable=True)
    estimated_value = Column(Integer, nullable=True)
    property_address = Column(String, nullable=True)

    # Lead information - matches actual database column names
    lead_source = Column(String, nullable=True, index=True)
    lead_score = Column(String, nullable=True, index=True)
    status = Column(String, nullable=True, index=True)
    consent_status = Column(String, nullable=True)
    consent_date = Column(DateTime(timezone=True), nullable=True)

    # Opt-out information
    opt_out_date = Column(DateTime(timezone=True), nullable=True)
    opt_out_reason = Column(String, nullable=True)

    # Contact tracking - matches actual database column names
    last_contacted_at = Column(DateTime(timezone=True), nullable=True)
    last_campaign_id = Column(UUID(as_uuid=True), nullable=True)
    total_messages_sent = Column(Integer, nullable=True)
    total_messages_received = Column(Integer, nullable=True)

    # Conversion tracking
    replied_at = Column(DateTime(timezone=True), nullable=True)
    conversion_event = Column(String, nullable=True)
    conversion_date = Column(DateTime(timezone=True), nullable=True)
    conversion_value = Column(Integer, nullable=True)

    # Additional fields
    custom_fields = Column(JSON, nullable=True)
    tags = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)

    # Import tracking
    import_batch_id = Column(UUID(as_uuid=True), nullable=True)
    import_row_number = Column(Integer, nullable=True)

    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(UUID(as_uuid=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<Lead(id={self.id}, full_name='{self.full_name}', phone1='{self.phone1}')>"

    @property
    def display_name(self):
        """Get display name for UI"""
        return self.full_name or f"{self.first_name} {self.last_name}".strip()

    @property
    def primary_phone(self):
        """Get primary phone number"""
        return self.phone1

    @property
    def all_phones(self):
        """Get all valid phone numbers"""
        phones = []
        if self.phone1:
            phones.append(self.phone1)
        if self.phone2:
            phones.append(self.phone2)
        if self.phone3:
            phones.append(self.phone3)
        return phones

    def get_unique_phones(self):
        """Get deduplicated list of phone numbers"""
        unique_phones = []
        for phone in [self.phone1, self.phone2, self.phone3]:
            if phone and phone not in unique_phones:
                unique_phones.append(phone)
        return unique_phones

    def has_phone(self, phone_number):
        """Check if lead has specific phone number"""
        return phone_number in [self.phone1, self.phone2, self.phone3]

    def add_tags(self, new_tags):
        """Merge new tags with existing tags without duplicates"""
        if not hasattr(self, 'tags') or self.tags is None:
            self.tags = []

        if not isinstance(self.tags, list):
            self.tags = list(self.tags) if self.tags else []

        # Add new tags without duplicates
        for tag in new_tags:
            if tag and tag not in self.tags:
                self.tags.append(tag)

    def remove_tags(self, tags_to_remove):
        """Remove specified tags from lead"""
        if not hasattr(self, 'tags') or self.tags is None:
            return

        if not isinstance(self.tags, list):
            self.tags = list(self.tags) if self.tags else []

        # Remove specified tags
        self.tags = [tag for tag in self.tags if tag not in tags_to_remove]
