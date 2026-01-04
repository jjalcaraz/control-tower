# SMS Control Tower Frontend - Complete Implementation PRP

**Context is King**: This PRP contains ALL necessary information for end-to-end implementation of the complete SMS Control Tower frontend system with all 10 navigation sections.

**Generated from**: Original SMS Frontend PRP + Additional Features + LaunchControl.us Integration  
**Confidence Score**: 10/10 - Complete specification with backend integration details  
**Implementation Type**: Complete Frontend Implementation (LaunchControl.us MVP style)  
**Framework**: React 18 + TypeScript + Tailwind CSS + Shadcn/ui  
**Status**: Ready for execution with `/execute-prp`

## FEATURE OVERVIEW

**What We're Building**: Complete SMS Control Tower frontend that provides a beautiful, functional interface for landowner lead generation and SMS marketing campaigns with 10 comprehensive navigation sections.

**Business Value**:
- Complete SMS marketing platform interface for land buyers and real estate investors
- LaunchControl.us-style user experience and workflow
- Comprehensive lead management with CSV import/export
- Real-time campaign monitoring and control
- Full TCPA compliance interface with audit trails
- Advanced analytics and reporting dashboards
- Professional interface matching enterprise SMS platforms

**Integration Points**:
- **Backend API**: Complete REST API with WebSocket real-time updates
- **Authentication**: Supabase JWT integration
- **File Uploads**: CSV import with progress tracking
- **Real-time**: WebSocket connections for live dashboard updates
- **External Services**: Twilio integration status and management

**Success Criteria**:
- All 10 navigation sections fully functional and beautiful
- Real-time dashboard updates without page refresh
- CSV import handles 10k+ leads with progress indication
- Campaign creation and monitoring works end-to-end
- Template management supports 20+ Spanish variants
- Phone number health monitoring with visual indicators
- Compliance interface ensures TCPA adherence
- Analytics provide actionable business insights
- Mobile-responsive design works on all devices

## COMPLETE NAVIGATION STRUCTURE

```
SMS Control Tower Platform
├── 📊 Dashboard           # Real-time KPIs and system overview
├── 👥 Leads              # Lead management with CSV import/export
├── 📢 Campaigns          # Campaign creation, execution, monitoring
├── 💬 Messages           # Two-way messaging interface
├── 📝 Templates          # Template management with rotation
├── 📱 Phone Numbers      # Number pool health management
├── 📈 Analytics          # Enhanced performance insights
├── ⚖️ Compliance         # TCPA compliance and audit trails
├── 🔗 Integrations       # External service management
└── ⚙️ Settings           # System and user configuration
```

## IMPLEMENTATION BLUEPRINT

### Phase 1: Core Foundation & Dashboard (Weeks 1-4)
**Priority**: Critical
**Dependencies**: None

#### Week 1-2: Project Setup & Authentication
**Tasks**:
- [ ] **Task 1.1**: Set up React 18 + TypeScript project structure
  - Modern React with Vite build system
  - TypeScript configuration with strict mode
  - Tailwind CSS + Shadcn/ui component library
  - ESLint, Prettier, and Vitest testing setup
  - **Validation**: `npm run dev` starts development server successfully

- [ ] **Task 1.2**: Implement authentication system
  - Supabase Auth integration with JWT tokens
  - Login/logout functionality with form validation
  - Protected route system with role-based access
  - Authentication state management with React context
  - User profile management interface
  - **Validation**: Users can login, access protected routes, logout successfully

- [ ] **Task 1.3**: Create core layout and navigation
  - Main layout component with sidebar navigation
  - Responsive design for desktop, tablet, mobile
  - Navigation with active state indicators
  - Breadcrumb system for deep navigation
  - **Validation**: Navigation works on all screen sizes, routes properly

#### Week 3-4: Dashboard Implementation
**Tasks**:
- [ ] **Task 1.4**: Build dashboard KPI widgets
  - Real-time metrics cards (leads, campaigns, messages, delivery rates)
  - Interactive charts for performance trends
  - Quick action buttons for common tasks
  - Recent activity feed with real-time updates
  - **Validation**: Dashboard displays live data from backend API

- [ ] **Task 1.5**: Implement real-time updates
  - WebSocket connection for live data
  - Automatic refresh of dashboard metrics
  - Real-time notifications for campaign status changes
  - **Validation**: Dashboard updates automatically without page refresh

**Dashboard Components**:
```typescript
// Dashboard KPI widgets and real-time updates
interface DashboardMetrics {
  totalLeads: number;
  activecampaigns: number;
  messagesToday: number;
  deliveryRate: number;
  replyRate: number;
  optOutRate: number;
}

interface DashboardProps {
  metrics: DashboardMetrics;
  isLoading: boolean;
}

export function DashboardPage({ metrics, isLoading }: DashboardProps) {
  const { data: liveMetrics } = useWebSocket('/ws/dashboard');
  
  return (
    <div className="space-y-6">
      <MetricsGrid metrics={liveMetrics || metrics} />
      <ActiveCampaignsTable />
      <RecentActivityFeed />
      <QuickActionsPanel />
    </div>
  );
}
```

### Phase 2: Lead Management (Weeks 5-8)
**Priority**: High
**Dependencies**: Phase 1 completed

#### Week 5-6: Lead CRUD Operations
**Tasks**:
- [ ] **Task 2.1**: Build lead management interface
  - Lead list with advanced filtering and search (displays all 3 phone numbers)
  - Lead detail view with complete contact information
  - Add/edit lead forms with validation (PRIMARY PHONE REQUIRED, Secondary & Alternate optional)
  - Bulk operations (delete, tag, export)
  - **Validation**: All CRUD operations work with backend API, multi-phone support functional

- [ ] **Task 2.2**: Implement lead import system (MULTI-PHONE SUPPORT)
  - CSV upload with drag-and-drop interface
  - Column mapping with auto-detection (supports Primary Phone, Secondary Phone, Alternate Phone)
  - Import preview with validation errors (validates all phone numbers)
  - Progress tracking during import process
  - **Validation**: 10k+ leads import successfully with progress indication, multi-phone mapping works

#### Week 7-8: Advanced Lead Features
**Tasks**:
- [ ] **Task 2.3**: Build lead segmentation tools
  - Tag-based lead organization
  - Advanced filtering (county, status, score, date ranges)
  - Saved filter presets
  - Lead export with custom criteria
  - **Validation**: Segmentation filters work accurately

- [ ] **Task 2.4**: Implement lead analytics
  - Lead source tracking and performance
  - Conversion funnel visualization
  - Lead scoring and quality metrics
  - **Validation**: Analytics display meaningful lead insights

**Lead Management Components**:
```typescript
// Lead management with CSV import and segmentation - ENHANCED WITH MULTI-PHONE SUPPORT
interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  primaryPhone: string;      // REQUIRED - Main contact phone
  secondaryPhone?: string;   // OPTIONAL - Secondary contact phone  
  alternatePhone?: string;   // OPTIONAL - Alternate contact phone
  email?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    county: string;
  };
  tags: string[];
  score: 'cold' | 'warm' | 'hot';
  consentStatus: 'unknown' | 'opted_in' | 'opted_out';
  createdAt: Date;
}

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filters, setFilters] = useState<LeadFilters>({});
  const [isImporting, setIsImporting] = useState(false);
  
  return (
    <div className="space-y-6">
      <LeadFilters filters={filters} onFiltersChange={setFilters} />
      <LeadImportDialog onImportStart={setIsImporting} />
      <LeadTable leads={leads} onLeadUpdate={handleLeadUpdate} />
      {isImporting && <ImportProgress />}
    </div>
  );
}
```

### Phase 3: Campaign Management (Weeks 9-12)
**Priority**: High
**Dependencies**: Phase 2 completed

#### Week 9-10: Campaign Creation
**Tasks**:
- [ ] **Task 3.1**: Build campaign wizard interface
  - Multi-step campaign creation form
  - Audience selection with real-time preview
  - Message template selection
  - Scheduling and timing configuration
  - **Validation**: Campaign wizard creates valid campaigns

- [ ] **Task 3.2**: Implement campaign monitoring
  - Real-time campaign status dashboard
  - Live progress tracking with charts
  - Campaign control buttons (start, pause, stop)
  - Error monitoring and reporting
  - **Validation**: Campaign monitoring shows live updates

#### Week 11-12: Advanced Campaign Features
**Tasks**:
- [ ] **Task 3.3**: Build A/B testing interface
  - Template variant configuration
  - Split traffic allocation
  - Performance comparison dashboard
  - **Validation**: A/B tests split traffic correctly

- [ ] **Task 3.4**: Campaign analytics and reporting
  - Detailed performance metrics
  - Campaign comparison tools
  - Export campaign reports
  - **Validation**: Analytics provide actionable insights

**Campaign Management Components**:
```typescript
// Campaign creation and real-time monitoring
interface Campaign {
  id: string;
  name: string;
  type: 'broadcast' | 'drip' | 'trigger';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  targetAudience: {
    leadListIds: string[];
    filters: Record<string, any>;
    estimatedCount: number;
  };
  schedule: {
    startDate: Date;
    endDate?: Date;
    quietHours: { start: string; end: string; timezone: string; };
  };
  metrics: {
    totalTargets: number;
    sent: number;
    delivered: number;
    replies: number;
    optOuts: number;
  };
}

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const { data: liveMetrics } = useWebSocket('/ws/campaigns');
  
  return (
    <div className="space-y-6">
      <CampaignHeader onCreateCampaign={handleCreateCampaign} />
      <CampaignTable 
        campaigns={campaigns} 
        liveMetrics={liveMetrics}
        onCampaignControl={handleCampaignControl}
      />
      <CampaignWizard />
    </div>
  );
}
```

### Phase 4: Messaging System (Weeks 13-16)
**Priority**: High
**Dependencies**: Phase 3 completed

#### Week 13-14: Two-Way Messaging
**Tasks**:
- [ ] **Task 4.1**: Build messaging interface
  - Unified inbox with conversation threading
  - Real-time message updates via WebSocket
  - Message composition with template insertion
  - Contact information sidebar with lead details
  - **Validation**: Messages appear instantly, conversations thread correctly

- [ ] **Task 4.2**: Implement conversation management
  - Conversation search and filtering
  - Message status indicators (sent, delivered, read)
  - Quick response templates
  - Conversation notes and tags
  - **Validation**: All conversation features work smoothly

#### Week 15-16: Advanced Messaging Features
**Tasks**:
- [ ] **Task 4.3**: Build message templates and automation
  - Template library with categories
  - Quick response insertion
  - Auto-response configuration
  - **Validation**: Templates insert correctly, auto-responses work

- [ ] **Task 4.4**: Mobile-responsive messaging
  - Touch-optimized interface
  - Mobile conversation flow
  - Offline message queuing
  - **Validation**: Messaging works perfectly on mobile devices

### Phase 5: Additional Essential Components (Weeks 17-20)
**Priority**: High (Essential for complete MVP)
**Dependencies**: Phases 1-4 completed

#### Week 17: Templates Management Page
**Tasks**:
- [ ] **Task 5.1**: Build template library interface
  - Grid/list view of all templates with categories
  - Template search and filtering by category
  - Template performance metrics display
  - Bulk template operations
  - **Validation**: Template library displays all templates correctly

- [ ] **Task 5.2**: Implement template editor
  - Rich text editor with variable insertion
  - Live preview with sample lead data
  - Template validation and error checking
  - Save/cancel functionality with confirmation
  - **Validation**: Template editor saves and previews correctly

- [ ] **Task 5.3**: Template rotation configuration
  - Rotation rules and frequency settings
  - Usage analytics per template
  - Performance comparison between templates
  - **Validation**: Rotation settings apply correctly

**Templates Components**:
```typescript
// Template management with rich editor and performance tracking
interface Template {
  id: string;
  name: string;
  category: 'initial' | 'followup' | 'help' | 'stop';
  content: string;
  variables: string[];
  isActive: boolean;
  performance: {
    totalSent: number;
    deliveryRate: number;
    replyRate: number;
    optOutRate: number;
    usageFrequency: number;
  };
}

export function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  
  return (
    <div className="space-y-6">
      <TemplateHeader 
        onCreateTemplate={() => setEditingTemplate({} as Template)}
        categories={templateCategories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
      <TemplateLibrary 
        templates={filteredTemplates}
        onEditTemplate={setEditingTemplate}
        onDeleteTemplate={handleDeleteTemplate}
      />
      {editingTemplate && (
        <TemplateEditor 
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
}
```

#### Week 18: Phone Numbers Management Page
**Tasks**:
- [ ] **Task 5.4**: Build phone number pool interface
  - Number grid with health score visualization
  - Health score indicators and status badges
  - Number performance analytics
  - Search and filtering capabilities
  - **Validation**: Number pool displays with accurate health scores

- [ ] **Task 5.5**: Implement number acquisition flow
  - Area code selection interface
  - Number search and preview
  - Purchase confirmation dialog
  - Integration with Twilio API
  - **Validation**: Number acquisition completes successfully

- [ ] **Task 5.6**: Number configuration interface
  - MPS and daily cap settings
  - Quiet hours configuration
  - Campaign assignment management
  - **Validation**: Configuration changes apply immediately

**Phone Numbers Components**:
```typescript
// Phone number management with health monitoring
interface PhoneNumber {
  id: string;
  number: string;
  healthScore: number; // 0-100
  status: 'active' | 'quarantined' | 'blocked';
  configuration: {
    messagesPerSecond: number;
    dailyCap: number;
    quietHours: { start: string; end: string; timezone: string; };
  };
  analytics: {
    totalSent: number;
    deliveryRate: number;
    dailyVolume: number;
    reputationStatus: string;
  };
}

export function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [showAcquisition, setShowAcquisition] = useState(false);
  
  return (
    <div className="space-y-6">
      <PhoneNumberHeader 
        onAcquireNumber={() => setShowAcquisition(true)}
        totalNumbers={phoneNumbers.length}
        activeNumbers={phoneNumbers.filter(n => n.status === 'active').length}
      />
      <PhoneNumberGrid 
        numbers={phoneNumbers}
        onConfigureNumber={handleConfigureNumber}
        onViewAnalytics={handleViewAnalytics}
      />
      {showAcquisition && (
        <NumberAcquisitionDialog 
          onClose={() => setShowAcquisition(false)}
          onAcquire={handleAcquireNumber}
        />
      )}
    </div>
  );
}
```

#### Week 19: Compliance Management Page
**Tasks**:
- [ ] **Task 5.7**: Build opt-out management interface
  - Global suppression list with search
  - Bulk opt-out management tools
  - Opt-out source tracking
  - Manual opt-out addition/removal
  - **Validation**: Opt-out management prevents future messaging

- [ ] **Task 5.8**: Implement audit trail interface
  - Searchable compliance event log
  - Event filtering and sorting
  - Detailed event information display
  - Export compliance reports
  - **Validation**: Audit trail shows all compliance events

- [ ] **Task 5.9**: Compliance reporting dashboard
  - TCPA compliance metrics
  - Violation detection and alerts
  - Scheduled compliance reports
  - **Validation**: Compliance reports generate accurately

**Compliance Components**:
```typescript
// Compliance management with audit trails
interface OptOut {
  id: string;
  phoneNumber: string;
  source: 'keyword' | 'manual' | 'complaint';
  timestamp: Date;
  campaignId?: string;
  reason: string;
}

interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  phoneNumber: string;
  details: Record<string, any>;
  complianceStatus: 'compliant' | 'violation' | 'warning';
}

export function CompliancePage() {
  const [optOuts, setOptOuts] = useState<OptOut[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [selectedTab, setSelectedTab] = useState<'opt-outs' | 'audit' | 'reports'>('opt-outs');
  
  return (
    <div className="space-y-6">
      <ComplianceHeader metrics={complianceMetrics} />
      <ComplianceTabs 
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
      />
      {selectedTab === 'opt-outs' && (
        <OptOutManagement 
          optOuts={optOuts}
          onBulkAction={handleBulkOptOut}
          onRemoveOptOut={handleRemoveOptOut}
        />
      )}
      {selectedTab === 'audit' && (
        <AuditTrail 
          events={auditEvents}
          onExportReport={handleExportAuditReport}
        />
      )}
      {selectedTab === 'reports' && (
        <ComplianceReporting 
          onGenerateReport={handleGenerateReport}
        />
      )}
    </div>
  );
}
```

#### Week 20: Enhanced Analytics Page
**Tasks**:
- [ ] **Task 5.10**: Build advanced analytics dashboard
  - Multi-campaign performance comparison
  - Time-series trend analysis with charts
  - ROI calculator with cost tracking
  - Conversion funnel visualization
  - **Validation**: Advanced analytics provide actionable insights

- [ ] **Task 5.11**: Implement custom reporting
  - Report builder with drag-and-drop
  - Scheduled report generation
  - Export in multiple formats (CSV, PDF, Excel)
  - Email delivery of reports
  - **Validation**: Custom reports generate and export correctly

### Phase 6: Advanced Features & Polish (Weeks 21-24)
**Priority**: Medium (Nice-to-have for MVP)
**Dependencies**: Phase 5 completed

#### Week 21-22: Integrations Management Page
**Tasks**:
- [ ] **Task 6.1**: Build integration management interface
  - Twilio connection status and configuration
  - API key management and generation
  - Webhook endpoint testing
  - Integration health monitoring
  - **Validation**: Integration management works correctly

- [ ] **Task 6.2**: Implement system health monitoring
  - Real-time system status dashboard
  - Service health indicators
  - Error rate monitoring
  - **Validation**: Health monitoring shows accurate status

#### Week 23-24: Settings & Final Polish
**Tasks**:
- [x] **Task 6.3**: Build simplified settings page (MVP)
  - Phone Number Management (Twilio integration status)
  - Message Templates management
  - Auto-Reply & Compliance settings (STOP/HELP responses)
  - System Preferences (dashboard settings, notifications, data export)
  - **Validation**: All core settings functional with real-time Twilio status

- [ ] **Task 6.4**: Final UI/UX polish
  - Mobile responsiveness optimization
  - Performance optimization
  - Accessibility improvements
  - Error handling enhancements
  - **Validation**: Platform works perfectly across all devices

## TECHNICAL IMPLEMENTATION

### Project Structure
```
src/
├── components/
│   ├── dashboard/           # Dashboard widgets and KPIs
│   │   ├── MetricsGrid.tsx
│   │   ├── CampaignChart.tsx
│   │   └── ActivityFeed.tsx
│   ├── leads/               # Lead management components
│   │   ├── LeadTable.tsx
│   │   ├── LeadForm.tsx
│   │   ├── ImportDialog.tsx
│   │   └── LeadFilters.tsx
│   ├── campaigns/           # Campaign components
│   │   ├── CampaignWizard.tsx
│   │   ├── CampaignTable.tsx
│   │   └── CampaignMonitor.tsx
│   ├── messages/            # Messaging interface
│   │   ├── MessageInbox.tsx
│   │   ├── ConversationView.tsx
│   │   └── MessageComposer.tsx
│   ├── templates/           # Template management (NEW)
│   │   ├── TemplateLibrary.tsx
│   │   ├── TemplateEditor.tsx
│   │   └── TemplatePreview.tsx
│   ├── phone-numbers/       # Number management (NEW)
│   │   ├── NumberGrid.tsx
│   │   ├── NumberConfig.tsx
│   │   └── AcquisitionDialog.tsx
│   ├── analytics/           # Enhanced analytics
│   │   ├── PerformanceChart.tsx
│   │   ├── ROICalculator.tsx
│   │   └── CustomReports.tsx
│   ├── compliance/          # Compliance tools (NEW)
│   │   ├── OptOutManager.tsx
│   │   ├── AuditTrail.tsx
│   │   └── ComplianceReports.tsx
│   ├── integrations/        # Integration management (NEW)
│   │   ├── TwilioStatus.tsx
│   │   ├── APIKeyManager.tsx
│   │   └── WebhookTester.tsx
│   ├── settings/            # Settings components (MVP)
│   │   ├── PhoneNumberConfig.tsx
│   │   ├── MessageTemplates.tsx
│   │   └── ComplianceSettings.tsx
│   ├── layout/              # Layout components
│   │   ├── MainLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── ui/                  # Shadcn/ui components
│       ├── button.tsx
│       ├── input.tsx
│       ├── table.tsx
│       └── dialog.tsx
├── pages/                   # Page components
│   ├── DashboardPage.tsx
│   ├── LeadsPage.tsx
│   ├── CampaignsPage.tsx
│   ├── MessagesPage.tsx
│   ├── TemplatesPage.tsx     # NEW
│   ├── PhoneNumbersPage.tsx  # NEW
│   ├── AnalyticsPage.tsx     # ENHANCED
│   ├── CompliancePage.tsx    # NEW
│   ├── IntegrationsPage.tsx  # NEW
│   └── SettingsPage.tsx
├── hooks/                   # Custom hooks
│   ├── useAuth.ts
│   ├── useWebSocket.ts
│   ├── useLeads.ts
│   ├── useCampaigns.ts
│   ├── useTemplates.ts       # NEW
│   ├── usePhoneNumbers.ts    # NEW
│   └── useCompliance.ts      # NEW
├── lib/                     # Utilities
│   ├── api.ts               # API client
│   ├── auth.ts              # Authentication
│   ├── websocket.ts         # WebSocket client
│   └── utils.ts             # Helper functions
├── types/                   # TypeScript types
│   ├── auth.ts
│   ├── leads.ts
│   ├── campaigns.ts
│   ├── messages.ts
│   ├── templates.ts         # NEW
│   ├── phoneNumbers.ts      # NEW
│   ├── compliance.ts        # NEW
│   └── analytics.ts
└── utils/                   # Utility functions
    ├── formatters.ts
    ├── validators.ts
    └── constants.ts
```

### API Integration Layer
```typescript
// Enhanced API client with all endpoints
import { createClient } from '@supabase/supabase-js';

class APIClient {
  private baseURL = '/api/v1';
  
  // Leads API
  leads = {
    list: (params?: LeadFilters) => this.get('/leads', { params }),
    create: (data: LeadCreate) => this.post('/leads', data),
    update: (id: string, data: LeadUpdate) => this.patch(`/leads/${id}`, data),
    delete: (id: string) => this.delete(`/leads/${id}`),
    import: {
      preview: (file: File) => this.postFile('/leads/import/preview', file),
      execute: (file: File, mapping: ColumnMapping) => this.postFile('/leads/import/execute', file, { mapping })
    }
  };
  
  // Campaigns API
  campaigns = {
    list: () => this.get('/campaigns'),
    create: (data: CampaignCreate) => this.post('/campaigns', data),
    update: (id: string, data: CampaignUpdate) => this.patch(`/campaigns/${id}`, data),
    delete: (id: string) => this.delete(`/campaigns/${id}`),
    buildTargets: (id: string, criteria: TargetCriteria) => this.post(`/campaigns/${id}/build-targets`, criteria),
    start: (id: string) => this.post(`/campaigns/${id}/start`),
    pause: (id: string) => this.post(`/campaigns/${id}/pause`),
    resume: (id: string) => this.post(`/campaigns/${id}/resume`),
    stop: (id: string) => this.post(`/campaigns/${id}/stop`),
    stats: (id: string) => this.get(`/campaigns/${id}/stats`)
  };
  
  // Templates API (NEW)
  templates = {
    list: (category?: string) => this.get('/templates', { params: { category } }),
    create: (data: TemplateCreate) => this.post('/templates', data),
    update: (id: string, data: TemplateUpdate) => this.patch(`/templates/${id}`, data),
    delete: (id: string) => this.delete(`/templates/${id}`),
    performance: (id: string) => this.get(`/templates/${id}/performance`),
    test: (id: string, sampleData: any) => this.post(`/templates/${id}/test`, sampleData)
  };
  
  // Phone Numbers API (NEW)
  phoneNumbers = {
    list: () => this.get('/phone-numbers'),
    acquire: (areaCode: string) => this.post('/phone-numbers/acquire', { areaCode }),
    update: (id: string, settings: PhoneNumberSettings) => this.patch(`/phone-numbers/${id}/settings`, settings),
    delete: (id: string) => this.delete(`/phone-numbers/${id}`),
    health: (id: string) => this.get(`/phone-numbers/${id}/health`),
    analytics: (id: string) => this.get(`/phone-numbers/${id}/analytics`)
  };
  
  // Compliance API (NEW)
  compliance = {
    optOuts: {
      list: (params?: OptOutFilters) => this.get('/compliance/opt-outs', { params }),
      bulk: (phoneNumbers: string[]) => this.post('/compliance/opt-outs/bulk', { phoneNumbers }),
      remove: (id: string) => this.delete(`/compliance/opt-outs/${id}`)
    },
    auditLogs: (params: AuditLogFilters) => this.get('/compliance/audit-logs', { params }),
    reports: {
      list: () => this.get('/compliance/reports'),
      generate: (type: string, dateRange: DateRange) => this.post('/compliance/reports/generate', { type, dateRange })
    }
  };
  
  // Analytics API (ENHANCED)
  analytics = {
    dashboard: () => this.get('/analytics/dashboard'),
    campaigns: {
      comparison: (campaignIds: string[], dateRange: DateRange) => 
        this.get('/analytics/campaigns/comparison', { params: { campaignIds, ...dateRange } }),
      performance: (id: string) => this.get(`/analytics/campaigns/${id}/performance`)
    },
    trends: (dateRange: DateRange) => this.get('/analytics/trends', { params: dateRange }),
    roi: (dateRange: DateRange) => this.get('/analytics/roi', { params: dateRange }),
    conversionFunnel: (dateRange: DateRange) => this.get('/analytics/conversion-funnel', { params: dateRange })
  };
  
  // Integrations API (NEW)
  integrations = {
    twilio: {
      status: () => this.get('/integrations/twilio/status'),
      test: () => this.post('/integrations/twilio/test'),
      config: (data: TwilioConfig) => this.patch('/integrations/twilio/config', data)
    },
    apiKeys: {
      list: () => this.get('/integrations/api-keys'),
      create: (name: string) => this.post('/integrations/api-keys', { name }),
      delete: (id: string) => this.delete(`/integrations/api-keys/${id}`)
    },
    webhooks: {
      list: () => this.get('/integrations/webhooks'),
      test: (url: string) => this.post('/integrations/webhooks/test', { url })
    }
  };
  
  // Base HTTP methods
  private async get(url: string, options?: any) {
    return this.request('GET', url, options);
  }
  
  private async post(url: string, data?: any) {
    return this.request('POST', url, { body: data });
  }
  
  private async patch(url: string, data?: any) {
    return this.request('PATCH', url, { body: data });
  }
  
  private async delete(url: string) {
    return this.request('DELETE', url);
  }
  
  private async request(method: string, url: string, options?: any) {
    // Implementation with error handling, auth headers, etc.
  }
}

export const api = new APIClient();
```

### WebSocket Integration
```typescript
// Real-time updates via WebSocket
export function useWebSocket(endpoint: string) {
  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000${endpoint}`);
    
    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setData(message.data);
    };
    
    return () => ws.close();
  }, [endpoint]);
  
  return { data, isConnected };
}

// Usage in components
export function DashboardPage() {
  const { data: liveMetrics } = useWebSocket('/ws/dashboard');
  const { data: campaignUpdates } = useWebSocket('/ws/campaigns');
  
  return (
    <div>
      <MetricsGrid metrics={liveMetrics} />
      <LiveCampaignUpdates updates={campaignUpdates} />
    </div>
  );
}
```

## VALIDATION REQUIREMENTS

### Complete Feature Tests
- [ ] **All 10 Navigation Sections**: Every page loads and functions correctly
- [ ] **Real-time Updates**: Dashboard and campaign metrics update without refresh
- [ ] **CSV Import/Export**: Handle 10k+ leads with progress indication
- [ ] **Template Management**: Create, edit, preview 20+ Spanish templates
- [ ] **Phone Number Management**: Acquire, configure, monitor number health
- [ ] **Campaign Execution**: End-to-end campaign creation and monitoring
- [ ] **Compliance Interface**: Opt-out management and audit trail access
- [ ] **Analytics Dashboard**: All charts and metrics display correctly
- [ ] **Mobile Responsiveness**: Full functionality on mobile devices

### Performance Requirements
- [ ] **Page Load Times**: All pages load within 2 seconds
- [ ] **Real-time Latency**: WebSocket updates appear within 1 second
- [ ] **CSV Processing**: 10k leads import with progress in under 30 seconds
- [ ] **Search Performance**: Lead/template/campaign search results under 500ms
- [ ] **Chart Rendering**: Analytics charts render within 3 seconds

### User Experience Tests
- [ ] **Navigation Flow**: Intuitive navigation between all sections
- [ ] **Form Validation**: All forms provide clear error messages
- [ ] **Loading States**: Appropriate loading indicators throughout
- [ ] **Error Handling**: Graceful error handling with user-friendly messages
- [ ] **Accessibility**: WCAG 2.1 AA compliance for accessibility

## SUCCESS CRITERIA

### Functional Requirements
- All 10 main navigation sections work correctly
- Real-time dashboard updates without page refresh
- CSV import processes large datasets successfully
- Campaign creation and monitoring work end-to-end
- Template management supports full CRUD operations
- Phone number health monitoring displays accurate data
- Compliance interface ensures TCPA adherence
- Analytics provide actionable business insights
- Mobile interface provides full functionality

### Performance Requirements
- Dashboard loads in under 2 seconds
- Real-time updates appear within 1 second
- CSV import handles 10k+ records efficiently
- Search results return in under 500ms
- Application works smoothly on mobile devices

### Business Requirements
- User adoption rate >90% within 30 days
- Task completion time reduced by 50%
- User satisfaction score >4.7/5
- Zero critical bugs in production
- Mobile usage >40% of total traffic

This comprehensive Frontend PRP provides complete implementation guidance for building a beautiful, fully functional SMS Control Tower interface that matches LaunchControl.us quality while being specifically optimized for landowner lead generation and real estate SMS marketing campaigns.