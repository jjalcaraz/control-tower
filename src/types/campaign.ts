export interface CampaignMessage {
  id: number
  content: string
  order: number
  delay?: number // minutes between messages in a sequence
  templateId?: number
  variables?: Record<string, string> // Template variables like {{firstName}}, {{propertyType}}
  mediaUrl?: string // For MMS support
}

export interface Campaign {
  id: number
  name: string
  description: string
  type: 'broadcast' | 'drip' | 'trigger' | 'followup'
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed'
  targetAudience: {
    leadListIds: number[]
    tags: string[]
    filters: Record<string, any>
  }
  messages: CampaignMessage[]
  schedule: {
    startDate: string
    endDate?: string
    sendTimes: string[] // ["09:00", "14:00", "17:00"]
    timezone: string
    rateLimiting: number // messages per minute
  }
  abTest?: {
    enabled: boolean
    variants: CampaignMessage[]
    splitPercentage: number
    winnerCriteria: 'replies' | 'conversions' | 'opt_out_rate'
    testDuration: number // hours
    autoPromote: boolean // Automatically promote winning variant
  }
  metrics: {
    totalSent: number
    delivered: number
    failed: number
    replies: number
    optOuts: number
    conversions: number
  }
  createdAt: string
  updatedAt: string
}

export interface MessageTemplate {
  id: number
  name: string
  description: string
  category: 'welcome' | 'followup' | 'nurture' | 'promotional' | 'custom'
  content: string
  variables: string[] // Available template variables
  usageCount: number
  createdAt: string
  updatedAt: string
}

export interface CampaignTemplate {
  id: number
  name: string
  description: string
  category: string
  messages: Omit<CampaignMessage, 'id'>[]
  tags: string[]
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface CampaignExecution {
  id: number
  campaignId: number
  leadId: number
  messageId: number
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'replied'
  sentAt?: string
  deliveredAt?: string
  failedReason?: string
  reply?: string
}