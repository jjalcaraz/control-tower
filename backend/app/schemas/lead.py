from pydantic import BaseModel, validator, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import re
from app.schemas.common import BaseTimestamps


class LeadBase(BaseModel):
    """Base lead fields matching database schema"""
    # Required fields
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)
    phone1: str = Field(..., min_length=10, max_length=20)

    # Optional contact fields
    phone2: Optional[str] = Field(None, max_length=20)
    phone3: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)

    # Address fields - matching actual database columns
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    county: Optional[str] = None
    country: str = "US"
    parcel_id: Optional[str] = None

    # Property information - matching actual database columns
    property_type: Optional[str] = None
    acreage: Optional[float] = None
    estimated_value: Optional[int] = None  # Integer in database
    property_address: Optional[str] = None

    # Lead information - matching actual database columns
    lead_score: Optional[str] = Field("cold", max_length=50)
    lead_source: Optional[str] = None
    status: Optional[str] = Field("new", max_length=50)
    consent_status: Optional[str] = None

    # Additional fields
    notes: Optional[str] = None
    tags: Optional[List[str]] = []

    # Opt-out information
    opt_out_reason: Optional[str] = None
    opt_out_date: Optional[datetime] = None

    @validator('phone1', 'phone2', 'phone3')
    def validate_phone_number(cls, v):
        if v is None or v == "":
            return v
        # Basic phone number validation - strip non-numeric chars
        phone = re.sub(r'[^\d]', '', v)
        if len(phone) < 10:
            raise ValueError("Phone number must have at least 10 digits")
        return phone

    @validator('email')
    def validate_email(cls, v):
        if v is None or v == "":
            return None
        # Basic email validation
        if '@' not in v or '.' not in v.split('@')[1]:
            raise ValueError("Invalid email address")
        return v.lower()


class LeadCreate(LeadBase):
    """Schema for creating a new lead"""
    pass


class LeadCreateFrontend(BaseModel):
    """Frontend-friendly schema for creating a new lead"""
    firstName: str = Field(..., min_length=1, max_length=100)
    lastName: str = Field(..., min_length=1, max_length=100)
    primaryPhone: str = Field(..., min_length=10, max_length=20)
    secondaryPhone: Optional[str] = Field(None, max_length=20)
    alternatePhone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)

    # Address fields
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None

    # Property fields
    propertyType: Optional[str] = None
    propertyValue: Optional[float] = None
    acreage: Optional[float] = None
    yearBuilt: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    squareFeet: Optional[int] = None

    leadSource: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None

    @validator('primaryPhone', 'secondaryPhone', 'alternatePhone')
    def validate_phone_number(cls, v):
        if v is None or v == "":
            return None
        # Basic phone number validation - strip non-numeric chars
        phone = re.sub(r'[^\d]', '', v)
        if len(phone) < 10:
            raise ValueError("Phone number must have at least 10 digits")
        return phone

    def to_lead_create(self) -> LeadCreate:
        """Convert frontend format to backend LeadCreate"""
        return LeadCreate(
            owner_name=f"{self.firstName} {self.lastName}",
            phone_number_1=self.primaryPhone,
            phone_number_2=self.secondaryPhone,
            phone_number_3=self.alternatePhone,
            email=self.email,
            street_address=self.street,
            city=self.city,
            state=self.state,
            zip_code=self.zip,
            property_type=self.propertyType,
            property_value=self.propertyValue,
            acreage=self.acreage,
            year_built=self.yearBuilt,
            bedrooms=self.bedrooms,
            bathrooms=self.bathrooms,
            square_feet=self.squareFeet,
            lead_source=self.leadSource,
            notes=self.notes
        )


class LeadUpdate(BaseModel):
    """Schema for updating an existing lead - all fields optional"""
    owner_name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone_number_1: Optional[str] = Field(None, min_length=10, max_length=20)
    phone_number_2: Optional[str] = Field(None, max_length=20)
    phone_number_3: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: str = "US"

    # Property information
    property_type: Optional[str] = None
    property_value: Optional[float] = None
    acreage: Optional[float] = None
    year_built: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    square_feet: Optional[int] = None
    last_tax_assessment: Optional[float] = None
    property_taxes: Optional[float] = None
    tax_year: Optional[int] = None

    # Lead information
    ownership_type: Optional[str] = None
    ownership_length: Optional[int] = None
    occupancy_status: Optional[str] = None
    source_of_lead: Optional[str] = None
    lead_score: Optional[str] = None
    lead_source: Optional[str] = None
    asking_price: Optional[float] = None
    assessed_value: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None

    # Contact and tracking
    last_contacted: Optional[datetime] = None
    next_follow_up: Optional[datetime] = None
    do_not_contact: Optional[bool] = None
    opt_out_reason: Optional[str] = None
    opt_out_date: Optional[datetime] = None

    @validator('phone_number_1', 'phone_number_2', 'phone_number_3')
    def validate_phone_number(cls, v):
        if v is None or v == "":
            return v
        # Basic phone number validation - strip non-numeric chars
        phone = re.sub(r'[^\d]', '', v)
        if len(phone) < 10:
            raise ValueError("Phone number must have at least 10 digits")
        return phone

    @validator('email')
    def validate_email(cls, v):
        if v is None or v == "":
            return None
        # Basic email validation
        if '@' not in v or '.' not in v.split('@')[1]:
            raise ValueError("Invalid email address")
        return v.lower()


class LeadResponse(LeadBase, BaseTimestamps):
    """Schema for lead responses"""
    id: str  # UUID as string

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat() if dt else None
        }


class ImportError(BaseModel):
    """Detailed import error with field-level information"""
    row_number: int
    error_type: str  # INVALID_PHONE, MISSING_REQUIRED, DUPLICATE_LEAD, etc.
    field_name: Optional[str] = None
    message: str
    suggested_fix: Optional[str] = None


class ImportProgress(BaseModel):
    """Real-time import progress tracking"""
    import_id: str
    status: str  # processing, completed, failed
    progress_pct: float
    current_row: int
    total_rows: int
    eta_seconds: Optional[int] = None
    started_at: datetime
    updated_at: datetime
    error_count: int = 0
    success_count: int = 0


class LeadImportPreview(BaseModel):
    """Enhanced preview of CSV import for frontend"""
    total_rows: int
    columns: List[str]
    preview_data: List[Dict[str, str]]  # First 5-10 rows
    suggested_mapping: Dict[str, str]   # Column -> field mapping suggestions
    duplicate_count: int = 0
    duplicate_preview: List[Dict[str, Any]] = []  # Potential duplicate examples
    validation_warnings: List[str] = []
    phone_validation_summary: Dict[str, int] = {}  # valid, invalid, missing counts
    email_validation_summary: Dict[str, int] = {}  # valid, invalid, missing counts


class LeadImportMapping(BaseModel):
    """Enhanced column mapping for CSV import"""
    column_mappings: Dict[str, str]  # CSV column -> lead field
    skip_duplicates: bool = True
    update_existing: bool = False
    bulk_tags: List[str] = []
    auto_tagging_enabled: bool = False
    tagging_options: Dict[str, Any] = {}
    duplicate_strategy: str = "skip"  # skip, update, merge


class LeadImportExecute(BaseModel):
    """Execute CSV import with enhanced mappings"""
    import_id: str  # Reference to uploaded file
    mapping: LeadImportMapping


class LeadImportResult(BaseModel):
    """Enhanced result of lead import operation with progress tracking"""
    import_id: str
    status: str  # processing, completed, failed
    total_rows: int
    processed_rows: int = 0
    successful_imports: int = 0
    failed_imports: int = 0
    duplicate_skips: int = 0
    errors: List[ImportError] = []  # Enhanced error structure
    created_at: datetime
    completed_at: Optional[datetime] = None

    # Enhanced progress tracking fields
    progress_percentage: float = 0.0
    estimated_time_remaining: Optional[int] = None  # seconds
    current_batch: int = 0
    total_batches: int = 0
    import_batch_id: Optional[str] = None
    validation_warnings: List[str] = []

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat() if dt else None
        }


class LeadFilters(BaseModel):
    """Advanced filtering for leads"""
    search: Optional[str] = None
    status: Optional[List[str]] = None
    lead_score: Optional[List[str]] = None  
    lead_source: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    states: Optional[List[str]] = None
    counties: Optional[List[str]] = None
    cities: Optional[List[str]] = None
    consent_status: Optional[List[str]] = None
    has_email: Optional[bool] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    contacted_after: Optional[datetime] = None
    contacted_before: Optional[datetime] = None
    
    # Pagination
    page: int = 1
    limit: int = 50
    sort_by: Optional[str] = "created_at"
    sort_order: str = "desc"