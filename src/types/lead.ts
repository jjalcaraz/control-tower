export interface Lead {
  id: string | number
  firstName: string
  lastName: string
  primaryPhone: string
  secondaryPhone?: string
  alternatePhone?: string
  phone?: string
  email?: string
  address: {
    street: string
    city: string
    state: string
    zip: string
    county: string
  }
  property: {
    parcelId?: string
    acreage?: number
    estimatedValue?: number
    propertyType: string
  }
  leadSource: string
  status: 'new' | 'contacted' | 'interested' | 'not_interested' | 'do_not_contact'
  score: 'cold' | 'warm' | 'hot'
  tags: string[]
  customFields: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface LeadList {
  id: string | number
  name: string
  description: string
  leadCount: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface LeadImport {
  id: string | number
  fileName: string
  status: 'processing' | 'completed' | 'failed'
  totalRows: number
  successfulRows: number
  failedRows: number
  errors: string[]
  createdAt: string
}

export interface LeadFilter {
  search?: string
  status?: Lead['status'][]
  score?: Lead['score'][]
  tags?: string[]
  leadSource?: string[]
  dateRange?: {
    start: string
    end: string
  }
}

export interface LeadExport {
  format: 'csv' | 'excel'
  filters: LeadFilter
  fields: string[]
}
