# Lead Tagging System - Project Requirements & Procedures (PRP)

## Project Overview

**Project Name:** Automatic Lead Tagging System for SMS Marketing Platform  
**Version:** 1.0  
**Date:** September 6, 2025  
**Author:** Development Team  

## Executive Summary

The Lead Tagging System automatically assigns 2-3 strategic tags to land owner leads during bulk CSV upload, enabling precise campaign targeting and lead organization. The system generates time-based, geographic, and property-based tags using standardized formats for optimal campaign performance.

## Business Requirements

### Primary Objectives
1. **Automated Lead Categorization**: Eliminate manual tagging during bulk uploads
2. **Strategic Campaign Targeting**: Enable precise audience selection based on systematic tags
3. **Data Consistency**: Standardize tag formats across the entire platform
4. **Operational Efficiency**: Reduce campaign setup time and improve targeting accuracy

### Success Metrics
- 100% of uploaded leads receive appropriate automatic tags
- Reduction in campaign creation time by 50%
- Improved campaign targeting precision
- Enhanced lead organization and searchability

## Functional Requirements

### FR1: Automatic Tag Generation
**Description:** System automatically generates tags during CSV import  
**Priority:** High  
**Acceptance Criteria:**
- Time tags generated in MMMYY format (e.g., SEP25, OCT25, NOV25)
- Geographic tags in STATE-COUNTY format (e.g., TX-HAR, FL-MIA, CA-LA)
- Property tags based on acreage ranges (e.g., 1-5AC, 5-10AC, 10+AC)
- Maximum 3 automatic tags per lead
- Tags validated and formatted consistently

### FR2: Tag Validation System
**Description:** All tags must conform to validation rules  
**Priority:** High  
**Acceptance Criteria:**
- Alphanumeric characters, hyphens, and plus signs only
- Maximum 50 characters per tag
- Uppercase formatting enforced
- Duplicate tag prevention
- Invalid character filtering

### FR3: Campaign Targeting Integration
**Description:** Campaign creation utilizes automatic tags  
**Priority:** High  
**Acceptance Criteria:**
- Tag-based lead filtering in campaign wizard
- Lead count display per tag
- Multiple tag selection support
- Real-time audience preview
- Search functionality within tags

### FR4: Lead Management Enhancement
**Description:** Lead page incorporates tag filtering  
**Priority:** Medium  
**Acceptance Criteria:**
- Tag filter in advanced search
- Visual tag display on lead records
- Bulk tag operations
- Tag-based export capabilities

## Technical Requirements

### TR1: Tag Generation Logic
**Location:** `src/lib/leadTagging.ts`
**Functions:**
- `generateTimeTag(uploadDate?: Date): string`
- `generateGeographicTag(state?: string, county?: string): string | null`
- `generatePropertyTag(acreage?: number): string | null`
- `generateLeadTags(leadData: LeadData, options?: TaggingOptions): string[]`

### TR2: Data Validation
**Location:** `src/lib/leadTagging.ts`
**Functions:**
- `validateAndCleanTags(tags: string[]): string[]`
- `tagsToString(tags: string[], separator?: string): string`
- `tagsFromString(tagString: string, separator?: string): string[]`

### TR3: Integration Points
**Components:**
- `ImportLeadsDialog.tsx` - CSV processing with automatic tagging
- `CampaignWizardNew.tsx` - Tag-based campaign targeting
- `LeadsPage.tsx` - Tag filtering and management
- `TagInput.tsx` - Tag input validation component
- `TagFilter.tsx` - Tag selection component

### TR4: Database Schema Updates
**Required Fields:**
- `leads.tags` - JSON array of string tags
- Tag indexing for performance optimization
- Migration scripts for existing data

## Implementation Details

### Phase 1: Core Tag Generation (Completed)
- ✅ Tag generation algorithms implemented
- ✅ Validation and formatting functions
- ✅ Geographic and property mapping tables
- ✅ Time-based tag generation

### Phase 2: CSV Integration (Completed)
- ✅ ImportLeadsDialog enhanced with automatic tagging
- ✅ UI for manual tag addition alongside automatic tags
- ✅ Batch processing with tag assignment
- ✅ Preview functionality showing generated tags

### Phase 3: Campaign Integration (Completed)
- ✅ TagFilter component for advanced selection
- ✅ Campaign wizard tag-based targeting
- ✅ Lead count aggregation by tags
- ✅ Search and filter functionality

### Phase 4: Lead Management (Completed)
- ✅ LeadsPage tag filtering integration
- ✅ Tag display in lead lists
- ✅ Export functionality with tags
- ✅ Bulk operations support

## Tag Format Specifications

### Time Tags
**Format:** `MMMYY`  
**Examples:** SEP25, OCT25, NOV25, DEC25  
**Logic:** Generated from upload date using month abbreviation + 2-digit year

### Geographic Tags
**Format:** `STATE-COUNTY`  
**Examples:** TX-HAR, FL-MIA, CA-LA, TX-DAL  
**Logic:** State abbreviation + hyphen + county abbreviation  
**Fallback:** State-only tag if county unavailable

### Property Tags
**Format:** `X-YAC` or `X+AC`  
**Examples:** 1-5AC, 5-10AC, 10-25AC, 25-50AC, 50-100AC, 100+AC  
**Logic:** Acreage-based ranges with clear boundaries  
**Special Cases:** 0-1AC for properties under 1 acre

## County Abbreviation Mapping

### Texas Counties
- Harris → HAR
- Dallas → DAL
- Tarrant → TAR
- Bexar → BEX
- Travis → TRA
- Collin → COL
- Fort Bend → FTB
- Denton → DEN

### Florida Counties
- Miami-Dade → MIA
- Broward → BRO
- Palm Beach → PB
- Hillsborough → HIL
- Orange County → ORA
- Pinellas → PIN
- Duval → DUV

### California Counties
- Los Angeles → LA
- San Diego → SD
- Orange County → OC
- Riverside → RIV
- San Bernardino → SB
- Santa Clara → SC

## Quality Assurance

### Testing Requirements
1. **Unit Tests:**
   - Tag generation functions
   - Validation logic
   - Format compliance

2. **Integration Tests:**
   - CSV import with tagging
   - Campaign targeting functionality
   - Lead filtering operations

3. **User Acceptance Tests:**
   - End-to-end import workflow
   - Campaign creation with tags
   - Lead management operations

### Performance Requirements
- Tag generation: < 50ms per lead
- Bulk operations: Handle 10,000+ leads
- Database queries: Optimized with proper indexing
- UI responsiveness: < 200ms for filter operations

## Security Considerations

### Data Validation
- Input sanitization for tag content
- SQL injection prevention
- XSS protection in tag display

### Access Control
- Role-based tag management permissions
- Audit logging for tag operations
- Data export restrictions

## Deployment Procedures

### Pre-Deployment Checklist
1. Database migrations executed
2. Tag validation rules configured
3. County mapping tables populated
4. Integration tests passed
5. Performance benchmarks met

### Deployment Steps
1. Deploy database changes
2. Update API endpoints
3. Deploy frontend changes
4. Verify integration points
5. Monitor system performance

### Rollback Plan
1. Database rollback scripts available
2. Previous version deployment ready
3. Data backup procedures in place
4. Monitoring for system issues

## Maintenance Procedures

### Regular Maintenance
1. **Weekly:**
   - Tag generation performance monitoring
   - Database index optimization
   - Error rate analysis

2. **Monthly:**
   - County mapping updates
   - Tag format compliance review
   - User feedback analysis

3. **Quarterly:**
   - System performance optimization
   - Feature enhancement evaluation
   - Compliance audit

### Troubleshooting Guide

#### Common Issues
1. **Tags Not Generated:**
   - Check CSV field mapping
   - Verify date format
   - Validate address data

2. **Invalid Tag Formats:**
   - Review validation rules
   - Check character restrictions
   - Verify length limits

3. **Performance Issues:**
   - Monitor database queries
   - Check tag indexing
   - Optimize bulk operations

#### Emergency Procedures
1. **System Failure:**
   - Enable manual tagging mode
   - Notify system administrators
   - Implement temporary workarounds

2. **Data Corruption:**
   - Execute backup restoration
   - Validate data integrity
   - Re-run tag generation if needed

## Success Metrics

### Key Performance Indicators (KPIs)
1. **Automation Rate:** 100% of uploaded leads tagged automatically
2. **Tag Accuracy:** 99%+ compliance with format specifications
3. **Campaign Performance:** 25% improvement in targeting precision
4. **User Efficiency:** 50% reduction in campaign setup time
5. **System Performance:** < 100ms average response time for tag operations

### Reporting Requirements
- Daily: Tag generation statistics
- Weekly: System performance metrics
- Monthly: User adoption and feedback
- Quarterly: ROI analysis and system optimization

## Risk Management

### Identified Risks
1. **High Risk:** Database performance degradation with large datasets
2. **Medium Risk:** County mapping completeness for new markets
3. **Low Risk:** User adoption resistance to automated system

### Mitigation Strategies
1. Database optimization and monitoring
2. Expandable county mapping system
3. Comprehensive user training and documentation

## Conclusion

The Lead Tagging System provides automated, standardized lead categorization that enhances campaign targeting precision and operational efficiency. The system integrates seamlessly with existing SMS marketing workflows while providing robust validation and management capabilities.

## Document Control

**Version History:**
- v1.0 - Initial release documentation
- 
**Next Review Date:** December 6, 2025  
**Document Owner:** Development Team  
**Approval:** Project Manager, Technical Lead