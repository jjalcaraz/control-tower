import axios, { AxiosError, AxiosResponse } from 'axios'
import { AuthResponse } from '@/types/auth'
import * as mockData from './mock-data'

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const suppressErrors = import.meta.env.VITE_SUPPRESS_API_ERRORS === 'true'

const API_BASE_URL = isDemoMode ? null : ((import.meta as any).env.VITE_API_URL || 'http://localhost:8000/api')
const API_TIMEOUT = parseInt((import.meta as any).env.VITE_API_TIMEOUT || '30000')

// In demo mode, we don't create an axios instance to prevent API calls
const api = isDemoMode ? null : axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
if (api) {
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )
}

// Response interceptor to handle auth errors and API response format
if (api) {
  api.interceptors.response.use(
    (response: AxiosResponse) => {
      // Handle backend API response format
      if (response.data && typeof response.data === 'object') {
        // If response has success field, normalize it
        if ('success' in response.data) {
          if (response.data.success === false) {
            throw new Error(response.data.error?.message || 'API request failed')
          }
          return {
            ...response,
            data: response.data.data || response.data,
          }
        }
      }
      return response
    },
    async (error: AxiosError) => {
      // Handle authentication errors
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }

      // Handle API error format
      if (error.response?.data && typeof error.response.data === 'object') {
        const errorData = error.response.data as any
        if (errorData.success === false && errorData.error) {
          const errorMessage = errorData.error.message || errorData.error.detail || 'API request failed'
          return Promise.reject(new Error(errorMessage))
        }
      }

      // Handle network errors and timeouts
      if (error.code === 'ECONNABORTED') {
        return Promise.reject(new Error('Request timeout. Please try again.'))
      }

      if (!error.response) {
        return Promise.reject(new Error('Network error. Please check your connection.'))
      }

      // Handle other HTTP errors
      const statusText = error.response.statusText || 'Unknown error'
      return Promise.reject(new Error(`API Error (${error.response.status}): ${statusText}`))
    }
  )
}

// Demo API helper - returns mock data when in demo mode
const demoApi = {
  get: async (url: string, config?: any) => {
    if (!suppressErrors) {
      console.log(`Demo API: GET ${url} (returning mock data)`)
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Return mock data based on URL
    if (url.includes('/analytics/dashboard')) {
      return { data: mockData.mockDashboardMetrics }
    }
    if (url.includes('/leads')) {
      return { data: { data: mockData.mockLeads, total: mockData.mockLeads.length } }
    }
    if (url.includes('/campaigns')) {
      return { data: { data: mockData.mockCampaigns, total: mockData.mockCampaigns.length } }
    }
    if (url.includes('/templates')) {
      return { data: { data: mockData.mockTemplates, total: mockData.mockTemplates.length } }
    }
    if (url.includes('/conversations')) {
      return { data: { data: mockData.mockMessages, total: mockData.mockMessages.length } }
    }

    return { data: {} }
  },
  post: async (url: string, data?: any, config?: any) => {
    if (!suppressErrors) {
      console.log(`Demo API: POST ${url} (mock response)`)
    }

    await new Promise(resolve => setTimeout(resolve, 300))
    return { data: { success: true, data } }
  },
  put: async (url: string, data?: any, config?: any) => {
    if (!suppressErrors) {
      console.log(`Demo API: PUT ${url} (mock response)`)
    }

    await new Promise(resolve => setTimeout(resolve, 300))
    return { data: { success: true, data } }
  },
  delete: async (url: string, config?: any) => {
    if (!suppressErrors) {
      console.log(`Demo API: DELETE ${url} (mock response)`)
    }

    await new Promise(resolve => setTimeout(resolve, 300))
    return { data: { success: true } }
  }
}

// Helper function to get the right API client
const getApiClient = () => {
  return isDemoMode ? demoApi : api
}

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const client = getApiClient()
    if (isDemoMode) {
      // Mock login in demo mode
      return {
        user: {
          id: 1,
          email,
          username: email.split('@')[0],
          role: 'admin',
          isActive: true
        },
        token: 'mock-token',
        refreshToken: 'mock-refresh-token'
      } as AuthResponse
    }
    const response = await client.post('/auth/login', { email, password })
    return response.data
  },

  register: async (userData: {
    username: string
    email: string
    password: string
  }): Promise<AuthResponse> => {
    if (isDemoMode) {
      return {
        user: {
          id: 1,
          email: userData.email,
          username: userData.username,
          role: 'admin',
          isActive: true
        },
        token: 'mock-token',
        refreshToken: 'mock-refresh-token'
      } as AuthResponse
    }
    const client = getApiClient()
    const response = await client.post('/auth/register', userData)
    return response.data
  },

  logout: async (): Promise<void> => {
    if (isDemoMode) return
    const client = getApiClient()
    await client.post('/auth/logout')
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    if (isDemoMode) {
      return {
        user: {
          id: 1,
          email: 'demo@example.com',
          username: 'demo',
          role: 'admin',
          isActive: true
        },
        token: 'mock-token',
        refreshToken: 'mock-refresh-token'
      } as AuthResponse
    }
    const client = getApiClient()
    const response = await client.post('/auth/refresh', { refreshToken })
    return response.data
  },

  getCurrentUser: async () => {
    if (isDemoMode) {
      return {
        id: 1,
        email: 'demo@example.com',
        username: 'demo',
        role: 'admin',
        isActive: true
      }
    }
    const client = getApiClient()
    const response = await client.get('/auth/me')
    return response.data
  },

  setupTwoFactor: async () => {
    if (isDemoMode) {
      return { qr_code: 'mock-qr-code', secret: 'mock-secret' }
    }
    const client = getApiClient()
    const response = await client.post('/auth/2fa/setup')
    return response.data
  },

  verifyTwoFactor: async (token: string) => {
    if (isDemoMode) {
      return { verified: true }
    }
    const client = getApiClient()
    const response = await client.post('/auth/2fa/verify', { token })
    return response.data
  },

  disableTwoFactor: async (token: string) => {
    if (isDemoMode) {
      return { disabled: true }
    }
    const client = getApiClient()
    const response = await client.post('/auth/2fa/disable', { token })
    return response.data
  },
}

// Leads API
export const leadsApi = {
  getLeads: async (params?: {
    page?: number
    limit?: number
    search?: string
    status?: string[]
    tags?: string[]
  }) => {
    const response = await api.get('/v1/leads', { params })
    return response.data
  },

  getLead: async (id: number) => {
    const response = await api.get(`/v1/leads/${id}`)
    return response.data
  },

  createLead: async (leadData: any) => {
    const response = await api.post('/v1/leads', leadData)
    return response.data
  },

  updateLead: async (id: number, leadData: any) => {
    const response = await api.patch(`/v1/leads/${id}`, leadData)
    return response.data
  },

  deleteLead: async (id: number) => {
    const response = await api.delete(`/v1/leads/${id}`)
    return response.data
  },

  importLeads: async (file: File, mappings: Record<string, string>, bulkTags?: string[], autoTaggingEnabled?: boolean, taggingOptions?: any) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mappings', JSON.stringify(mappings))

    if (bulkTags) {
      formData.append('bulkTags', JSON.stringify(bulkTags))
    }

    if (autoTaggingEnabled !== undefined) {
      formData.append('autoTaggingEnabled', String(autoTaggingEnabled))
    }

    if (taggingOptions) {
      formData.append('taggingOptions', JSON.stringify(taggingOptions))
    }

    const response = await api.post('/v1/leads/import/execute', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getImportStatus: async (importId: string) => {
    const response = await api.get(`/v1/leads/import/${importId}`)
    return response.data
  },

  exportLeads: async (filters: any, format: 'csv' | 'excel') => {
    const response = await api.post('/v1/leads/export', { filters, format }, {
      responseType: 'blob',
    })
    return response.data
  },

  bulkUpdate: async (leadIds: number[], updates: any) => {
    const response = await api.post('/v1/leads/bulk-update', { leadIds, updates })
    return response.data
  },

  bulkDelete: async (leadIds: number[]) => {
    const response = await api.post('/v1/leads/bulk-delete', { leadIds })
    return response.data
  },
}

// Campaigns API
export const campaignsApi = {
  getCampaigns: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await api.get('/v1/campaigns', { params })
    return response.data
  },

  getCampaign: async (id: number) => {
    const response = await api.get(`/v1/campaigns/${id}`)
    return response.data
  },

  createCampaign: async (campaignData: any) => {
    const response = await api.post('/v1/campaigns', campaignData)
    return response.data
  },

  updateCampaign: async (id: number, campaignData: any) => {
    const response = await api.patch(`/v1/campaigns/${id}`, campaignData)
    return response.data
  },

  deleteCampaign: async (id: number) => {
    const response = await api.delete(`/v1/campaigns/${id}`)
    return response.data
  },

  startCampaign: async (id: number) => {
    const response = await api.post(`/v1/campaigns/${id}/start`)
    return response.data
  },

  pauseCampaign: async (id: number) => {
    const response = await api.post(`/v1/campaigns/${id}/pause`)
    return response.data
  },

  resumeCampaign: async (id: number) => {
    const response = await api.post(`/v1/campaigns/${id}/resume`)
    return response.data
  },

  stopCampaign: async (id: number) => {
    const response = await api.post(`/v1/campaigns/${id}/stop`)
    return response.data
  },

  getCampaignStats: async (id: number) => {
    const response = await api.get(`/v1/campaigns/${id}/stats`)
    return response.data
  },

  getCampaignMetrics: async (id: number) => {
    const response = await api.get(`/v1/campaigns/${id}/metrics`)
    return response.data
  },

  buildCampaignTargets: async (id: number) => {
    const response = await api.post(`/v1/campaigns/${id}/build-targets`)
    return response.data
  },

  getTemplates: async () => {
    const response = await api.get('/v1/campaigns/templates')
    return response.data
  },
}

// Messages API
export const messagesApi = {
  getConversations: async (params?: { page?: number; limit?: number; status?: string; unread_count_gt?: number; starred?: boolean }) => {
    const response = await api.get('/v1/messages/conversations', { params })
    return response.data
  },

  getConversation: async (id: number) => {
    const response = await api.get(`/v1/messages/conversations/${id}`)
    return response.data
  },

  sendMessage: async (conversationId: number, content: string) => {
    const response = await api.post('/v1/messages/send', {
      conversation_id: conversationId,
      content,
    })
    return response.data
  },

  sendMessageToLead: async (phoneNumber: string, content: string, leadId?: number) => {
    const response = await api.post('/v1/messages/send', {
      phone_number: phoneNumber,
      content,
      lead_id: leadId,
    })
    return response.data
  },

  markAsRead: async (conversationId: number) => {
    const response = await api.post(`/v1/messages/conversations/${conversationId}/read`)
    return response.data
  },

  getTemplates: async () => {
    const response = await api.get('/v1/messages/templates')
    return response.data
  },

  getQuickResponses: async () => {
    const response = await api.get('/v1/messages/quick-responses')
    return response.data
  },

  archiveConversation: async (conversationId: number) => {
    const response = await api.put(`/v1/messages/conversations/${conversationId}/archive`)
    return response.data
  },

  deleteConversation: async (conversationId: number) => {
    const response = await api.delete(`/v1/messages/conversations/${conversationId}`)
    return response.data
  },

  starConversation: async (conversationId: number) => {
    const response = await api.put(`/v1/messages/conversations/${conversationId}/star`)
    return response.data
  },

  unstarConversation: async (conversationId: number) => {
    const response = await api.put(`/v1/messages/conversations/${conversationId}/unstar`)
    return response.data
  },

  markConversationRead: async (conversationId: number) => {
    const response = await api.post(`/v1/messages/conversations/${conversationId}/read`)
    return response.data
  },

  broadcastMessage: async (data: { content: string; leadIds?: number[]; filters?: any }) => {
    const response = await api.post('/v1/messages/broadcast', data)
    return response.data
  },
}

// Analytics API
export const analyticsApi = {
  getDashboardMetrics: async () => {
    const response = await api.get('/v1/analytics/dashboard')
    return response.data
  },

  getCampaignAnalytics: async (campaignId: number, timeRange: string) => {
    const response = await api.get(`/v1/analytics/campaigns/${campaignId}`, {
      params: { timeRange },
    })
    return response.data
  },

  getLeadAnalytics: async (timeRange: string) => {
    const response = await api.get('/v1/analytics/leads', {
      params: { timeRange },
    })
    return response.data
  },

  getMessageAnalytics: async (timeRange: string) => {
    const response = await api.get('/v1/analytics/messages', {
      params: { timeRange },
    })
    return response.data
  },

  getDeliveryRates: async (timeRange: string) => {
    const response = await api.get('/v1/analytics/delivery-rates', {
      params: { timeRange },
    })
    return response.data
  },

  getPhoneHealthAnalytics: async () => {
    const response = await api.get('/v1/analytics/phone-health')
    return response.data
  },

  getTrends: async (params?: { metric: string; timeRange: string }) => {
    const response = await api.get('/v1/analytics/trends', { params })
    return response.data
  },

  getROIAnalysis: async (timeRange: string) => {
    const response = await api.get('/v1/analytics/roi', {
      params: { timeRange },
    })
    return response.data
  },

  getConversionFunnel: async (campaignId?: number, timeRange?: string) => {
    const response = await api.get('/v1/analytics/conversion-funnel', {
      params: { campaignId, timeRange },
    })
    return response.data
  },

  compareCampaigns: async (campaignIds: number[], metrics?: string[]) => {
    const response = await api.post('/v1/analytics/campaigns/comparison', {
      campaignIds,
      metrics,
    })
    return response.data
  },
}

// Templates API
export const templatesApi = {
  getTemplates: async (params?: { page?: number; limit?: number; type?: string }) => {
    const response = await api.get('/v1/templates', { params })
    return response.data
  },

  getTemplate: async (id: number) => {
    const response = await api.get(`/v1/templates/${id}`)
    return response.data
  },

  createTemplate: async (templateData: any) => {
    const response = await api.post('/v1/templates', templateData)
    return response.data
  },

  updateTemplate: async (id: number, templateData: any) => {
    const response = await api.patch(`/v1/templates/${id}`, templateData)
    return response.data
  },

  deleteTemplate: async (id: number) => {
    const response = await api.delete(`/v1/templates/${id}`)
    return response.data
  },

  getTemplateStats: async (params?: { timeRange?: string }) => {
    const response = await api.get('/v1/templates/stats', { params })
    return response.data
  },

  duplicateTemplate: async (id: number) => {
    const response = await api.post(`/v1/templates/${id}/duplicate`)
    return response.data
  },

  testTemplate: async (id: number, testData: any) => {
    const response = await api.post(`/v1/templates/${id}/test`, testData)
    return response.data
  },

  getTemplatePerformance: async (id: number, timeRange?: string) => {
    const response = await api.get(`/v1/templates/${id}/performance`, {
      params: { timeRange },
    })
    return response.data
  },
}

// Phone Numbers API
export const phoneNumbersApi = {
  getPhoneNumbers: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await api.get('/v1/phone-numbers', { params })
    return response.data
  },

  getPhoneNumber: async (id: number) => {
    const response = await api.get(`/v1/phone-numbers/${id}`)
    return response.data
  },

  purchasePhoneNumber: async (phoneNumberData: any) => {
    const response = await api.post('/v1/phone-numbers/acquire', phoneNumberData)
    return response.data
  },

  releasePhoneNumber: async (id: number) => {
    const response = await api.delete(`/v1/phone-numbers/${id}`)
    return response.data
  },

  updatePhoneNumber: async (id: number, data: any) => {
    const response = await api.patch(`/v1/phone-numbers/${id}`, data)
    return response.data
  },

  getPhoneNumberHealth: async (id: number) => {
    const response = await api.get(`/v1/phone-numbers/${id}/health`)
    return response.data
  },

  testPhoneNumber: async (id: number, testData: any) => {
    const response = await api.post(`/v1/phone-numbers/${id}/test`, testData)
    return response.data
  },

  syncTwilioNumbers: async () => {
    const response = await api.post('/v1/phone-numbers/sync')
    return response.data
  },

  updatePhoneNumberSettings: async (id: number, settings: any) => {
    const response = await api.patch(`/v1/phone-numbers/${id}/settings`, settings)
    return response.data
  },

  getPhoneNumberAnalytics: async (id: number, timeRange?: string) => {
    const response = await api.get(`/v1/phone-numbers/${id}/analytics`, {
      params: { timeRange },
    })
    return response.data
  },
}

// Compliance API
export const complianceApi = {
  getOptOuts: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/v1/compliance/opt-outs', { params })
    return response.data
  },

  addOptOut: async (phoneNumber: string, reason?: string) => {
    const response = await api.post('/v1/compliance/opt-outs', { phoneNumber, reason })
    return response.data
  },

  removeOptOut: async (phoneNumber: string) => {
    const response = await api.delete(`/v1/compliance/opt-outs/${encodeURIComponent(phoneNumber)}`)
    return response.data
  },

  bulkOptOut: async (phoneNumbers: string[], reason?: string) => {
    const response = await api.post('/v1/compliance/opt-outs/bulk', {
      phoneNumbers,
      reason,
    })
    return response.data
  },

  getAuditLogs: async (params?: {
    page?: number
    limit?: number
    action?: string
    startDate?: string
    endDate?: string
  }) => {
    const response = await api.get('/v1/compliance/audit-logs', { params })
    return response.data
  },

  reports: {
    list: async (params?: { page?: number; limit?: number }) => {
      const response = await api.get('/v1/compliance/reports/list', { params })
      return response.data
    },

    download: async (reportId: string) => {
      const response = await api.get(`/v1/compliance/reports/${reportId}/download`, {
        responseType: 'blob',
      })
      return response.data
    },
  },

  getComplianceReport: async (startDate: string, endDate: string) => {
    const response = await api.get('/v1/compliance/reports', {
      params: { startDate, endDate },
      responseType: 'blob',
    })
    return response.data
  },

  generateComplianceReport: async (params: {
    type: string
    startDate: string
    endDate: string
    format?: string
  }) => {
    const response = await api.post('/v1/compliance/reports/generate', params)
    return response.data
  },

  getConsentRecords: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/v1/compliance/consent-records', { params })
    return response.data
  },

  updateConsentRecord: async (id: number, data: any) => {
    const response = await api.patch(`/v1/compliance/consent-records/${id}`, data)
    return response.data
  },

  getComplianceDashboard: async () => {
    const response = await api.get('/v1/compliance/dashboard')
    return response.data
  },
}

// Organizations API (Multi-tenant support)
export const organizationsApi = {
  getOrganizations: async () => {
    const response = await api.get('/organizations')
    return response.data
  },

  getCurrentOrganization: async () => {
    const response = await api.get('/organizations/current')
    return response.data
  },

  updateOrganization: async (id: number, data: any) => {
    const response = await api.put(`/organizations/${id}`, data)
    return response.data
  },

  getOrganizationUsers: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/organizations/users', { params })
    return response.data
  },

  inviteUser: async (email: string, role: string) => {
    const response = await api.post('/organizations/users/invite', { email, role })
    return response.data
  },

  updateUserRole: async (userId: number, role: string) => {
    const response = await api.put(`/organizations/users/${userId}`, { role })
    return response.data
  },

  removeUser: async (userId: number) => {
    const response = await api.delete(`/organizations/users/${userId}`)
    return response.data
  },
}

// Settings API
export const settingsApi = {
  getSettings: async () => {
    const response = await api.get('/settings')
    return response.data
  },

  updateSettings: async (settings: any) => {
    const response = await api.put('/settings', settings)
    return response.data
  },

  getIntegrationSettings: async () => {
    const response = await api.get('/settings/integrations')
    return response.data
  },

  updateIntegrationSettings: async (integrations: any) => {
    const response = await api.put('/settings/integrations', integrations)
    return response.data
  },

  testIntegration: async (type: string, config: any) => {
    const response = await api.post('/settings/integrations/test', { type, config })
    return response.data
  },
}

// Integrations API
export const integrationsApi = {
  list: async () => {
    const response = await api.get('/v1/integrations')
    return response.data
  },

  getTwilioStatus: async () => {
    const response = await api.get('/v1/integrations/twilio/status')
    return response.data
  },

  testTwilioConnection: async (config: any) => {
    const response = await api.post('/v1/integrations/twilio/test', config)
    return response.data
  },

  updateTwilioConfig: async (config: any) => {
    const response = await api.put('/v1/integrations/twilio/config', config)
    return response.data
  },

  getAPIKeys: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/v1/integrations/api-keys', { params })
    return response.data
  },

  createAPIKey: async (keyData: any) => {
    const response = await api.post('/v1/integrations/api-keys', keyData)
    return response.data
  },

  deleteAPIKey: async (id: number) => {
    const response = await api.delete(`/v1/integrations/api-keys/${id}`)
    return response.data
  },
}

// Webhooks API (for integrations)
export const webhooksApi = {
  getWebhooks: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/v1/integrations/webhooks', { params })
    return response.data
  },

  createWebhook: async (webhookData: any) => {
    const response = await api.post('/v1/integrations/webhooks', webhookData)
    return response.data
  },

  updateWebhook: async (id: number, webhookData: any) => {
    const response = await api.put(`/v1/integrations/webhooks/${id}`, webhookData)
    return response.data
  },

  deleteWebhook: async (id: number) => {
    const response = await api.delete(`/v1/integrations/webhooks/${id}`)
    return response.data
  },

  testWebhook: async (id: number) => {
    const response = await api.post(`/v1/integrations/webhooks/${id}/test`)
    return response.data
  },

  testByUrl: async (url: string) => {
    const response = await api.post('/v1/integrations/webhooks/test', { url })
    return response.data
  },
}

export default api