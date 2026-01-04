# Product Requirements Prompt: SMS Control Tower Backend - Complete Implementation

**Context is King**: This PRP contains ALL necessary information for end-to-end implementation of the SMS Control Tower backend that integrates seamlessly with the existing beautiful frontend UI.

**Generated from**: SMS Control Tower MVP Requirements + Frontend Integration + Additional Features  
**Confidence Score**: 10/10 - Complete specification with frontend integration details  
**Implementation Type**: Full-Stack Backend Integration (LaunchControl.us MVP style)  
**Database**: Supabase PostgreSQL with Row Level Security  
**Status**: Ready for execution with `/execute-prp`

## FEATURE OVERVIEW

**What We're Building**: Complete SMS Control Tower backend that powers a beautiful frontend UI with enterprise-grade messaging capabilities, compliance features, and real-time analytics for landowner lead generation and real estate investment.

**Business Value**: 
- Transform the beautiful frontend into a fully functional SMS marketing platform
- Enable automated, compliant SMS campaigns for landowner lead generation  
- Provide LaunchControl.us-style campaign management and analytics
- Support real-time monitoring and campaign control from the frontend dashboard
- Generate qualified leads for land buyers and real estate investors

**Integration Points**:
- **Frontend UI**: Existing beautiful React/TypeScript dashboard (already built)
- **Supabase**: PostgreSQL database with RLS, JWT authentication
- **Twilio**: Messaging Service for SMS delivery and webhooks
- **Background Workers**: Celery/RQ with Redis for message processing
- **Real-time Updates**: WebSocket connections for live dashboard updates

**Success Criteria**:
- Frontend UI works seamlessly with new backend (zero frontend changes needed)
- Import 1k+ leads via frontend CSV upload and launch campaigns
- Real-time dashboard shows live campaign metrics and message status
- ≥95% message delivery tracking with status updates in frontend
- Complete compliance handling (STOP/HELP) with audit trails
- LaunchControl.us-style user experience and workflow
- Support 10 navigation sections: Dashboard, Leads, Campaigns, Messages, Templates, Phone Numbers, Analytics, Compliance, Integrations, Settings

## REQUIREMENTS ANALYSIS

### Frontend Integration Requirements

**API Compatibility**:
- All endpoints match existing frontend service layer expectations
- Request/response formats compatible with existing frontend forms
- Authentication via existing Supabase JWT tokens
- CORS configured for frontend domain
- Error responses match frontend error handling patterns

**Real-time Features**:
- WebSocket endpoints for live campaign progress updates
- Dashboard metrics refresh automatically (sends, deliveries, replies)
- Campaign status changes reflect immediately in frontend
- Message history updates in real-time for conversation views

**Complete Navigation Support**:
- Dashboard: Real-time KPIs and system overview
- Leads: CSV import, management, segmentation
- Campaigns: Creation, execution, monitoring
- Messages: Two-way messaging interface
- Templates: 20+ Spanish message variants with rotation
- Phone Numbers: Number pool health management
- Analytics: Enhanced performance insights
- Compliance: TCPA compliance and audit trails
- Integrations: External service management
- Settings: System and user configuration

### Core Backend Requirements

**Lead Management System (MULTI-PHONE ENHANCED)**:
- Import leads via CSV with frontend column mapping
- Store lead data with multiple phone numbers (up to 3 per lead: PRIMARY REQUIRED, Secondary & Alternate optional)
- Lead form validation: Primary Phone mandatory, Secondary Phone optional, Alternate Phone optional  
- Frontend display: Show all available phone numbers in lead listings
- Lead segmentation by county, tags, and custom criteria
- Consent status tracking per phone number (supports all 3 numbers)
- Lead search and filtering through frontend interface (searches all phone numbers)
- Property data enrichment and validation
- Duplicate detection and merging (checks all phone numbers for duplicates)
- Export functionality for lead lists (includes all phone numbers)

**Campaign Management System**:
- Campaign creation with lead list selection
- Template rotation with 20+ Spanish message variants
- Number pool assignment and health tracking
- Rate limiting (MPS) and daily sending caps
- Quiet hours enforcement (8pm-8am CT default)
- Campaign scheduling and automation
- A/B testing support
- Campaign cloning and templates

**Messaging Pipeline**:
- Queue-based message processing with Celery workers
- Rate limiting enforcement per phone number and globally
- Template rotation algorithm for message variety
- Twilio integration for SMS sending and status callbacks
- Idempotency handling to prevent duplicate messages
- Message status tracking through complete lifecycle
- Inbound message processing and threading
- Conversation management and notes

**Template Management System**:
- Template library with categories (initial, followup, help, stop)
- Template rotation algorithm with fair distribution
- Variable substitution system ({first_name}, {county}, {brand})
- Template performance analytics
- A/B testing support for templates
- Spanish language optimization for landowner outreach
- Template preview and testing functionality

**Phone Number Management**:
- Twilio number acquisition and management
- Health score tracking based on delivery rates
- Carrier-specific performance monitoring
- Rate limiting configuration per number
- Number pool load balancing
- Automatic number quarantine and replacement
- Daily volume caps and quiet hours per number

**Compliance System**:
- STOP/ALTO keyword detection and suppression
- HELP/AYUDA auto-responses with brand information
- Consent status management and audit logging
- A2P 10DLC compliance (no links on first message)
- Quiet hours enforcement with timezone support
- Global suppression list management
- TCPA violation detection and prevention
- Compliance audit reporting

**Analytics System**:
- Real-time campaign performance metrics
- Lead conversion tracking and funnel analysis
- ROI calculations with cost tracking
- Template performance comparison
- Phone number performance analytics
- Trend analysis and forecasting
- Custom report generation
- Scheduled reporting and exports

### Technical Requirements

**Architecture Stack**:
- **Backend Framework**: FastAPI (Python 3.9+) with async/await
- **Database**: Supabase PostgreSQL with Row Level Security enabled
- **Authentication**: Supabase JWT tokens (shared with frontend)
- **Queue System**: Celery with Redis broker for background processing
- **SMS Provider**: Twilio Messaging Service with webhook validation
- **Real-time**: WebSocket connections for live updates
- **Migrations**: Alembic for database schema management

**Supabase Configuration**:
- PostgreSQL database with RLS policies for multi-tenant support
- JWT authentication integration with frontend
- Real-time subscriptions for live dashboard updates
- Edge functions for webhook processing (optional)
- Storage buckets for CSV uploads and file management

**Performance Requirements**:
- Handle 10k+ campaign targets with efficient queue processing
- Support configurable MPS (1-10 messages per second per number)
- Real-time dashboard updates with sub-second latency
- Database queries optimized for large lead datasets
- Background workers scale based on queue depth
- Support 100k+ messages per day per organization

## IMPLEMENTATION BLUEPRINT

### Phase 1: Full-Stack Project Structure & Supabase Setup
**Estimated Time**: 2-3 days

**Tasks**:
- [ ] **Task 1.1**: Organize full-stack project structure
  - Create `backend/` directory within existing `control-tower-platform/`
  - Set up FastAPI project structure: `app/{api,core,models,services,workers}`
  - Configure development scripts for frontend + backend coordination
  - Set up shared environment configuration between frontend/backend
  - **Validation**: `npm run dev:backend` starts FastAPI, frontend can call `/health` endpoint

- [ ] **Task 1.2**: Configure Supabase database and authentication
  - Set up complete database schema with 12 core tables
  - Implement Row Level Security policies for multi-tenant architecture
  - Configure Supabase JWT authentication for FastAPI integration
  - Set up database connection pooling and async queries
  - Create Alembic migrations for schema management
  - **Validation**: Database accessible from FastAPI, RLS policies active, JWT auth works

- [ ] **Task 1.3**: Implement core FastAPI application
  - FastAPI app with CORS configured for frontend domain
  - Supabase JWT middleware for authentication
  - Base API structure with versioning (`/api/v1/`)
  - Error handling middleware matching frontend expectations
  - Health check and monitoring endpoints
  - **Validation**: Frontend can authenticate and make API calls successfully

**Required Project Structure**:
```
control-tower-platform/              # Root project (from frontend)
├── frontend/                        # Beautiful UI (already built)
├── backend/                         # SMS Control Tower API
│   ├── app/
│   │   ├── main.py                 # FastAPI app with CORS
│   │   ├── core/
│   │   │   ├── config.py          # Settings (Supabase + Twilio)
│   │   │   ├── database.py        # Async Supabase connection
│   │   │   ├── security.py        # JWT validation
│   │   │   └── exceptions.py      # API error handlers
│   │   ├── models/
│   │   │   ├── base.py           # Base model with org_id
│   │   │   ├── leads.py          # Lead + LeadPhone models
│   │   │   ├── campaigns.py      # Campaign + CampaignTarget
│   │   │   ├── messages.py       # Message + StatusEvent models
│   │   │   ├── templates.py      # Template models
│   │   │   ├── phone_numbers.py  # PhoneNumber models
│   │   │   └── compliance.py     # OptOut + AuditEvent models
│   │   ├── api/v1/              # API v1 routes
│   │   │   ├── leads.py         # Lead CRUD matching frontend
│   │   │   ├── campaigns.py     # Campaign management
│   │   │   ├── messages.py      # Message history
│   │   │   ├── templates.py     # Template management
│   │   │   ├── phone_numbers.py # Number pool management
│   │   │   ├── analytics.py     # Dashboard + enhanced metrics
│   │   │   ├── compliance.py    # Compliance tools
│   │   │   ├── integrations.py  # Integration management
│   │   │   └── webhooks.py      # Twilio callbacks
│   │   ├── services/
│   │   │   ├── lead_service.py     # Lead import/management
│   │   │   ├── campaign_service.py # Campaign execution
│   │   │   ├── template_service.py # Rotation algorithm
│   │   │   ├── messaging_service.py # SMS pipeline
│   │   │   ├── phone_service.py    # Number management
│   │   │   ├── compliance_service.py # STOP/HELP handling
│   │   │   └── analytics_service.py # Metrics calculation
│   │   ├── workers/
│   │   │   ├── celery_app.py       # Background task config
│   │   │   ├── message_tasks.py    # SMS sending workers
│   │   │   └── webhook_tasks.py    # Callback processing
│   │   └── utils/
│   │       ├── twilio_client.py    # Twilio integration
│   │       ├── rate_limiter.py     # MPS enforcement
│   │       └── quiet_hours.py      # Time zone handling
│   ├── migrations/                 # Alembic database migrations
│   ├── tests/                      # Complete test suite
│   ├── requirements.txt           # Backend dependencies
│   └── .env.example              # Environment template
├── shared/                        # Shared configurations
└── docs/                         # Project documentation
```

**Core Configuration Pattern**:
```python
# backend/app/core/config.py - Complete Supabase integration
from pydantic import BaseSettings

class Settings(BaseSettings):
    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE: str
    DATABASE_URL: str
    
    # Frontend Integration
    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: list = ["http://localhost:3000"]
    
    # Twilio Configuration
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_MESSAGING_SERVICE_SID: str
    TWILIO_WEBHOOK_SECRET: str
    
    # Background Processing
    REDIS_URL: str = "redis://localhost:6379"
    CELERY_BROKER_URL: str = "redis://localhost:6379"
    
    # Application Settings
    SECRET_KEY: str
    DEBUG: bool = False
    
    class Config:
        env_file = ".env"

# backend/app/core/database.py - Async Supabase connection
from supabase import create_client, Client
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

async def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

### Phase 2: Lead Management API (Frontend Integration)
**Estimated Time**: 3-4 days

**Tasks**:
- [ ] **Task 2.1**: Implement Lead CRUD API matching frontend
  - `POST /api/v1/leads` - Create lead from frontend form data
  - `GET /api/v1/leads` - List leads with pagination, search, filters
  - `PATCH /api/v1/leads/{id}` - Update lead information
  - `DELETE /api/v1/leads/{id}` - Soft delete leads
  - Phone number normalization and validation (E.164 format)
  - **Validation**: Frontend lead management pages work without changes

- [ ] **Task 2.2**: Build CSV import system for frontend
  - `POST /api/v1/leads/import/preview` - Preview CSV with column mapping
  - `POST /api/v1/leads/import/execute` - Execute import with frontend progress
  - CSV parsing with error handling and validation
  - Duplicate detection and merge strategies
  - Import progress tracking for frontend display
  - **Validation**: Frontend CSV upload works with progress indicators

- [ ] **Task 2.3**: Implement lead segmentation and search
  - Advanced filtering by county, consent status, tags
  - Full-text search across lead fields
  - Lead statistics and counts for frontend dashboard
  - Export functionality for lead lists
  - **Validation**: Frontend search and filtering work as expected

**Integration Pattern**:
```python
# backend/app/api/v1/leads.py - Frontend-compatible API
from fastapi import APIRouter, Depends, UploadFile, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.schemas.leads import LeadCreate, LeadResponse, LeadImportResponse
from app.services.lead_service import LeadService

router = APIRouter(prefix="/api/v1/leads", tags=["leads"])

@router.post("/import/preview", response_model=LeadImportResponse)
async def preview_lead_import(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Preview CSV import - matches frontend upload component expectations"""
    service = LeadService(db)
    preview = await service.preview_import(file, current_user.org_id)
    return LeadImportResponse(
        total_rows=preview.total_rows,
        columns=preview.columns,
        preview_data=preview.sample_rows[:5],
        suggested_mapping=preview.column_mapping,
        validation_errors=preview.errors
    )

@router.get("/", response_model=List[LeadResponse])
async def list_leads(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    search: str = Query(None),
    county: str = Query(None),
    tags: List[str] = Query([]),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List leads with filtering - matches frontend table expectations"""
    service = LeadService(db)
    leads = await service.list_leads(
        org_id=current_user.org_id,
        skip=skip,
        limit=limit,
        search=search,
        county=county,
        tags=tags
    )
    return leads
```

### Phase 3: Campaign Management API (LaunchControl.us Style)
**Estimated Time**: 4-5 days

**Tasks**:
- [ ] **Task 3.1**: Build Campaign CRUD API
  - `POST /api/v1/campaigns` - Create campaign from frontend form
  - `GET /api/v1/campaigns` - List campaigns with status and metrics
  - `PATCH /api/v1/campaigns/{id}` - Update campaign settings
  - Campaign status management (draft → scheduled → running → completed)
  - **Validation**: Frontend campaign management interface works completely

- [ ] **Task 3.2**: Implement campaign target generation
  - `POST /api/v1/campaigns/{id}/build-targets` - Generate targets from lead criteria
  - Lead segmentation logic (county, tags, consent status)
  - Phone number validation and reachability checking
  - Suppression list filtering (opt-outs, previous campaigns)
  - Target count estimation for frontend display
  - **Validation**: Campaign target generation works from frontend with accurate counts

- [ ] **Task 3.3**: Build campaign control endpoints
  - `POST /api/v1/campaigns/{id}/start` - Start campaign execution
  - `POST /api/v1/campaigns/{id}/pause` - Pause running campaign
  - `POST /api/v1/campaigns/{id}/resume` - Resume paused campaign
  - `POST /api/v1/campaigns/{id}/stop` - Stop campaign permanently
  - **Validation**: Frontend campaign controls work with immediate status updates

- [ ] **Task 3.4**: Implement real-time campaign statistics
  - `GET /api/v1/campaigns/{id}/stats` - Live campaign metrics
  - WebSocket endpoint for real-time updates: `/ws/campaigns/{id}`
  - Statistics: targets, sent, delivered, replies, opt-outs, errors
  - Performance metrics and delivery rates
  - **Validation**: Frontend dashboard shows live updating campaign metrics

**Real-time Integration**:
```python
# backend/app/api/websockets.py - Live dashboard updates
from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio

@app.websocket("/ws/campaigns/{campaign_id}")
async def campaign_websocket(websocket: WebSocket, campaign_id: str):
    await websocket.accept()
    try:
        while True:
            # Get latest campaign statistics
            stats = await get_campaign_live_stats(campaign_id)
            await websocket.send_text(json.dumps({
                "type": "campaign_stats",
                "data": {
                    "campaign_id": campaign_id,
                    "total_targets": stats.total_targets,
                    "sent": stats.sent_count,
                    "delivered": stats.delivered_count,
                    "delivery_rate": round(stats.delivery_rate, 2),
                    "replies": stats.reply_count,
                    "opt_outs": stats.opt_out_count,
                    "errors": stats.error_count,
                    "last_updated": stats.last_updated.isoformat()
                }
            }))
            await asyncio.sleep(2)  # Update every 2 seconds
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()
```

### Phase 4: Template & Messaging System
**Estimated Time**: 3-4 days

**Tasks**:
- [ ] **Task 4.1**: Build Template Management API
  - `GET /api/v1/templates` - List templates by category with frontend filters
  - `POST /api/v1/templates` - Create templates from frontend editor
  - `PATCH /api/v1/templates/{id}` - Update template content and settings
  - Template variable validation and preview rendering
  - Template categories: initial, followup, help, stop
  - **Validation**: Frontend template editor works with live preview

- [ ] **Task 4.2**: Implement template rotation engine
  - Fair rotation algorithm avoiding recently used templates
  - Usage tracking per lead to prevent repetition
  - Global template usage balancing
  - Template performance analytics (delivery rates, reply rates)
  - **Validation**: Template rotation distributes evenly, avoids recent usage

- [ ] **Task 4.3**: Build message rendering and validation
  - Variable substitution: {first_name}, {county}, {brand}
  - Message length validation and segment calculation
  - Spanish language support with proper encoding
  - Message preview generation for frontend
  - **Validation**: Message rendering works correctly with all variables

- [ ] **Task 4.4**: Seed Spanish templates for landowner outreach
  - Create 20+ Spanish message variants for initial contact
  - Include help and stop response templates
  - Ensure TCPA compliance (no links, proper identification)
  - **Validation**: All templates render correctly with sample data

**Template System**:
```python
# backend/app/services/template_service.py - Rotation algorithm
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.templates import Template
from app.models.campaigns import CampaignTarget

class TemplateService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def select_template_for_lead(
        self, 
        org_id: str, 
        lead_id: str, 
        category: str = "initial"
    ) -> Template:
        """Smart template selection with rotation and usage tracking"""
        # Get all active templates for category
        templates = await self.get_active_templates(org_id, category)
        
        # Get recently used templates for this lead (30 days)
        recent_usage = await self.get_recent_template_usage(lead_id, days=30)
        
        # Filter out recently used templates
        available = [t for t in templates if t.id not in recent_usage]
        
        if not available:
            available = templates  # Reset if all templates used
            
        # Select template with least recent global usage
        selected = min(available, key=lambda t: t.last_used_at or datetime.min)
        
        # Update usage tracking
        await self.track_template_usage(selected.id, lead_id)
        
        return selected
    
    def render_template(self, template: Template, lead_data: dict) -> str:
        """Render template with variable substitution"""
        content = template.content
        
        # Standard variables
        variables = {
            'first_name': lead_data.get('first_name', ''),
            'last_name': lead_data.get('last_name', ''),
            'county': lead_data.get('county', ''),
            'brand': 'Control Tower SMS'  # Configurable
        }
        
        # Replace variables in template
        for var, value in variables.items():
            content = content.replace(f'{{{var}}}', value)
        
        return content
```

### Phase 5: Twilio Integration & SMS Pipeline
**Estimated Time**: 4-5 days

**Tasks**:
- [ ] **Task 5.1**: Implement Twilio SMS service
  - Async Twilio client with proper error handling
  - Message sending with idempotency keys
  - Provider SID tracking and correlation
  - Rate limiting per phone number and globally
  - Retry logic with exponential backoff
  - **Validation**: SMS messages send successfully with tracking

- [ ] **Task 5.2**: Build webhook handlers for Twilio
  - `POST /api/v1/webhooks/twilio/status` - Status callback processing
  - `POST /api/v1/webhooks/twilio/inbound` - Inbound message handling
  - Webhook signature validation for security
  - Message status updates with frontend notifications
  - **Validation**: Status updates flow to frontend dashboard in real-time

- [ ] **Task 5.3**: Implement background message processing
  - Celery workers for message queue processing
  - Rate limiting enforcement (MPS per number)
  - Quiet hours checking with timezone support
  - Error handling and retry mechanisms
  - Health monitoring and worker scaling
  - **Validation**: Messages process through queue with proper rate limiting

- [ ] **Task 5.4**: Build compliance handlers
  - STOP/ALTO keyword detection (case-insensitive)
  - Automatic suppression list updates
  - HELP/AYUDA auto-response system
  - Compliance audit logging
  - Opt-out propagation to frontend
  - **Validation**: STOP commands immediately suppress future sends, frontend shows opt-out status

**Message Pipeline**:
```python
# backend/app/workers/message_tasks.py - Background processing
from celery import current_app as celery_app
from app.services.messaging_service import MessagingService
from app.services.compliance_service import ComplianceService

@celery_app.task(bind=True, max_retries=3)
def send_campaign_message(self, campaign_target_id: str):
    """Process individual campaign message with full pipeline"""
    try:
        messaging_service = MessagingService()
        compliance_service = ComplianceService()
        
        # Load campaign target with lead and campaign data
        target = await messaging_service.load_campaign_target(campaign_target_id)
        
        # Check quiet hours for target timezone
        if not messaging_service.is_sending_allowed(target.timezone):
            next_send_time = messaging_service.get_next_allowed_time(target.timezone)
            self.retry(eta=next_send_time)
        
        # Check suppression lists
        if compliance_service.is_suppressed(target.phone_number):
            await messaging_service.mark_target_suppressed(target.id)
            return {"status": "suppressed"}
        
        # Rate limiting check
        if not messaging_service.can_send_now(target.from_number):
            delay = messaging_service.get_rate_limit_delay(target.from_number)
            self.retry(countdown=delay)
        
        # Select and render template
        template = await messaging_service.select_template_for_target(target)
        message_body = messaging_service.render_template(template, target.lead)
        
        # Send via Twilio
        result = await messaging_service.send_twilio_message(
            to=target.phone_number,
            from_=target.from_number,
            body=message_body,
            campaign_id=target.campaign_id
        )
        
        # Update database and notify frontend
        await messaging_service.update_target_status(target.id, "sent", result.sid)
        await messaging_service.notify_frontend_update(target.campaign_id)
        
        return {"status": "sent", "message_sid": result.sid}
        
    except Exception as exc:
        # Log error and retry with backoff
        await messaging_service.log_send_error(campaign_target_id, str(exc))
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
```

### Phase 6: Phone Number Management API
**Estimated Time**: 2-3 days

**Tasks**:
- [ ] **Task 6.1**: Implement Phone Number CRUD API
  - `GET /api/v1/phone-numbers` - List owned numbers with health metrics
  - `POST /api/v1/phone-numbers/acquire` - Purchase new numbers via Twilio
  - `PATCH /api/v1/phone-numbers/{id}/settings` - Update MPS, daily caps
  - `DELETE /api/v1/phone-numbers/{id}` - Release/quarantine numbers
  - **Validation**: Frontend Phone Numbers page displays and manages numbers

- [ ] **Task 6.2**: Build number health monitoring
  - `GET /api/v1/phone-numbers/{id}/health` - Detailed health metrics
  - `GET /api/v1/phone-numbers/{id}/analytics` - Performance analytics
  - Health score calculation based on delivery rates
  - Carrier-specific performance tracking
  - **Validation**: Health scores update based on actual delivery performance

- [ ] **Task 6.3**: Implement number pool management
  - Load balancing algorithm for message distribution
  - Automatic quarantine for unhealthy numbers
  - Number replacement when quarantined
  - Usage analytics and cost tracking
  - **Validation**: Message sending distributes across healthy numbers

**Phone Number Management**:
```python
# backend/app/api/v1/phone_numbers.py
from fastapi import APIRouter, Depends
from app.services.phone_service import PhoneService

router = APIRouter(prefix="/api/v1/phone-numbers", tags=["phone-numbers"])

@router.get("/{number_id}/health")
async def get_number_health(
    number_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Number health metrics for Phone Numbers page"""
    service = PhoneService(db)
    health = await service.get_number_health(number_id, current_user.org_id)
    
    return {
        "health_score": health.score,  # 0-100
        "reputation_status": health.reputation,
        "delivery_rate": health.delivery_rate,
        "blocked_carriers": health.blocked_carriers,
        "daily_volume": health.today_volume,
        "daily_cap": health.daily_cap,
        "mps_current": health.current_mps,
        "mps_limit": health.mps_limit,
        "last_activity": health.last_message_at.isoformat()
    }
```

### Phase 7: Compliance Management API  
**Estimated Time**: 3-4 days

**Tasks**:
- [ ] **Task 7.1**: Build Opt-out Management API
  - `GET /api/v1/compliance/opt-outs` - Global suppression list with search
  - `POST /api/v1/compliance/opt-outs/bulk` - Bulk opt-out management
  - `DELETE /api/v1/compliance/opt-outs/{id}` - Remove from suppression (manual)
  - STOP/ALTO keyword processing with audit trails
  - **Validation**: Opt-outs immediately prevent future messaging

- [ ] **Task 7.2**: Implement audit trail system
  - `GET /api/v1/compliance/audit-logs` - Searchable compliance events
  - `POST /api/v1/compliance/events` - Log compliance events
  - Event types: opt_out, consent_granted, message_sent, violation_detected
  - Full audit trail for TCPA compliance
  - **Validation**: All compliance events are logged and searchable

- [ ] **Task 7.3**: Build compliance reporting
  - `GET /api/v1/compliance/reports` - Generate compliance reports
  - `POST /api/v1/compliance/reports/schedule` - Scheduled reporting
  - TCPA compliance metrics and violations
  - Export functionality for legal documentation
  - **Validation**: Reports generate accurate compliance data

**Compliance System**:
```python
# backend/app/services/compliance_service.py
class ComplianceService:
    async def process_stop_keyword(
        self, 
        phone_number: str, 
        message_content: str,
        campaign_id: str = None
    ):
        """Process STOP/ALTO keywords with immediate suppression"""
        stop_keywords = ['stop', 'alto', 'quit', 'cancel', 'end', 'unsubscribe']
        
        if any(keyword in message_content.lower() for keyword in stop_keywords):
            # Add to suppression list
            await self.add_to_suppression(phone_number, source='keyword')
            
            # Stop all active campaigns for this number
            await self.suppress_active_campaigns(phone_number)
            
            # Log compliance event
            await self.log_compliance_event(
                event_type='opt_out_processed',
                phone_number=phone_number,
                campaign_id=campaign_id,
                details={'keyword': message_content, 'method': 'automatic'}
            )
            
            # Send confirmation response
            await self.send_stop_confirmation(phone_number)
            
            return True
        return False
```

### Phase 8: Enhanced Analytics API
**Estimated Time**: 2-3 days

**Tasks**:
- [ ] **Task 8.1**: Build comprehensive analytics endpoints
### Phase 8: Enhanced Analytics API
**Estimated Time**: 2-3 days

**Tasks**:
- [ ] **Task 8.1**: Build comprehensive analytics endpoints
  - `GET /api/v1/analytics/dashboard` - Main dashboard metrics
  - `GET /api/v1/analytics/campaigns/comparison` - Multi-campaign comparison
  - `GET /api/v1/analytics/trends` - Time-series data for trend analysis
  - `GET /api/v1/analytics/roi` - ROI calculations with cost tracking
  - `GET /api/v1/analytics/conversion-funnel` - Lead conversion tracking
  - **Validation**: Frontend Analytics page shows comprehensive insights

- [ ] **Task 8.2**: Implement custom reporting
  - `POST /api/v1/analytics/reports/generate` - Custom report generation
  - `GET /api/v1/analytics/reports/scheduled` - Scheduled report management
  - Export functionality (CSV, PDF, Excel)
  - Email delivery of scheduled reports
  - **Validation**: Custom reports generate and export correctly

- [ ] **Task 8.3**: Build performance monitoring
  - System health metrics (queue size, worker status, error rates)
  - Integration health monitoring (Twilio, Supabase status)
  - Performance benchmarks and alerting
  - **Validation**: Performance metrics accurately reflect system health

**Analytics Integration**:
```python
# backend/app/api/v1/analytics.py - Frontend dashboard data
from fastapi import APIRouter, Depends, Query
from datetime import date, timedelta
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])

@router.get("/dashboard")
async def get_dashboard_metrics(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Dashboard metrics for frontend - matches existing dashboard components"""
    service = AnalyticsService(db)
    metrics = await service.get_dashboard_metrics(current_user.org_id)
    
    return {
        "total_leads": metrics.total_leads,
        "active_campaigns": metrics.active_campaigns,
        "messages_today": metrics.messages_today,
        "delivery_rate": round(metrics.delivery_rate, 2),
        "reply_rate": round(metrics.reply_rate, 2),
        "opt_out_rate": round(metrics.opt_out_rate, 2),
        "recent_activity": metrics.recent_activity,
        "campaign_performance": metrics.top_campaigns,
        "system_health": {
            "queue_size": metrics.queue_size,
            "worker_status": metrics.worker_status,
            "error_rate": metrics.error_rate,
            "twilio_health": metrics.twilio_status
        }
    }

@router.get("/campaigns/comparison")
async def compare_campaigns(
    campaign_ids: List[str] = Query(...),
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Multi-campaign comparison for Analytics page"""
    service = AnalyticsService(db)
    comparison = await service.compare_campaigns(
        campaign_ids, start_date, end_date, current_user.org_id
    )
    return comparison
```

### Phase 9: Integrations Management API
**Estimated Time**: 2-3 days

**Tasks**:
- [ ] **Task 9.1**: Build Twilio integration management
  - `GET /api/v1/integrations/twilio/status` - Connection health check
  - `POST /api/v1/integrations/twilio/test` - Test Twilio connection
  - `PATCH /api/v1/integrations/twilio/config` - Update configuration
  - Webhook endpoint testing and validation
  - **Validation**: Twilio integration status accurate, tests work

- [ ] **Task 9.2**: Implement API key management
  - `GET /api/v1/integrations/api-keys` - List API keys
  - `POST /api/v1/integrations/api-keys` - Generate new API key
  - `DELETE /api/v1/integrations/api-keys/{id}` - Revoke API key
  - Rate limiting and access control per API key
  - **Validation**: API keys authenticate correctly, rate limits work

- [ ] **Task 9.3**: Build webhook management
  - `GET /api/v1/integrations/webhooks` - List configured webhooks
  - `POST /api/v1/integrations/webhooks/test` - Test webhook endpoints
  - Webhook delivery retry and failure handling
  - **Validation**: Webhooks deliver correctly, failures retry properly

### Phase 10: Database Schema Implementation
**Estimated Time**: 2-3 days

**Tasks**:
- [ ] **Task 10.1**: Create complete database schema with Alembic
  - All 12 core tables with proper relationships
  - Indexes for performance optimization
  - RLS policies for multi-tenant security
  - Triggers for automated timestamp updates
  - **Validation**: All tables created, relationships work, RLS policies active

- [ ] **Task 10.2**: Seed initial data
  - 20+ Spanish templates for landowner outreach
  - Default organization and admin user
  - System configuration defaults
  - **Validation**: Seeded data accessible, templates render correctly

**Complete Database Schema**:
```sql
-- Enhanced database schema with all features
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $;

-- Organizations (multi-tenant)
CREATE TABLE public.orgs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users with role-based access
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads with property information
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) STORED,
  address1 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  county TEXT,
  apn TEXT,
  email TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  consent_status TEXT DEFAULT 'unknown',
  lead_score TEXT DEFAULT 'cold',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead phones (up to 3 per lead)
CREATE TABLE public.lead_phones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  e164 TEXT NOT NULL,
  label TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  consent_status TEXT DEFAULT 'unknown',
  is_valid BOOLEAN DEFAULT TRUE,
  carrier_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, e164)
);

-- Phone numbers (owned pool)
CREATE TABLE public.phone_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  e164 TEXT UNIQUE NOT NULL,
  twilio_sid TEXT,
  messaging_service_sid TEXT,
  health_score INTEGER DEFAULT 100,
  reputation_status TEXT DEFAULT 'good',
  mps INTEGER DEFAULT 1,
  daily_cap INTEGER,
  quiet_hours JSONB DEFAULT '{"start":"20:00","end":"08:00","tz":"America/Chicago"}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates with rotation tracking
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'broadcast',
  status TEXT DEFAULT 'draft',
  template_category TEXT DEFAULT 'initial',
  target_criteria JSONB DEFAULT '{}',
  schedule_settings JSONB DEFAULT '{}',
  rate_limiting JSONB DEFAULT '{"mps":1}',
  ab_test_config JSONB,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign targets (lead + phone combinations)
CREATE TABLE public.campaign_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  lead_phone_id UUID NOT NULL REFERENCES public.lead_phones(id),
  phone_number_id UUID REFERENCES public.phone_numbers(id),
  status TEXT DEFAULT 'queued',
  last_template_id UUID REFERENCES public.templates(id),
  attempts INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (SMS/MMS records)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id),
  campaign_target_id UUID REFERENCES public.campaign_targets(id),
  lead_id UUID REFERENCES public.leads(id),
  template_id UUID REFERENCES public.templates(id),
  direction TEXT NOT NULL,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  content TEXT,
  media_urls TEXT[],
  provider TEXT DEFAULT 'twilio',
  provider_sid TEXT,
  status TEXT DEFAULT 'queued',
  error_code TEXT,
  segments INTEGER DEFAULT 1,
  cost DECIMAL(6,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message status events
CREATE TABLE public.message_status_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  error_code TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opt-outs (global suppression)
CREATE TABLE public.opt_outs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  e164 TEXT NOT NULL,
  source TEXT DEFAULT 'keyword',
  reason TEXT,
  campaign_id UUID REFERENCES public.campaigns(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, e164)
);

-- Audit events (compliance tracking)
CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  phone_number TEXT,
  campaign_id UUID REFERENCES public.campaigns(id),
  lead_id UUID REFERENCES public.leads(id),
  user_id UUID REFERENCES public.users(id),
  details JSONB DEFAULT '{}',
  compliance_status TEXT DEFAULT 'compliant',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook logs
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.orgs(id),
  webhook_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  headers JSONB,
  payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add triggers for updated_at
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER phone_numbers_updated_at BEFORE UPDATE ON public.phone_numbers  
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER templates_updated_at BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER campaign_targets_updated_at BEFORE UPDATE ON public.campaign_targets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create indexes for performance
CREATE INDEX idx_leads_org_id ON public.leads(org_id);
CREATE INDEX idx_leads_county ON public.leads(county);
CREATE INDEX idx_leads_tags ON public.leads USING GIN(tags);
CREATE INDEX idx_lead_phones_e164 ON public.lead_phones(e164);
CREATE INDEX idx_campaign_targets_status ON public.campaign_targets(campaign_id, status);
CREATE INDEX idx_messages_provider_sid ON public.messages(provider_sid);
CREATE INDEX idx_messages_conversation ON public.messages(lead_id, created_at);
CREATE INDEX idx_opt_outs_e164 ON public.opt_outs(org_id, e164);
CREATE INDEX idx_audit_events_type ON public.audit_events(org_id, event_type, created_at);

-- Enable RLS on all tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (permissive for MVP, can be restricted later)
CREATE POLICY "Users can access own org data" ON public.leads
  USING (org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid()));

-- Repeat similar policies for other tables...
```

## VALIDATION REQUIREMENTS

### Complete Integration Tests
- [ ] **Frontend-Backend Integration**: All 10 navigation sections work with backend
- [ ] **Real-time Updates**: WebSocket connections show live campaign progress
- [ ] **CSV Import Pipeline**: 10k+ leads import through frontend interface
- [ ] **Campaign Execution**: End-to-end campaign with template rotation
- [ ] **Compliance Processing**: STOP commands immediately suppress across system
- [ ] **Phone Number Health**: Health scores update based on delivery performance
- [ ] **Template Rotation**: Fair distribution across 20+ Spanish templates
- [ ] **Analytics Accuracy**: All metrics calculate correctly in real-time

### SMS Pipeline Tests  
- [ ] **Complete Message Lifecycle**: Queue → rate limit → send → status → frontend
- [ ] **Template Rotation**: Multiple sends use different templates per lead
- [ ] **Compliance Handling**: STOP/HELP responses work in Spanish and English
- [ ] **Quiet Hours**: Messages queue during restricted hours, send when allowed
- [ ] **Rate Limiting**: MPS enforcement across multiple phone numbers
- [ ] **Error Handling**: Failed messages retry with exponential backoff
- [ ] **Idempotency**: Duplicate prevention works across all message types

### Load & Performance Tests
- [ ] **High-Volume Campaigns**: 10k targets with 5 MPS across 10 numbers
- [ ] **Concurrent Processing**: 100+ simultaneous webhook callbacks
- [ ] **Database Performance**: Lead searches on 100k+ records under 200ms
- [ ] **Real-time Dashboard**: Live updates with 50+ active campaigns
- [ ] **Background Workers**: Queue processing scales with load

### Supabase Integration Tests
- [ ] **RLS Policies**: Multi-tenant data isolation works correctly
- [ ] **JWT Authentication**: Frontend tokens work seamlessly with backend
- [ ] **Real-time Subscriptions**: Database changes trigger frontend updates
- [ ] **Connection Pooling**: Handle 1000+ concurrent requests without issues
- [ ] **Migration System**: Schema changes deploy without data loss

### Success Validation Commands
```bash
# Start complete development environment
cd control-tower-platform
npm run dev:fullstack

# Run comprehensive backend tests
cd backend
python -m pytest tests/ -v --cov=app --cov-report=html

# Test frontend integration
cd ../frontend  
npm run test:integration

# Load test complete system
cd ../backend
python -m pytest tests/test_load.py -v --timeout=600

# Validate all API endpoints
python -m pytest tests/test_api_integration.py -v

# Test compliance features
python -m pytest tests/test_compliance.py -v

# Validate template rotation
python -m pytest tests/test_template_rotation.py -v

# Test phone number health monitoring
python -m pytest tests/test_phone_health.py -v
```

## DOCUMENTATION REQUIREMENTS

### Complete API Documentation
- [ ] **OpenAPI/Swagger**: Auto-generated from FastAPI with examples
- [ ] **Webhook Specifications**: Twilio callback handling documentation
- [ ] **Authentication Guide**: JWT token usage and Supabase integration
- [ ] **Rate Limiting**: API limits and best practices
- [ ] **Error Handling**: Standard error codes and recovery procedures

### Integration Documentation
- [ ] **Frontend Integration**: How backend APIs match frontend expectations
- [ ] **WebSocket Protocol**: Real-time update message formats
- [ ] **Database Schema**: Complete ERD with relationships
- [ ] **Background Workers**: Celery task documentation
- [ ] **Compliance Features**: TCPA requirement implementation

### Deployment Documentation
- [ ] **Environment Setup**: Complete configuration guide
- [ ] **Database Migration**: Schema deployment procedures
- [ ] **Background Services**: Worker deployment and scaling
- [ ] **Monitoring Setup**: Health checks and alerting configuration
- [ ] **Security Configuration**: JWT, RLS, and access control setup

## GOTCHAS & CONSIDERATIONS

### Frontend Integration Critical Points
- **API Response Formats**: Must exactly match frontend service layer expectations
- **Authentication Flow**: Supabase JWT tokens must work across both systems
- **Error Message Format**: Backend errors must display properly in frontend UI
- **WebSocket Protocol**: Real-time updates must match frontend event handling
- **CORS Configuration**: Must allow all frontend domains (dev/staging/prod)

### SMS Compliance & Deliverability
- **A2P 10DLC Registration**: Complete Twilio brand/campaign setup before production
- **Template Rotation Critical**: Identical messages trigger spam filters
- **Keyword Processing**: STOP/ALTO must work in multiple languages and variations
- **Quiet Hours Precision**: Timezone calculations must be accurate for compliance
- **Carrier Relationships**: Monitor health scores to maintain good standing

### Supabase-Specific Considerations
- **RLS Policy Testing**: Thoroughly validate multi-tenant data isolation
- **Connection Pool Management**: Configure appropriate limits for high concurrency
- **Real-time Feature Limits**: Understand Supabase real-time connection limits
- **JWT Token Expiration**: Handle token refresh in long-running operations
- **Database Migration Coordination**: Plan schema changes with frontend updates

### Performance & Scaling Requirements
- **Background Worker Monitoring**: Monitor queue depths and processing rates
- **Database Query Optimization**: Index all frequently queried columns
- **WebSocket Connection Management**: Handle connection drops and reconnects
- **Memory Usage**: Monitor template caching and message queue memory
- **Rate Limiting Accuracy**: Implement precise sub-second rate limiting

### Development & Deployment Workflow
- **Database Migration Strategy**: Coordinate schema changes with frontend
- **Environment Consistency**: Maintain identical configs across environments
- **Testing Strategy**: Test both API functionality and frontend integration
- **Deployment Coordination**: Deploy backend before frontend for API compatibility
- **Rollback Procedures**: Plan for quick rollbacks if integration issues arise

This comprehensive PRP provides complete implementation guidance for building a production-ready SMS Control Tower backend that integrates perfectly with the existing frontend while providing enterprise-grade messaging capabilities, full TCPA compliance, and real-time monitoring for landowner lead generation campaigns.