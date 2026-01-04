# SMS Marketing Backend System - Product Requirements and Planning (PRP) Document

**Document Version:** 2.0  
**Last Updated:** January 2025  
**Product:** SMS Control Tower Backend  
**Technology Stack:** FastAPI, Python 3.11+, PostgreSQL, SQLAlchemy, Redis, Celery

---

## 1. SYSTEM OVERVIEW

The SMS Marketing Backend System provides a comprehensive TCPA-compliant API for managing SMS marketing campaigns, leads, messaging, and compliance tracking. The system transitions from in-memory mock data to a full PostgreSQL database implementation with advanced features.

### 1.1 Core Architecture
- **Framework:** FastAPI with async/await support
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Cache Layer:** Redis for session management and performance
- **Background Tasks:** Celery with Redis broker
- **SMS Provider:** Twilio API integration
- **Authentication:** JWT with refresh token rotation
- **Documentation:** Auto-generated OpenAPI/Swagger

### 1.2 Key Features
- Multi-tenant lead management with 3-phone support
- Real-time SMS messaging with delivery tracking
- TCPA compliance automation
- Campaign management with A/B testing
- Advanced analytics and reporting
- WebSocket real-time updates
- Comprehensive audit trails

---

## 2. DATABASE DESIGN & INTEGRATION

### 2.1 Database Migration Requirements
**Priority:** HIGH - IMMEDIATE IMPLEMENTATION NEEDED

#### 2.1.1 Database Connection Configuration
- **Database:** PostgreSQL 14+ 
- **Connection:** SQLAlchemy with asyncpg driver
- **Pool Size:** Configurable (default: 10 connections)
- **Environment:** `.env.development` configuration required

```python
DATABASE_URL = "postgresql://user:password@localhost:5432/sms_control_tower"
DB_POOL_SIZE = 10
DB_MAX_OVERFLOW = 20
```

#### 2.1.2 Core Database Tables

**Users Table**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Leads Table - Enhanced Multi-Phone Support**
```sql
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    
    -- Multi-phone structure (required primary, optional secondary/alternate)
    phone1 VARCHAR(20) NOT NULL,              -- Primary phone (required)
    phone1_valid BOOLEAN DEFAULT false,
    phone1_opt_out BOOLEAN DEFAULT false,
    phone1_last_contacted TIMESTAMPTZ,
    
    phone2 VARCHAR(20),                       -- Secondary phone (optional)
    phone2_valid BOOLEAN DEFAULT false,
    phone2_opt_out BOOLEAN DEFAULT false,
    phone2_last_contacted TIMESTAMPTZ,
    
    phone3 VARCHAR(20),                       -- Alternate phone (optional)
    phone3_valid BOOLEAN DEFAULT false,
    phone3_opt_out BOOLEAN DEFAULT false,
    phone3_last_contacted TIMESTAMPTZ,
    
    email VARCHAR(255),
    company VARCHAR(200),
    title VARCHAR(100),
    industry VARCHAR(100),
    
    -- Address information
    street_address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    
    -- Lead management
    status lead_status DEFAULT 'new',
    source VARCHAR(100),
    score INTEGER DEFAULT 0,
    tags TEXT[],
    notes TEXT,
    
    -- TCPA compliance tracking
    consent_date TIMESTAMPTZ,
    consent_method VARCHAR(50),
    consent_ip_address INET,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT valid_primary_phone CHECK (phone1 IS NOT NULL AND length(phone1) >= 10),
    CONSTRAINT valid_secondary_phone CHECK (phone2 IS NULL OR length(phone2) >= 10),
    CONSTRAINT valid_alternate_phone CHECK (phone3 IS NULL OR length(phone3) >= 10)
);
```

**Campaigns Table**
```sql
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Campaign configuration
    message_template TEXT NOT NULL,
    sender_phone VARCHAR(20) NOT NULL,
    status campaign_status DEFAULT 'draft',
    
    -- Targeting & scheduling
    target_audience_filter JSONB,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    time_zone VARCHAR(50) DEFAULT 'UTC',
    
    -- A/B testing
    is_ab_test BOOLEAN DEFAULT false,
    ab_test_percentage DECIMAL(5,2),
    ab_variant_template TEXT,
    
    -- Performance tracking
    total_leads INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_failed INTEGER DEFAULT 0,
    replies_received INTEGER DEFAULT 0,
    opt_outs INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);
```

#### 2.1.3 Database Migrations
- **Alembic Integration:** Database version control and migrations
- **Seed Data:** Development data for testing
- **Indexes:** Performance optimization for common queries
- **Foreign Keys:** Referential integrity enforcement

### 2.2 SQLAlchemy Model Implementation

#### 2.2.1 Enhanced Lead Model
```python
class Lead(BaseModel):
    __tablename__ = "leads"
    
    # Multi-phone implementation
    phone1: str = Column(String(20), nullable=False)  # Primary (required)
    phone1_valid: bool = Column(Boolean, default=False)
    phone1_opt_out: bool = Column(Boolean, default=False)
    
    phone2: str = Column(String(20), nullable=True)   # Secondary (optional)
    phone2_valid: bool = Column(Boolean, default=False)
    phone2_opt_out: bool = Column(Boolean, default=False)
    
    phone3: str = Column(String(20), nullable=True)   # Alternate (optional)
    phone3_valid: bool = Column(Boolean, default=False)
    phone3_opt_out: bool = Column(Boolean, default=False)
    
    @property
    def primary_phone(self) -> str:
        return self.phone1
    
    @property
    def all_phones(self) -> List[str]:
        phones = [self.phone1]
        if self.phone2:
            phones.append(self.phone2)
        if self.phone3:
            phones.append(self.phone3)
        return phones
    
    @property
    def active_phones(self) -> List[str]:
        """Returns only phones that haven't opted out"""
        phones = []
        if not self.phone1_opt_out:
            phones.append(self.phone1)
        if self.phone2 and not self.phone2_opt_out:
            phones.append(self.phone2)
        if self.phone3 and not self.phone3_opt_out:
            phones.append(self.phone3)
        return phones
```

---

## 3. API ENDPOINTS & SCHEMA DESIGN

### 3.1 Lead Management API - Multi-Phone Support

#### 3.1.1 Enhanced Lead Creation Schema
```python
class LeadCreateFrontend(BaseModel):
    """Frontend-friendly schema for lead creation"""
    firstName: str = Field(..., min_length=1, max_length=100)
    lastName: str = Field(..., min_length=1, max_length=100)
    
    # Multi-phone structure (frontend naming convention)
    primaryPhone: str = Field(..., min_length=10, max_length=20)
    secondaryPhone: Optional[str] = Field(None, max_length=20)
    alternatePhone: Optional[str] = Field(None, max_length=20)
    
    email: Optional[str] = Field(None, max_length=255)
    company: Optional[str] = Field(None, max_length=200)
    # ... other fields
    
    def to_backend_format(self) -> "LeadCreate":
        """Convert frontend format to backend database format"""
        return LeadCreate(
            first_name=self.firstName,
            last_name=self.lastName,
            phone1=self.primaryPhone,
            phone2=self.secondaryPhone,
            phone3=self.alternatePhone,
            email=self.email,
            company=self.company
        )
```

#### 3.1.2 Lead Validation Requirements
- **Primary Phone:** REQUIRED, validated with E.164 format
- **Secondary/Alternate:** OPTIONAL, validated if provided
- **Duplicate Detection:** Check across all phone numbers
- **Phone Number Formatting:** Consistent international format storage

#### 3.1.3 Enhanced API Endpoints

**POST /api/v1/leads**
- Accept both frontend and backend format schemas
- Validate all provided phone numbers
- Check for duplicates across all phone fields
- Return formatted lead data with all phone numbers

**GET /api/v1/leads**
- Search functionality across all phone numbers
- Filter by phone validation status
- Pagination with configurable page sizes
- Sort by multiple criteria

**PUT /api/v1/leads/{lead_id}**
- Update multi-phone information
- Maintain opt-out status per phone number
- Audit trail for phone number changes

### 3.2 Campaign Management API

#### 3.2.1 Campaign Creation & Management
```python
class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    message_template: str = Field(..., min_length=1)
    sender_phone: str = Field(..., min_length=10)
    
    # Targeting configuration
    target_phone_preference: Literal["primary", "secondary", "alternate", "all"] = "primary"
    exclude_opted_out: bool = True
    
    # Scheduling
    scheduled_start: Optional[datetime] = None
    time_zone: str = "UTC"
```

#### 3.2.2 Multi-Phone Campaign Targeting
- **Phone Selection:** Choose which phone numbers to target
- **Opt-out Respect:** Honor individual phone opt-out preferences  
- **Delivery Tracking:** Track success/failure per phone number
- **Compliance:** TCPA compliance per phone contact

---

## 4. MESSAGING & COMPLIANCE SYSTEM

### 4.1 Twilio Integration Enhancement

#### 4.1.1 Configuration Requirements
```python
# Twilio settings in .env.development
TWILIO_ACCOUNT_SID = "your_account_sid"
TWILIO_AUTH_TOKEN = "your_auth_token"  
TWILIO_PHONE_NUMBER = "+1234567890"
TWILIO_WEBHOOK_URL = "https://your-domain.com/webhooks/twilio"
TWILIO_STATUS_CALLBACK_URL = "https://your-domain.com/webhooks/twilio/status"
```

#### 4.1.2 Message Tracking Database Table
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id),
    campaign_id UUID REFERENCES campaigns(id),
    
    -- Phone targeting
    target_phone VARCHAR(20) NOT NULL,  -- Which of the 3 phones was targeted
    phone_type VARCHAR(20) NOT NULL,    -- 'primary', 'secondary', 'alternate'
    
    -- Message content
    content TEXT NOT NULL,
    sender_phone VARCHAR(20) NOT NULL,
    
    -- Twilio tracking
    twilio_sid VARCHAR(100) UNIQUE,
    status message_status DEFAULT 'queued',
    error_code VARCHAR(20),
    error_message TEXT,
    
    -- Delivery tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Compliance
    opt_out_processed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 TCPA Compliance Implementation

#### 4.2.1 Opt-out Processing
- **Per-Phone Opt-outs:** Individual opt-out tracking for each phone number
- **Keyword Detection:** Automatic processing of STOP, END, CANCEL, UNSUBSCRIBE
- **Compliance Database:** Audit trail for all opt-out actions
- **Real-time Updates:** WebSocket notifications for opt-out events

#### 4.2.2 Time-based Restrictions
- **Quiet Hours:** Configurable by timezone (default: 9 PM - 8 AM)
- **Weekend Restrictions:** Optional weekend sending limitations  
- **Timezone Detection:** Automatic timezone detection from phone numbers
- **Schedule Validation:** Pre-send compliance checking

---

## 5. AUTHENTICATION & AUTHORIZATION

### 5.1 JWT Implementation

#### 5.1.1 Enhanced User Authentication
```python
class UserAuthentication:
    # JWT configuration
    SECRET_KEY: str = settings.JWT_SECRET_KEY
    ALGORITHM: str = "HS256" 
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # Role-based permissions
    ROLE_PERMISSIONS = {
        "admin": ["*"],  # Full access
        "campaign_manager": ["leads:*", "campaigns:*", "messages:read"],
        "operator": ["leads:read", "messages:*"],
        "viewer": ["leads:read", "campaigns:read", "messages:read"]
    }
```

#### 5.1.2 Database Session Management
- **User Sessions:** Track active sessions in database
- **Refresh Tokens:** Secure rotation with blacklisting
- **Activity Logging:** Comprehensive audit trail
- **Multi-device Support:** Concurrent session management

### 5.2 Role-based Access Control

#### 5.2.1 Permission Structure
- **Granular Permissions:** Resource-level access control
- **Dynamic Roles:** Database-driven role management
- **Permission Inheritance:** Hierarchical permission structure
- **API Security:** Endpoint-level authorization decorators

---

## 6. REAL-TIME FEATURES & WEBSOCKETS

### 6.1 WebSocket Implementation

#### 6.1.1 Real-time Event Types
```python
class WebSocketEvents:
    # Lead management events
    LEAD_CREATED = "lead.created"
    LEAD_UPDATED = "lead.updated" 
    LEAD_DELETED = "lead.deleted"
    
    # Campaign events
    CAMPAIGN_STARTED = "campaign.started"
    CAMPAIGN_COMPLETED = "campaign.completed"
    CAMPAIGN_PAUSED = "campaign.paused"
    
    # Message events
    MESSAGE_SENT = "message.sent"
    MESSAGE_DELIVERED = "message.delivered"
    MESSAGE_FAILED = "message.failed"
    MESSAGE_REPLIED = "message.replied"
    
    # Compliance events
    OPT_OUT_PROCESSED = "compliance.opt_out"
    COMPLIANCE_VIOLATION = "compliance.violation"
```

#### 6.1.2 WebSocket Connection Management
- **Room-based Broadcasting:** User-specific and global channels
- **Connection Persistence:** Redis-backed session storage
- **Authentication:** JWT-based WebSocket authentication
- **Rate Limiting:** Connection and message rate limits

---

## 7. BACKGROUND PROCESSING

### 7.1 Celery Task Implementation

#### 7.1.1 Asynchronous Tasks
```python
# Campaign processing tasks
@celery.task
def process_campaign_batch(campaign_id: str, lead_ids: List[str])
    """Process campaign messages for a batch of leads"""
    
@celery.task  
def validate_phone_numbers(lead_ids: List[str])
    """Validate phone numbers using external services"""

@celery.task
def generate_campaign_report(campaign_id: str)
    """Generate comprehensive campaign analytics"""

# Compliance tasks
@celery.task
def process_opt_out_message(message_id: str)
    """Process incoming opt-out messages"""
    
@celery.task
def cleanup_expired_tokens()
    """Remove expired JWT tokens from blacklist"""
```

#### 7.1.2 Task Monitoring
- **Task Status:** Real-time task progress tracking
- **Error Handling:** Comprehensive error reporting and retry logic
- **Performance Metrics:** Task execution time and success rates
- **Admin Interface:** Task management and monitoring dashboard

---

## 8. DATA IMPORT & EXPORT

### 8.1 Enhanced CSV Import - Multi-Phone Support

#### 8.1.1 Import Field Mapping
```python
SUPPORTED_IMPORT_FIELDS = {
    # Required fields
    "first_name": ["First Name", "FirstName", "fname"],
    "last_name": ["Last Name", "LastName", "lname"], 
    
    # Multi-phone fields
    "primary_phone": ["Primary Phone", "Phone", "Phone1", "Primary Phone Number"],
    "secondary_phone": ["Secondary Phone", "Phone2", "Secondary Phone Number", "Alternate Phone 1"],
    "alternate_phone": ["Alternate Phone", "Phone3", "Alternate Phone Number", "Additional Phone"],
    
    # Contact information  
    "email": ["Email", "Email Address", "E-mail"],
    "company": ["Company", "Organization", "Business"],
    
    # Address fields
    "street_address": ["Address", "Street", "Street Address"],
    "city": ["City"],
    "state": ["State", "Province", "Region"],
    "zip_code": ["ZIP", "Zip Code", "Postal Code"],
    "country": ["Country"]
}
```

#### 8.1.2 Import Validation & Processing
- **Multi-phone Validation:** Validate all provided phone columns
- **Duplicate Detection:** Check duplicates across all phone numbers
- **Error Reporting:** Detailed validation error reports per row
- **Batch Processing:** Large file processing with progress tracking

### 8.2 Data Export Enhancement

#### 8.2.1 Export Formats
- **CSV Export:** All lead data including multi-phone information  
- **Excel Export:** Formatted spreadsheets with multiple tabs
- **JSON Export:** API-friendly structured data
- **Campaign Reports:** Performance analytics and metrics

---

## 9. PERFORMANCE & SCALABILITY

### 9.1 Database Optimization

#### 9.1.1 Indexing Strategy
```sql
-- Lead search performance
CREATE INDEX idx_leads_phones ON leads USING GIN ((ARRAY[phone1, phone2, phone3]));
CREATE INDEX idx_leads_name_search ON leads (first_name, last_name);
CREATE INDEX idx_leads_company ON leads (company);
CREATE INDEX idx_leads_created_at ON leads (created_at);

-- Campaign performance
CREATE INDEX idx_campaigns_status_dates ON campaigns (status, scheduled_start, scheduled_end);
CREATE INDEX idx_messages_campaign_status ON messages (campaign_id, status);

-- Compliance tracking
CREATE INDEX idx_leads_opt_out ON leads (phone1_opt_out, phone2_opt_out, phone3_opt_out);
```

#### 9.1.2 Query Optimization
- **Pagination:** Efficient cursor-based pagination
- **Search:** Full-text search across multiple fields
- **Filtering:** Optimized multi-criteria filtering
- **Aggregations:** Pre-computed analytics for dashboard metrics

### 9.2 Caching Strategy

#### 9.2.1 Redis Caching
- **API Response Caching:** Frequently accessed data
- **Session Storage:** User session and authentication data
- **Rate Limiting:** API rate limiting with sliding windows
- **Real-time Data:** WebSocket connection state management

---

## 10. MONITORING & LOGGING

### 10.1 Application Monitoring

#### 10.1.1 Health Checks
```python
@router.get("/health")
async def health_check():
    """Comprehensive system health check"""
    return {
        "status": "healthy",
        "database": await check_database_connection(),
        "redis": await check_redis_connection(),
        "twilio": await check_twilio_service(),
        "celery": await check_celery_workers(),
        "timestamp": datetime.utcnow()
    }
```

#### 10.1.2 Performance Metrics
- **Response Times:** API endpoint performance tracking
- **Database Queries:** Slow query detection and optimization
- **Message Delivery:** SMS delivery success rates and timing
- **Error Rates:** Comprehensive error tracking and alerting

### 10.2 Audit & Compliance Logging

#### 10.2.1 Audit Trail Implementation
- **User Actions:** Complete audit trail of all user activities
- **Data Changes:** Track all lead and campaign modifications
- **Compliance Events:** Log all TCPA-related events and decisions
- **System Events:** Authentication, authorization, and system events

---

## 11. SECURITY IMPLEMENTATION

### 11.1 Data Protection

#### 11.1.1 Encryption & Security
- **Data at Rest:** Database encryption for sensitive fields
- **Data in Transit:** TLS 1.3 for all API communications
- **Password Security:** bcrypt hashing with salt rounds
- **PII Protection:** Secure handling of personally identifiable information

#### 11.1.2 API Security
- **Rate Limiting:** Configurable rate limits per endpoint and user
- **Input Validation:** Comprehensive input sanitization and validation
- **SQL Injection Prevention:** Parameterized queries and ORM usage
- **XSS Prevention:** Output encoding and Content Security Policy

---

## 12. DEPLOYMENT & DEVOPS

### 12.1 Environment Configuration

#### 12.1.1 Configuration Management
- **Environment Variables:** Comprehensive `.env.development` configuration
- **Configuration Validation:** Pydantic settings with validation
- **Secrets Management:** Secure handling of API keys and tokens
- **Feature Flags:** Runtime feature toggle capabilities

#### 12.1.2 Database Management
- **Migrations:** Alembic database version control
- **Seeding:** Development and testing data management
- **Backup Strategy:** Automated database backup and recovery
- **Performance Monitoring:** Database performance tracking and alerts

---

## 13. IMPLEMENTATION PRIORITIES

### 13.1 Phase 1 - Database Integration (IMMEDIATE)
1. **Database Setup:** PostgreSQL connection and configuration
2. **Model Migration:** Convert from in-memory to SQLAlchemy models
3. **Multi-phone Schema:** Implement 3-phone database structure
4. **Basic CRUD:** Lead and campaign management APIs
5. **Authentication:** JWT-based user authentication

### 13.2 Phase 2 - Core Messaging Features
1. **Twilio Integration:** SMS sending and webhook processing
2. **Campaign Engine:** Campaign creation and execution
3. **Compliance Engine:** TCPA compliance automation
4. **Real-time Updates:** WebSocket implementation

### 13.3 Phase 3 - Advanced Features
1. **Background Processing:** Celery task implementation
2. **Analytics Engine:** Comprehensive reporting and metrics
3. **Import/Export:** Enhanced data management features
4. **Performance Optimization:** Caching and query optimization

---

## 14. SUCCESS CRITERIA

### 14.1 Technical Requirements
- **Database Performance:** < 100ms average query response time
- **API Performance:** < 200ms average API response time
- **SMS Delivery:** > 95% successful delivery rate
- **Uptime:** 99.9% system availability
- **Security:** Zero critical security vulnerabilities

### 14.2 Functional Requirements
- **Multi-phone Support:** Complete 3-phone lead management
- **TCPA Compliance:** 100% automated compliance checking
- **Real-time Updates:** < 1 second WebSocket message delivery
- **Data Import:** Support for files up to 100,000 leads
- **Campaign Management:** Concurrent campaign execution support

---

**Document Status:** ✅ READY FOR IMPLEMENTATION  
**Next Steps:** Database connection setup and model migration  
**Dependencies:** PostgreSQL database credentials and .env configuration