# SMS Control Tower Platform

A comprehensive SMS marketing platform for landowner lead generation and real estate investment, modeled after LaunchControl.us with enterprise-grade messaging capabilities, compliance features, real-time analytics, and **automatic lead tagging system**.

## 🎯 Project Overview

**Business Purpose**: Enable land buyers and real estate investors to execute targeted, compliant SMS outreach campaigns for landowner leads with automated sequences, real-time analytics, full TCPA compliance, and intelligent lead categorization.

**Technology Stack**: Full-stack application with React/TypeScript frontend, FastAPI Python backend, Supabase PostgreSQL database, Twilio SMS integration, and automated tagging engine.

**Target Users**: Land buyers, real estate investors, SMS marketing agencies, and lead generation companies.

## 🏗️ System Architecture

```
SMS Control Tower Platform
├── Frontend (React/TypeScript)
│   ├── Beautiful UI with 9 main sections
│   ├── Real-time dashboard updates
│   ├── LaunchControl.us-style interface
│   └── Automatic Lead Tagging System
├── Backend (FastAPI/Python)
│   ├── RESTful API with WebSocket support
│   ├── Background message processing
│   ├── Compliance and analytics engines
│   └── Tag generation and validation
├── Database (Supabase PostgreSQL)
│   ├── Multi-tenant with RLS
│   ├── Lead and campaign data
│   ├── Audit trails and analytics
│   └── Tag indexing and optimization
└── External Services
    ├── Twilio (SMS delivery)
    ├── Background workers (Celery/Redis)
    └── Real-time updates (WebSocket)
```

## 🚀 Key Features

### ⭐ **NEW: Automatic Lead Tagging System**

The platform now features an intelligent tagging system that automatically categorizes leads during CSV import:

#### **Automatic Tag Generation**
- **Time Tags**: SEP25, OCT25, NOV25 (MMMYY format)
- **Geographic Tags**: TX-HAR, FL-MIA, CA-LA (STATE-COUNTY format)  
- **Property Tags**: 1-5AC, 5-10AC, 10+AC (acreage-based ranges)

#### **Smart Campaign Targeting**
- Filter leads by automatically generated tags
- Combine multiple tags for precise audience selection
- Real-time lead counts per tag
- Search and filter functionality

#### **Enhanced Lead Management**
- Visual tag display on all lead records
- Advanced filtering by tags
- Bulk operations with tag support
- Export functionality includes tags

### Core Platform Features

#### 1. **Dashboard** 📊
- **Real-time KPIs**: Campaign performance, delivery rates, reply rates
- **Live Campaign Monitoring**: Active campaigns with real-time progress
- **Recent Activity Feed**: Latest leads, messages, and system events
- **Quick Actions**: Launch campaigns, add leads, view messages
- **Performance Widgets**: Top performing lists, upcoming tasks
- **System Health**: Queue status, worker health, integration status

#### 2. **Lead Management** 👥
- **CSV/Excel Import**: Bulk lead import with automatic tagging
- **Lead Profiles**: Contact info, property details, interaction history
- **Advanced Filtering**: County, tags, consent status, lead score, property type
- **Duplicate Detection**: Smart duplicate prevention with merge options
- **Lead Scoring**: Hot/warm/cold classification with ML algorithms
- **Bulk Operations**: Mass updates, exports, deletions with tag support
- **Data Enrichment**: Property value estimates, ownership verification

#### 3. **Campaign Management** 📢
- **Campaign Wizard**: Step-by-step campaign creation with tag-based targeting
- **A/B Testing**: Message variants with statistical significance testing
- **Drip Sequences**: Multi-message campaigns with time delays
- **Smart Scheduling**: Optimal send times based on recipient data
- **Template Library**: Pre-built message templates for different use cases
- **Dynamic Personalization**: firstName, lastName, city, property variables
- **Campaign Analytics**: Open rates, reply rates, conversion tracking

#### 4. **Two-Way Messaging** 💬
- **Real-time Conversations**: Live message interface with typing indicators
- **Message Threading**: Organized conversation history
- **Quick Responses**: Pre-built reply templates
- **Sentiment Analysis**: AI-powered conversation insights
- **Auto-responders**: Intelligent automated responses
- **Message Search**: Full conversation search and filtering
- **Attachment Support**: Image and document sharing

#### 5. **Analytics & Reporting** 📈
- **Campaign Performance**: Detailed metrics and conversion funnels
- **Lead Analytics**: Source attribution, conversion tracking, ROI analysis
- **Message Analytics**: Delivery rates, response patterns, engagement metrics
- **Revenue Tracking**: Deal values, pipeline management, ROI calculations
- **Custom Dashboards**: Configurable widgets and reports
- **Export Capabilities**: CSV, Excel, PDF reports with scheduling
- **Compliance Reporting**: Opt-out tracking, consent documentation

#### 6. **Templates & Content** 📝
- **Message Templates**: Category-organized templates with variables
- **Template Analytics**: Performance tracking for optimization
- **Content Library**: Shared resources across team members
- **Template A/B Testing**: Optimize message performance
- **Compliance Templates**: Pre-approved legally compliant messages
- **Dynamic Content**: Personalized based on lead data
- **Template Versioning**: Track changes and rollback capability

#### 7. **Phone Number Management** 📞
- **Number Purchasing**: Buy local numbers directly from Twilio
- **Health Monitoring**: Track deliverability and reputation scores
- **Load Balancing**: Distribute messages across multiple numbers
- **Geographic Routing**: Use local numbers for better response rates
- **Number Warming**: Gradual ramp-up for new phone numbers
- **Compliance Monitoring**: Track opt-outs per number
- **Performance Analytics**: Message success rates by number

#### 8. **Compliance Center** ⚖️
- **TCPA Compliance**: Automated opt-out processing and consent tracking
- **Opt-out Management**: Global and campaign-specific unsubscribe lists
- **Consent Documentation**: Detailed records of permission sources
- **Audit Trails**: Complete activity logging for legal requirements
- **Quiet Hours**: Automatic scheduling within legal time windows
- **DNC List Integration**: Cross-reference with do-not-call registries
- **Compliance Alerts**: Real-time notifications for compliance issues

#### 9. **Integrations** 🔗
- **CRM Connectors**: Salesforce, HubSpot, Pipedrive integrations
- **Webhooks**: Real-time data sync with external systems
- **API Access**: RESTful API for custom integrations
- **Zapier Integration**: Connect with 3000+ applications
- **Export Formats**: CSV, Excel, JSON, XML data export
- **Third-party Tools**: Google Sheets, Airtable, Monday.com
- **Real Estate Platforms**: MLS, BiggerPockets, LoopNet sync

## 🛠️ Installation Guide

### Prerequisites

Before installing, ensure you have:
- Node.js 18+ and npm
- Python 3.9+ and pip
- Git for version control
- PostgreSQL database (or Supabase account)
- Twilio account for SMS functionality

### Quick Start

1. **Clone the Repository**
```bash
git clone <repository-url>
cd control-tower
```

2. **Install Dependencies**
```bash
# Frontend dependencies
npm install

# Backend dependencies (if applicable)
pip install -r requirements.txt
```

3. **Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Configure required variables:
VITE_API_URL=http://localhost:8000/api
VITE_JWT_SECRET=your-jwt-secret
VITE_TWILIO_ACCOUNT_SID=your-twilio-sid
VITE_TWILIO_AUTH_TOKEN=your-twilio-token

# Real-time WebSockets are disabled by default because the backend endpoints are not active yet.
# Flip these to `true` only after enabling the FastAPI WebSocket routes to avoid console errors:
VITE_ENABLE_WEBSOCKETS=false
VITE_ENABLE_REAL_TIME_UPDATES=false
# Messaging also defaults to mock data until the backend `/conversations` endpoint is live:
VITE_ENABLE_MOCK_CONVERSATIONS=false
```

4. **Database Setup**
```bash
# Run database migrations
npm run migrate

# Seed initial data
npm run seed
```

5. **Start Development Server**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Deployment

1. **Build for Production**
```bash
npm run build
npm run preview
```

2. **Environment Variables**
Set production environment variables in `.env.production`

3. **Database Configuration**
- Set up production PostgreSQL database
- Run migrations: `npm run migrate:prod`
- Configure connection pooling and backups

4. **SSL and Security**
- Configure HTTPS certificates
- Set up firewall rules
- Enable rate limiting

## 📚 Usage Guide

### Getting Started

1. **Initial Setup**
   - Create your account and organization
   - Configure Twilio integration
   - Set up your first phone number
   - Configure compliance settings

2. **Import Your First Leads**
   - Navigate to Leads → Import
   - Upload CSV file with lead data
   - Map CSV columns to lead fields
   - **Enable automatic tagging** for optimal organization
   - Review and confirm import

3. **Create Your First Campaign**
   - Use Campaign Wizard → New Campaign
   - Select campaign type (Broadcast, Drip, Trigger)
   - **Choose target audience using automatic tags**
   - Write your message with personalization
   - Schedule and launch

### Lead Tagging System Usage

#### **Automatic Tagging During Import**

1. **Upload CSV File**
   - Include columns for: state, county, acreage (for automatic tags)
   - Required: firstName, lastName, primaryPhone
   - Optional: email, address, property details

2. **Configure Tagging Options**
   - ✅ **Time Tag**: Automatically applied (e.g., SEP25)
   - ✅ **Geographic Tag**: Based on state/county (e.g., TX-HAR)
   - ✅ **Property Tag**: Based on acreage (e.g., 5-10AC)
   - Add manual campaign tags as needed

3. **Preview Generated Tags**
   - Review automatically generated tags in preview
   - See how tags will appear on lead records
   - Verify geographic and property tag accuracy

#### **Campaign Targeting with Tags**

1. **Create New Campaign**
   - Go to Campaigns → New Campaign
   - Select "Tag-Based Targeting" in audience step

2. **Select Target Tags**
   - Browse available tags with lead counts
   - Select multiple tags for precise targeting
   - Use search to find specific tags quickly
   - Preview audience size in real-time

3. **Campaign Examples**
   - **Recent Texas Leads**: Select "SEP25" + "TX-*" tags
   - **Small Properties**: Select "1-5AC" tag
   - **Geographic Campaign**: Select "TX-HAR" for Harris County, Texas
   - **Mixed Targeting**: Combine time + geographic + property tags

#### **Lead Management with Tags**

1. **Filter Leads by Tags**
   - Use advanced filters on Leads page
   - Select multiple tags for complex filtering
   - Combine with other filters (status, source, etc.)

2. **Bulk Operations**
   - Select leads by tag criteria
   - Perform bulk status updates
   - Export filtered lead sets
   - Apply additional tags to selections

### Advanced Features

#### **Campaign Automation**
- Set up drip sequences with multiple messages
- Configure trigger-based responses
- Use A/B testing for message optimization
- Schedule campaigns for optimal timing

#### **Analytics and Optimization**
- Monitor campaign performance metrics
- Track lead conversion and ROI
- Analyze tag performance for targeting insights
- Use data to refine future campaigns

#### **Compliance Management**
- Automatically process opt-out requests
- Maintain consent documentation
- Schedule campaigns within legal hours
- Generate compliance reports

## 🔧 Development

### Project Structure

```
src/
├── components/
│   ├── campaigns/          # Campaign management components
│   ├── leads/             # Lead management components
│   ├── messages/          # Messaging interface components
│   ├── ui/               # Reusable UI components
│   │   ├── tag-input.tsx      # Tag input component
│   │   └── tag-filter.tsx     # Tag filtering component
│   └── ...
├── lib/
│   ├── leadTagging.ts     # 🆕 Lead tagging system core
│   ├── api.ts            # API client configuration
│   └── utils.ts          # Utility functions
├── pages/               # Page components
├── hooks/              # Custom React hooks
├── types/             # TypeScript type definitions
└── utils/            # Helper functions
```

### Key Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run typecheck    # Type check without building
npm run lint         # Run ESLint
npm run test         # Run tests

# Tagging System Testing
npm run test:tags    # Run tagging system tests
npm run test:e2e     # End-to-end tests including tagging
```

### Lead Tagging System API

#### Core Functions

```typescript
// Generate automatic tags for a lead
generateLeadTags(leadData: LeadData, options?: TaggingOptions): string[]

// Validate and clean tag format
validateAndCleanTags(tags: string[]): string[]

// Batch process leads with tagging
batchTagLeads(leads: LeadData[], options?: TaggingOptions): LeadData[]

// Filter leads by tags
filterLeadsByTags(leads: LeadData[], targetTags: string[]): LeadData[]

// Extract all unique tags from leads
extractAllTags(leads: LeadData[]): string[]

// Get lead counts by tag
getLeadCountByTag(leads: LeadData[]): Record<string, number>
```

#### Usage Examples

```typescript
// Generate tags for a single lead
const lead: LeadData = {
  firstName: 'John',
  lastName: 'Smith',
  address: { state: 'Texas', county: 'Harris County' },
  property: { acreage: 7.5 }
}

const tags = generateLeadTags(lead, {
  includeTimeTag: true,
  includeGeographicTag: true,
  includePropertyTag: true
})
// Result: ['SEP25', 'TX-HAR', '5-10AC']

// Batch process leads
const taggedLeads = batchTagLeads(leads, { customUploadDate: new Date() })

// Filter leads for campaign targeting
const texasLeads = filterLeadsByTags(leads, ['TX-HAR', 'TX-DAL'])
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests
npm run test:tags         # Tagging system tests

# Run tests with coverage
npm run test:coverage
```

### Test Coverage Goals

- **Unit Tests**: 90%+ coverage for core functions
- **Integration Tests**: All API endpoints and database operations
- **E2E Tests**: Complete user workflows including tagging
- **Performance Tests**: Load testing for bulk operations

### Tagging System Tests

```bash
# Test tag generation algorithms
npm run test -- --grep "tag generation"

# Test validation functions
npm run test -- --grep "tag validation"

# Test integration with import system
npm run test -- --grep "csv import tagging"

# Test campaign targeting
npm run test -- --grep "tag-based targeting"
```

## 🚨 Troubleshooting

### Common Issues

#### **Tag Generation Issues**

**Problem**: Tags not generating during CSV import
**Solutions**:
1. Verify CSV has required columns (state, county, acreage)
2. Check data format - ensure state names are spelled correctly
3. Verify automatic tagging is enabled in import settings
4. Check browser console for validation errors

**Problem**: Invalid tag formats
**Solutions**:
1. Check tag validation rules (alphanumeric, hyphens, plus only)
2. Verify character limits (max 50 chars)
3. Ensure no special characters in source data
4. Review county abbreviation mappings

#### **Campaign Targeting Issues**

**Problem**: No leads showing when tags selected
**Solutions**:
1. Verify tags exist on lead records
2. Check tag spelling and case sensitivity
3. Confirm leads haven't been filtered by other criteria
4. Refresh lead data and try again

**Problem**: Wrong lead counts for tags
**Solutions**:
1. Clear browser cache and reload
2. Verify database index integrity
3. Check for duplicate tags on leads
4. Re-run tag aggregation process

#### **Import Problems**

**Problem**: CSV import fails with tagging enabled
**Solutions**:
1. Check file format and encoding (UTF-8 recommended)
2. Verify CSV structure matches expected format
3. Ensure all required fields are mapped
4. Check file size limits (max 10MB per file)

**Problem**: Slow import performance
**Solutions**:
1. Reduce batch size in import settings
2. Disable unnecessary tag types temporarily
3. Check database connection and performance
4. Import during off-peak hours

#### **Performance Issues**

**Problem**: Slow tag filtering on leads page
**Solutions**:
1. Check database indexes on tags column
2. Reduce number of selected tags
3. Use more specific search terms
4. Contact admin for database optimization

**Problem**: Campaign creation timeout
**Solutions**:
1. Reduce target audience size
2. Use fewer tag combinations
3. Create campaign during off-peak hours
4. Contact support for assistance

### System Requirements

#### **Minimum Requirements**
- RAM: 4GB for development, 8GB for production
- Storage: 10GB free space
- Node.js: Version 18.0.0 or higher
- Database: PostgreSQL 13+ with 1GB available space
- Network: Stable internet connection for Twilio API

#### **Recommended Specifications**
- RAM: 16GB+ for optimal performance
- Storage: SSD with 50GB+ free space
- CPU: Multi-core processor for concurrent operations
- Database: PostgreSQL 14+ with dedicated server
- CDN: CloudFlare or similar for static asset delivery

### Getting Help

#### **Support Channels**
1. **Documentation**: Check this README and PRP document
2. **Issue Tracker**: Create GitHub issues for bugs
3. **Community Forum**: Discussion and feature requests
4. **Direct Support**: Contact development team

#### **Reporting Issues**
When reporting issues, include:
1. **Environment**: Development/staging/production
2. **Steps to Reproduce**: Detailed reproduction steps
3. **Expected vs Actual**: What should happen vs what happens
4. **Screenshots/Logs**: Visual evidence and error messages
5. **Browser/System**: Version and operating system details

## 🤝 Contributing

### Development Workflow

1. **Fork Repository**: Create personal fork of the project
2. **Create Branch**: Use descriptive branch names (e.g., `feature/tag-export`)
3. **Make Changes**: Follow coding standards and best practices
4. **Write Tests**: Include unit and integration tests
5. **Submit PR**: Create pull request with detailed description

### Coding Standards

- **TypeScript**: Strict mode enabled, proper typing required
- **ESLint**: Follow configured linting rules
- **Prettier**: Consistent code formatting
- **Testing**: Jest for unit tests, Cypress for E2E
- **Documentation**: JSDoc comments for public functions

### Tag System Contributions

When contributing to the tagging system:
1. **Update Tests**: Include comprehensive test coverage
2. **Update Documentation**: Keep README and PRP current
3. **Performance**: Consider impact on large datasets
4. **Compatibility**: Ensure backward compatibility
5. **Validation**: Add proper input validation

## 📋 Changelog

### Version 2.1.0 (Latest)
**🆕 Major Feature: Automatic Lead Tagging System**
- ✅ Automatic tag generation during CSV import
- ✅ Time-based tags (MMMYY format)
- ✅ Geographic tags (STATE-COUNTY format)
- ✅ Property-based tags (acreage ranges)
- ✅ Advanced tag filtering in leads management
- ✅ Tag-based campaign targeting
- ✅ Comprehensive validation and formatting
- ✅ Export functionality with tags included
- ✅ Performance optimizations for large datasets

**🔧 Improvements**
- Enhanced CSV import wizard with tagging options
- Updated campaign creation workflow
- Improved lead filtering performance
- Added tag management components
- Enhanced search functionality

**🐛 Bug Fixes**
- Fixed campaign creation not showing in list
- Resolved pause/start button 404 errors
- Improved error handling in import process
- Fixed tag validation edge cases

### Version 2.0.0
**🚀 Major Features**
- Complete UI overhaul with modern design
- Real-time dashboard with WebSocket updates
- Advanced campaign management with A/B testing
- Two-way messaging with conversation threading
- Comprehensive analytics and reporting
- TCPA compliance center
- Phone number management system
- CRM integrations and webhooks

### Version 1.0.0
**🎉 Initial Release**
- Basic SMS sending functionality
- Lead management system
- Simple campaign creation
- Twilio integration
- User authentication and authorization

## 📄 License

This project is proprietary software developed for SMS marketing and land acquisition purposes. All rights reserved.

**Restrictions:**
- Commercial use requires license agreement
- Redistribution not permitted without authorization
- Modifications must be approved by development team
- Compliance with SMS marketing regulations required

## 📞 Support

For technical support, feature requests, or general inquiries:

**Development Team**: [Your Contact Information]
**Documentation**: [Link to Full Documentation]
**Issue Tracker**: [GitHub Issues URL]
**Community**: [Discord/Slack Channel]

---

**Last Updated**: September 6, 2025  
**Version**: 2.1.0  
**Next Milestone**: Advanced AI-powered lead scoring and automated responses
