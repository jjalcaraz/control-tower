// Core Entity Types
export interface Campaign {
  id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  description?: string
  messagesSent?: number
  responses?: number
  cost?: number
  createdAt: string
  updatedAt: string
  abTest?: {
    enabled: boolean
    winner?: 'A' | 'B'
  }
}

export interface Lead {
  id: string
  firstName: string
  lastName: string
  primaryPhone: string
  secondaryPhone?: string
  alternatePhone?: string
  phone?: string
  email?: string
  campaignId?: string
  estimatedValue?: number
  score?: number
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'disqualified'
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  content: string
  from: string
  to: string
  campaignId?: string
  leadId?: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  timestamp: string
  direction: 'inbound' | 'outbound'
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'campaign_manager' | 'operator' | 'viewer'
  organizationId: string
  createdAt: string
  lastLoginAt?: string
}

export interface Organization {
  id: string
  name: string
  subscriptionPlan: 'starter' | 'professional' | 'enterprise'
  settings: {
    timezone: string
    businessHours: {
      start: string
      end: string
      days: string[]
    }
    compliance: {
      tcpaConsent: boolean
      optOutKeywords: string[]
    }
  }
}

// API Response Types
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  errors?: string[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// Form and UI Types
export interface FormField {
  id: string
  label: string
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'checkbox'
  required: boolean
  value?: string | boolean
  options?: { label: string; value: string }[]
  validation?: {
    pattern?: string
    minLength?: number
    maxLength?: number
  }
}

export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
}

// Analytics Types
export interface MetricValue {
  current: number
  previous: number
  change: number
  changePercent: number
}

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface TimeSeriesData {
  metrics: ChartDataPoint[]
  period: 'hour' | 'day' | 'week' | 'month'
  total: number
  average: number
  change: number
}

// Export commonly used type unions
export type CampaignStatus = Campaign['status']
export type LeadStatus = Lead['status']
export type UserRole = User['role']
export type MessageStatus = Message['status']
export type MessageDirection = Message['direction']
