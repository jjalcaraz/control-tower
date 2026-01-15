import { Lead } from '@/types/lead'

export interface DuplicateMatch {
  lead: Lead
  duplicates: Lead[]
  matchReasons: string[]
  confidenceScore: number
}

export interface DuplicateDetectionOptions {
  phoneMatch: boolean
  emailMatch: boolean
  nameAddressMatch: boolean
  strictMode: boolean
}

/**
 * Service for detecting duplicate leads based on multiple criteria
 */
export class DuplicateDetectionService {
  private static getLeadPhones(lead: Lead): string[] {
    return [lead.primaryPhone, lead.secondaryPhone, lead.alternatePhone, lead.phone].filter(Boolean) as string[]
  }

  private static normalizePhone(phone: string): string {
    // Remove all non-digit characters and standardize format
    return phone.replace(/\D/g, '').replace(/^1/, '')
  }

  private static normalizeEmail(email: string): string {
    return email.toLowerCase().trim()
  }

  private static normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/[^\w\s]/g, '')
  }

  private static normalizeAddress(address: string): string {
    return address.toLowerCase()
      .trim()
      .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|place|pl)\b/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
  }

  private static calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    const len1 = str1.length
    const len2 = str2.length

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        }
      }
    }

    return matrix[len2][len1]
  }

  private static getSimilarityScore(str1: string, str2: string): number {
    if (!str1 || !str2) return 0
    const maxLength = Math.max(str1.length, str2.length)
    if (maxLength === 0) return 1
    const distance = this.calculateLevenshteinDistance(str1, str2)
    return (maxLength - distance) / maxLength
  }

  /**
   * Detects duplicates for a single lead against a list of existing leads
   */
  static detectDuplicatesForLead(
    targetLead: Lead,
    existingLeads: Lead[],
    options: DuplicateDetectionOptions = {
      phoneMatch: true,
      emailMatch: true,
      nameAddressMatch: true,
      strictMode: false
    }
  ): DuplicateMatch | null {
    const duplicates: Lead[] = []
    const matchReasons: string[] = []
    let maxConfidence = 0

    for (const existingLead of existingLeads) {
      if (existingLead.id === targetLead.id) continue

      let leadConfidence = 0
      const leadReasons: string[] = []

      // Phone number matching
      if (options.phoneMatch) {
        const targetPhones = this.getLeadPhones(targetLead).map(phone => this.normalizePhone(phone))
        const existingPhones = this.getLeadPhones(existingLead).map(phone => this.normalizePhone(phone))

        const hasMatch = targetPhones.some(phone => existingPhones.includes(phone))
        if (hasMatch) {
          leadConfidence += 0.4 // High confidence for exact phone match
          leadReasons.push('Exact phone number match')
        }
      }

      // Email matching
      if (options.emailMatch && targetLead.email && existingLead.email) {
        const normalizedTargetEmail = this.normalizeEmail(targetLead.email)
        const normalizedExistingEmail = this.normalizeEmail(existingLead.email)
        
        if (normalizedTargetEmail === normalizedExistingEmail) {
          leadConfidence += 0.3 // Medium-high confidence for email match
          leadReasons.push('Exact email address match')
        }
      }

      // Name and address matching
      if (options.nameAddressMatch) {
        const targetFullName = this.normalizeName(`${targetLead.firstName} ${targetLead.lastName}`)
        const existingFullName = this.normalizeName(`${existingLead.firstName} ${existingLead.lastName}`)
        
        const nameSimilarity = this.getSimilarityScore(targetFullName, existingFullName)
        
        if (nameSimilarity >= 0.8) {
          leadConfidence += nameSimilarity * 0.2 // Lower confidence for name similarity
          leadReasons.push(`Name similarity: ${Math.round(nameSimilarity * 100)}%`)
          
          // If names are similar, check address
          if (targetLead.address && existingLead.address) {
            const targetAddress = this.normalizeAddress(
              `${targetLead.address.street} ${targetLead.address.city} ${targetLead.address.state}`
            )
            const existingAddress = this.normalizeAddress(
              `${existingLead.address.street} ${existingLead.address.city} ${existingLead.address.state}`
            )
            
            const addressSimilarity = this.getSimilarityScore(targetAddress, existingAddress)
            
            if (addressSimilarity >= 0.7) {
              leadConfidence += addressSimilarity * 0.1
              leadReasons.push(`Address similarity: ${Math.round(addressSimilarity * 100)}%`)
            }
          }
        }
      }

      // Determine if this is a duplicate based on confidence threshold
      const threshold = options.strictMode ? 0.6 : 0.4
      
      if (leadConfidence >= threshold) {
        duplicates.push(existingLead)
        
        if (leadConfidence > maxConfidence) {
          maxConfidence = leadConfidence
          matchReasons.length = 0
          matchReasons.push(...leadReasons)
        } else if (leadConfidence === maxConfidence) {
          matchReasons.push(...leadReasons)
        }
      }
    }

    if (duplicates.length > 0) {
      return {
        lead: targetLead,
        duplicates,
        matchReasons: [...new Set(matchReasons)], // Remove duplicates
        confidenceScore: maxConfidence
      }
    }

    return null
  }

  /**
   * Detects all duplicates in a list of leads
   */
  static detectAllDuplicates(
    leads: Lead[],
    options?: DuplicateDetectionOptions
  ): DuplicateMatch[] {
    const duplicateMatches: DuplicateMatch[] = []
    const processedIds = new Set<number>()

    for (const lead of leads) {
      const leadId = Number(lead.id)
      if (processedIds.has(leadId)) continue

      const duplicateMatch = this.detectDuplicatesForLead(
        lead,
        leads.filter(l => !processedIds.has(Number(l.id))),
        options
      )

      if (duplicateMatch) {
        duplicateMatches.push(duplicateMatch)
        processedIds.add(leadId)
        duplicateMatch.duplicates.forEach(dup => processedIds.add(Number(dup.id)))
      } else {
        processedIds.add(leadId)
      }
    }

    return duplicateMatches
  }

  /**
   * Suggests which lead to keep when merging duplicates
   */
  static suggestPrimaryLead(leads: Lead[]): Lead {
    if (leads.length === 0) throw new Error('No leads provided')
    if (leads.length === 1) return leads[0]

    // Score leads based on completeness and recency
    const scoredLeads = leads.map(lead => {
      let score = 0

      // Completeness score
      if (lead.firstName) score += 1
      if (lead.lastName) score += 1
      if (this.getLeadPhones(lead).length > 0) score += 2 // Phone is most important
      if (lead.email) score += 1
      if (lead.address?.street) score += 1
      if (lead.address?.city) score += 1
      if (lead.address?.state) score += 1
      if (lead.property?.propertyType) score += 1
      if (lead.property?.estimatedValue) score += 1
      if (lead.leadSource) score += 0.5
      if (lead.tags?.length) score += 0.5

      // Recency score (more recent = higher score)
      const daysSinceCreated = (new Date().getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      score += Math.max(0, 30 - daysSinceCreated) / 30 // Max 1 point for recency

      // Activity score (if lead has been contacted or responded)
      if (lead.status !== 'new') score += 1
      if (lead.score === 'hot') score += 2
      else if (lead.score === 'warm') score += 1

      return { lead, score }
    })

    // Return the lead with the highest score
    scoredLeads.sort((a, b) => b.score - a.score)
    return scoredLeads[0].lead
  }

  /**
   * Merges duplicate leads into a single lead
   */
  static mergeLeads(leads: Lead[]): Partial<Lead> {
    if (leads.length === 0) throw new Error('No leads provided')
    if (leads.length === 1) return leads[0]

    const primaryLead = this.suggestPrimaryLead(leads)
    const merged: Partial<Lead> = { ...primaryLead }

    // Merge fields from all leads, preferring non-empty values
    for (const lead of leads) {
      if (!merged.firstName && lead.firstName) merged.firstName = lead.firstName
      if (!merged.lastName && lead.lastName) merged.lastName = lead.lastName
      if (!merged.phone) {
        const phones = this.getLeadPhones(lead)
        if (phones.length > 0) merged.phone = phones[0]
      }
      if (!merged.email && lead.email) merged.email = lead.email
      
      // Merge address
      if (!merged.address) {
        merged.address = {
          street: '',
          city: '',
          state: '',
          zip: '',
          county: ''
        }
      }
      if (!merged.address.street && lead.address?.street) merged.address.street = lead.address.street
      if (!merged.address.city && lead.address?.city) merged.address.city = lead.address.city
      if (!merged.address.state && lead.address?.state) merged.address.state = lead.address.state
      if (!merged.address.zip && lead.address?.zip) merged.address.zip = lead.address.zip
      if (!merged.address.county && lead.address?.county) merged.address.county = lead.address.county

      // Merge property info
      if (!merged.property) {
        merged.property = {
          propertyType: ''
        }
      }
      if (!merged.property.propertyType && lead.property?.propertyType) {
        merged.property.propertyType = lead.property.propertyType
      }
      if (!merged.property.acreage && lead.property?.acreage) {
        merged.property.acreage = lead.property.acreage
      }
      if (!merged.property.estimatedValue && lead.property?.estimatedValue) {
        merged.property.estimatedValue = lead.property.estimatedValue
      }
      if (!merged.property.parcelId && lead.property?.parcelId) {
        merged.property.parcelId = lead.property.parcelId
      }

      // Merge other fields
      if (!merged.leadSource && lead.leadSource) merged.leadSource = lead.leadSource
      
      // Merge tags (combine unique tags)
      if (lead.tags && lead.tags.length > 0) {
        merged.tags = [...new Set([...(merged.tags || []), ...lead.tags])]
      }

      // Merge custom fields
      if (lead.customFields && Object.keys(lead.customFields).length > 0) {
        merged.customFields = { ...merged.customFields, ...lead.customFields }
      }

      // Use the most advanced status
      const statusPriority = { 'new': 0, 'contacted': 1, 'interested': 2, 'not_interested': 1, 'do_not_contact': 3 }
      if (statusPriority[lead.status] > statusPriority[merged.status as keyof typeof statusPriority]) {
        merged.status = lead.status
      }

      // Use the hottest score
      const scorePriority = { 'cold': 0, 'warm': 1, 'hot': 2 }
      if (scorePriority[lead.score] > scorePriority[merged.score as keyof typeof scorePriority]) {
        merged.score = lead.score
      }
    }

    return merged
  }
}
