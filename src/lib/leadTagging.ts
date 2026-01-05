/**
 * Lead Automatic Tagging System
 * Generates strategic tags for land owner leads during bulk upload
 * 
 * Tag Format:
 * 1. Time Tag (Required): MMMYY (e.g., SEP25, OCT25)
 * 2. Geographic Tag (Required): STATE-COUNTY (e.g., TX-HAR, FL-MIA)
 * 3. Property Tag (Optional): Acreage-based (e.g., 1-5AC, 5-10AC, 10+AC)
 */

export interface LeadData {
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
    county?: string
  }
  property?: {
    acreage?: number
    propertyType?: string
    estimatedValue?: number
  }
  leadSource?: string
  tags?: string[]
  [key: string]: any
}

export interface TaggingOptions {
  includeTimeTag?: boolean
  includeGeographicTag?: boolean
  includePropertyTag?: boolean
  customUploadDate?: Date
  tagSeparator?: string
}

/**
 * County abbreviation mapping for common counties
 * Add more mappings as needed for your target areas
 */
const COUNTY_ABBREVIATIONS: Record<string, string> = {
  // Texas Counties
  'harris': 'HAR',
  'dallas': 'DAL', 
  'tarrant': 'TAR',
  'bexar': 'BEX',
  'travis': 'TRA',
  'collin': 'COL',
  'fort bend': 'FTB',
  'denton': 'DEN',
  'jefferson': 'JEF',
  'hidalgo': 'HID',
  'williamson': 'WIL',
  'galveston': 'GAL',
  'brazoria': 'BRA',
  'montgomery': 'MON',
  'bell': 'BEL',
  
  // Florida Counties
  'miami-dade': 'MIA',
  'broward': 'BRO',
  'palm beach': 'PB',
  'hillsborough': 'HIL',
  'orange florida': 'ORA',
  'pinellas': 'PIN',
  'duval': 'DUV',
  'brevard': 'BRE',
  'volusia': 'VOL',
  'polk': 'POL',
  'pasco': 'PAS',
  'seminole': 'SEM',
  'sarasota': 'SAR',
  'manatee': 'MAN',
  'lake': 'LAK',
  
  // California Counties
  'los angeles': 'LA',
  'san diego': 'SD',
  'orange county': 'OC',
  'riverside': 'RIV',
  'san bernardino': 'SB',
  'santa clara': 'SC',
  'alameda': 'ALA',
  'sacramento': 'SAC',
  'contra costa': 'CC',
  'fresno': 'FRE',
  'kern': 'KER',
  'san francisco': 'SF',
  'ventura': 'VEN',
  'san mateo': 'SM',
  'solano': 'SOL'
}

/**
 * State abbreviation mapping
 */
const STATE_ABBREVIATIONS: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
}

/**
 * Generates a time tag based on upload date
 * Format: MMMYY (e.g., SEP25, OCT25, NOV25)
 */
export function generateTimeTag(uploadDate: Date = new Date()): string {
  const monthNames = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ]
  
  const month = monthNames[uploadDate.getMonth()]
  const year = uploadDate.getFullYear().toString().slice(-2)
  
  return `${month}${year}`
}

/**
 * Generates a geographic tag based on state and county
 * Format: STATE-COUNTY (e.g., TX-HAR, FL-MIA, CA-LA)
 */
export function generateGeographicTag(state?: string, county?: string): string | null {
  if (!state) return null
  
  // Clean and normalize state
  const cleanState = state.trim().toLowerCase()
  const stateAbbr = STATE_ABBREVIATIONS[cleanState] || cleanState.toUpperCase().slice(0, 2)
  
  if (!county) {
    return stateAbbr
  }
  
  // Clean and normalize county
  const cleanCounty = county.trim().toLowerCase()
    .replace(/\s+county$/i, '') // Remove "county" suffix
    .replace(/\s+parish$/i, '') // Remove "parish" suffix (Louisiana)
  
  // Get county abbreviation
  const countyAbbr = COUNTY_ABBREVIATIONS[cleanCounty] || 
    cleanCounty.toUpperCase().replace(/\s+/g, '').slice(0, 3)
  
  return `${stateAbbr}-${countyAbbr}`
}

/**
 * Generates a property tag based on acreage
 * Format: X-YAC or X+AC (e.g., 1-5AC, 5-10AC, 10+AC)
 */
export function generatePropertyTag(acreage?: number): string | null {
  if (typeof acreage !== 'number' || acreage <= 0) return null
  
  if (acreage < 1) {
    return '0-1AC'
  } else if (acreage >= 1 && acreage < 5) {
    return '1-5AC'
  } else if (acreage >= 5 && acreage < 10) {
    return '5-10AC'
  } else if (acreage >= 10 && acreage < 25) {
    return '10-25AC'
  } else if (acreage >= 25 && acreage < 50) {
    return '25-50AC'
  } else if (acreage >= 50 && acreage < 100) {
    return '50-100AC'
  } else {
    return '100+AC'
  }
}

/**
 * Main function to generate automatic tags for a lead
 */
export function generateLeadTags(
  leadData: LeadData,
  options: TaggingOptions = {}
): string[] {
  const {
    includeTimeTag = true,
    includeGeographicTag = true,
    includePropertyTag = true,
    customUploadDate = new Date(),
    tagSeparator = ','
  } = options
  
  const tags: string[] = []
  
  // 1. Time Tag (Required)
  if (includeTimeTag) {
    const timeTag = generateTimeTag(customUploadDate)
    tags.push(timeTag)
  }
  
  // 2. Geographic Tag (Required if location data available)
  if (includeGeographicTag) {
    const geoTag = generateGeographicTag(
      leadData.address?.state,
      leadData.address?.county
    )
    if (geoTag) {
      tags.push(geoTag)
    }
  }
  
  // 3. Property Tag (Optional, only if acreage available)
  if (includePropertyTag && leadData.property?.acreage) {
    const propTag = generatePropertyTag(leadData.property.acreage)
    if (propTag) {
      tags.push(propTag)
    }
  }
  
  return tags
}

/**
 * Batch processes multiple leads and adds automatic tags
 */
export function batchTagLeads(
  leads: LeadData[],
  options: TaggingOptions = {}
): LeadData[] {
  return leads.map(lead => {
    const autoTags = generateLeadTags(lead, options)
    
    // Merge with existing tags if any
    const existingTags = lead.tags || []
    const allTags = [...new Set([...autoTags, ...existingTags])] // Remove duplicates
    
    return {
      ...lead,
      tags: allTags
    }
  })
}

/**
 * Validates tag format and returns cleaned tags
 */
export function validateAndCleanTags(tags: string[]): string[] {
  return tags
    .map(tag => tag.trim().toUpperCase())
    .filter(tag => tag.length > 0)
    .filter(tag => /^[A-Z0-9\-+]+$/.test(tag)) // Only allow alphanumeric, hyphens, and plus
    .slice(0, 3) // Maximum 3 tags per lead
}

/**
 * Converts tags array to comma-separated string
 */
export function tagsToString(tags: string[], separator: string = ','): string {
  return validateAndCleanTags(tags).join(separator)
}

/**
 * Converts comma-separated tag string to array
 */
export function tagsFromString(tagString: string, separator: string = ','): string[] {
  if (!tagString) return []
  
  return tagString
    .split(separator)
    .map(tag => tag.trim().toUpperCase())
    .filter(tag => tag.length > 0)
}

/**
 * Get all unique tags from a list of leads (for campaign filtering)
 */
export function extractAllTags(leads: LeadData[]): string[] {
  const allTags = new Set<string>()
  
  leads.forEach(lead => {
    if (lead.tags) {
      lead.tags.forEach(tag => allTags.add(tag.toUpperCase()))
    }
  })
  
  return Array.from(allTags).sort()
}

/**
 * Filter leads by tags (for campaign targeting)
 */
export function filterLeadsByTags(leads: LeadData[], targetTags: string[]): LeadData[] {
  if (targetTags.length === 0) return leads
  
  const upperTargetTags = targetTags.map(tag => tag.toUpperCase())
  
  return leads.filter(lead => {
    if (!lead.tags || lead.tags.length === 0) return false
    
    const leadTags = lead.tags.map(tag => tag.toUpperCase())
    return upperTargetTags.some(targetTag => leadTags.includes(targetTag))
  })
}

/**
 * Get leads count by tag (for campaign preview)
 */
export function getLeadCountByTag(leads: LeadData[]): Record<string, number> {
  const tagCounts: Record<string, number> = {}
  
  leads.forEach(lead => {
    if (lead.tags) {
      lead.tags.forEach(tag => {
        const upperTag = tag.toUpperCase()
        tagCounts[upperTag] = (tagCounts[upperTag] || 0) + 1
      })
    }
  })
  
  return tagCounts
}

/**
 * Example usage and testing function
 */
export function testTagGeneration(): void {
  const sampleLeads: LeadData[] = [
    {
      firstName: 'John',
      lastName: 'Smith',
      phone: '+15551234567',
      address: {
        state: 'Texas',
        county: 'Harris County'
      },
      property: {
        acreage: 7.5
      }
    },
    {
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '+15557654321',
      address: {
        state: 'FL',
        county: 'Miami-Dade'
      },
      property: {
        acreage: 2.1
      }
    },
    {
      firstName: 'Bob',
      lastName: 'Wilson',
      phone: '+15559876543',
      address: {
        state: 'California',
        county: 'Los Angeles'
      }
      // No acreage data
    }
  ]
  
  console.log('=== Lead Tagging System Test ===')
  
  const taggedLeads = batchTagLeads(sampleLeads)
  
  taggedLeads.forEach((lead, index) => {
    console.log(`\nLead ${index + 1}: ${lead.firstName} ${lead.lastName}`)
    console.log(`Location: ${lead.address?.state}, ${lead.address?.county}`)
    console.log(`Acreage: ${lead.property?.acreage || 'N/A'}`)
    console.log(`Generated Tags: ${lead.tags?.join(', ') || 'None'}`)
  })
  
  const allTags = extractAllTags(taggedLeads)
  console.log(`\nAll unique tags: ${allTags.join(', ')}`)
  
  const tagCounts = getLeadCountByTag(taggedLeads)
  console.log('\nTag counts:', tagCounts)
}