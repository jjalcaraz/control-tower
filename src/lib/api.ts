// Simple API wrapper that respects demo mode
import axios, { AxiosError, AxiosResponse } from 'axios'
import { AuthResponse } from '@/types/auth'
import * as mockData from './mock-data'

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const suppressErrors = import.meta.env.VITE_SUPPRESS_API_ERRORS === 'true'
const mockConversationsForced =
  ((import.meta as any).env.VITE_ENABLE_MOCK_CONVERSATIONS || (import.meta as any).env.VITE_ENABLE_MOCK_DATA || 'false') === 'true'
let useMockConversationsFallback = isDemoMode || mockConversationsForced

const getMockConversationResponse = () => {
  const conversations = mockData.mockConversationSummaries || []
  return {
    data: conversations,
    pagination: {
      page: 1,
      pageSize: conversations.length,
      total: conversations.length,
      totalPages: 1
    }
  }
}

// Demo API response
const demoApiClient = {
  get: async (url: string, config?: any) => {
    if (!suppressErrors) console.log(`🔧 Demo API: GET ${url}`)
    await new Promise(resolve => setTimeout(resolve, 300))

    // Mock responses based on URL
    if (url.includes('/auth/me')) {
      return { data: { id: 1, email: 'demo@example.com', username: 'demo', role: 'admin' } }
    }
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
    if (!suppressErrors) console.log(`🔧 Demo API: POST ${url}`)
    await new Promise(resolve => setTimeout(resolve, 300))

    if (url.includes('/auth/login')) {
      return {
        data: {
          user: { id: 1, email: data?.email || 'demo@example.com', username: 'demo', role: 'admin' },
          token: 'demo-token',
          refreshToken: 'demo-refresh-token'
        } as AuthResponse
      }
    }
    return { data: { success: true, data } }
  },
  put: async (url: string, data?: any, config?: any) => {
    if (!suppressErrors) console.log(`🔧 Demo API: PUT ${url}`)
    await new Promise(resolve => setTimeout(resolve, 300))
    return { data: { success: true, data } }
  },
  patch: async (url: string, data?: any, config?: any) => {
    if (!suppressErrors) console.log(`🔧 Demo API: PATCH ${url}`)
    await new Promise(resolve => setTimeout(resolve, 300))
    return { data: { success: true, data } }
  },
  delete: async (url: string, config?: any) => {
    if (!suppressErrors) console.log(`🔧 Demo API: DELETE ${url}`)
    await new Promise(resolve => setTimeout(resolve, 300))
    return { data: { success: true } }
  },
  interceptors: {
    request: { use: () => {}, eject: () => {} },
    response: { use: () => {}, eject: () => {} }
  }
}

// Create conditional API client
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
console.log('API URL:', apiUrl) // Debug log to check if env var is loaded
console.log('All env vars:', import.meta.env) // Debug all environment variables
const liveApiClient = axios.create({
  baseURL: apiUrl,
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Add development authentication interceptor
liveApiClient.interceptors.request.use((config) => {
  // Add development auth token for non-demo mode
  if (!isDemoMode) {
    const devToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc2Mzk5NTQyOCwiaWF0IjoxNzYzOTA5MDI4fQ.Tsis_n8Iq0NXf4dWmIXYcsxybrSBcw3COUl2W3J3NMU'
    config.headers.Authorization = `Bearer ${devToken}`
  }
  if (!suppressErrors) console.log('🔧 API Request:', config.method?.toUpperCase(), config.url, config.data)
  return config
})

// Add response interceptor for debugging
liveApiClient.interceptors.response.use((response) => {
  if (!suppressErrors) console.log('✅ API Response:', response.config.method?.toUpperCase(), response.config.url, response.status)
  return response
}, (error) => {
  // Skip logging expected 400 errors for Twilio test-config endpoint
  const isTwilioNotConfigured = error.config?.url?.includes('/messages/test-config') && error.response?.status === 400
  if (!suppressErrors && !isTwilioNotConfigured) {
    console.error('❌ API Error:', error.config?.method?.toUpperCase(), error.config?.url, error.response?.status, error.message)
  }
  return Promise.reject(error)
})

// Mock API client for development
const mockApiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/mock`,
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Use live API client for real database
const apiClient = isDemoMode ? demoApiClient : liveApiClient

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password })
    return response.data
  },
  register: async (userData: any) => {
    const response = await apiClient.post('/auth/register', userData)
    return response.data
  },
  logout: async () => {
    await apiClient.post('/auth/logout')
  },
  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/refresh', { refreshToken })
    return response.data
  },
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
  setupTwoFactor: async () => {
    return { qr_code: 'mock-qr-code' }
  },
  verifyTwoFactor: async (token: string) => {
    return { verified: true }
  },
  disableTwoFactor: async (token: string) => {
    return { disabled: true }
  },
}

// Analytics API
export const analyticsApi = {
  getDashboardMetrics: async () => {
    const response = await apiClient.get('/analytics/dashboard')
    return response.data
  },

  getCampaignAnalytics: async (campaignId: string | number, timeRange: string) => {
    const response = await apiClient.get(`/analytics/campaigns/${campaignId}?timeRange=${timeRange}`)
    return response.data
  },

  getLeadAnalytics: async (timeRange: string) => {
    const response = await apiClient.get(`/analytics/leads?timeRange=${timeRange}`)
    return response.data
  },

  getMessageAnalytics: async (timeRange: string) => {
    const response = await apiClient.get(`/analytics/messages?timeRange=${timeRange}`)
    return response.data
  },

  getPhoneHealthAnalytics: async () => {
    const response = await apiClient.get('/analytics/phone-health')
    return response.data
  },

  getTrends: async (params?: { metric?: string; timeRange?: string }) => {
    const response = await apiClient.get('/analytics/trends', params ? { params } : undefined)
    return response.data
  },

  getROIAnalysis: async (timeRange: string) => {
    const response = await apiClient.get(`/analytics/roi?timeRange=${timeRange}`)
    return response.data
  },

  getConversionFunnel: async (campaignId?: number, timeRange?: string) => {
    const queryParams = new URLSearchParams()
    if (campaignId) queryParams.append('campaignId', campaignId.toString())
    if (timeRange) queryParams.append('timeRange', timeRange)
    const response = await apiClient.get(`/analytics/conversion-funnel?${queryParams}`)
    return response.data
  },

  compareCampaigns: async (campaignIds: Array<string | number>, metrics?: string[]) => {
    const response = await apiClient.post('/analytics/campaigns-comparison', { campaignIds, metrics })
    return response.data
  }
}

// Leads API
export const leadsApi = {
  getLeads: async (params?: any) => {
    const response = await apiClient.get('/leads/', params ? { params } : undefined)
    return response.data
  },

  getLead: async (id: string | number) => {
    const response = await apiClient.get(`/leads/${id}`)
    return response.data
  },

  createLead: async (data: any) => {
    const response = await apiClient.post('/leads', data)
    return response.data
  },

  updateLead: async (id: string | number, data: any) => {
    const response = await apiClient.patch(`/leads/${id}`, data)
    return response.data
  },

  deleteLead: async (id: string | number) => {
    const response = await apiClient.delete(`/leads/${id}`)
    return response.data
  },

  importLeads: async (file: File, mappings: Record<string, string>, bulkTags?: string[], autoTaggingEnabled?: boolean, taggingOptions?: any) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mappings', JSON.stringify(mappings))
    if (bulkTags) formData.append('bulkTags', JSON.stringify(bulkTags))
    if (autoTaggingEnabled !== undefined) formData.append('autoTaggingEnabled', autoTaggingEnabled.toString())
    if (taggingOptions) formData.append('taggingOptions', JSON.stringify(taggingOptions))

    const response = await apiClient.post('/leads/import', formData)
    return response.data
  },

  getImportStatus: async (importId: string) => {
    const response = await apiClient.get(`/leads/import/${importId}`)
    return response.data
  },

  bulkUpdate: async (leadIds: Array<string | number>, updates: any) => {
    const response = await apiClient.put('/leads/bulk', { leadIds, updates })
    return response.data
  }
}

// Campaigns API
export const campaignsApi = {
  getCampaigns: async (params?: any) => {
    const response = await apiClient.get('/campaigns/', params ? { params } : undefined)
    return response.data
  },

  getCampaign: async (id: string | number) => {
    const response = await apiClient.get(`/campaigns/${id}`)
    return response.data
  },

  createCampaign: async (data: any) => {
    const response = await apiClient.post('/campaigns', data)
    return response.data
  },

  startCampaign: async (id: string | number) => {
    const response = await apiClient.post(`/campaigns/${id}/start`)
    return response.data
  },

  pauseCampaign: async (id: string | number) => {
    const response = await apiClient.post(`/campaigns/${id}/pause`)
    return response.data
  },

  resumeCampaign: async (id: string | number) => {
    const response = await apiClient.post(`/campaigns/${id}/resume`)
    return response.data
  },

  stopCampaign: async (id: string | number) => {
    const response = await apiClient.post(`/campaigns/${id}/stop`)
    return response.data
  },

  buildCampaignTargets: async (data: any) => {
    const response = await apiClient.post('/campaigns/build-targets', data)
    return response.data
  },

  getCampaignStats: async (id: string | number) => {
    const response = await apiClient.get(`/campaigns/${id}/stats`)
    return response.data
  },

  getCampaignMetrics: async (id: string | number) => {
    const response = await apiClient.get(`/campaigns/${id}/metrics`)
    return response.data
  }
}

// Messages API
export const messagesApi = {
  getConversations: async (params?: any) => {
    if (useMockConversationsFallback) {
      return getMockConversationResponse()
    }
    try {
      const response = await apiClient.get('/messages/conversations/', params ? { params } : undefined)
      return response.data
    } catch (error) {
      const axiosError = error as AxiosError
      if (!suppressErrors) {
        console.warn('Conversations API not available, using mock data fallback.', axiosError?.message)
      }
      useMockConversationsFallback = true
      return getMockConversationResponse()
    }
  },

  getConversation: async (id: string | number) => {
    const response = await apiClient.get(`/messages/conversations/${id}`)
    return response.data
  },

  sendMessage: async (conversationId: string | number, content: string) => {
    const response = await apiClient.post(`/messages/conversations/${conversationId}/messages`, { content })
    return response.data
  },

  sendMessageToLead: async (phoneNumber: string, content: string, leadId?: number) => {
    const payload: Record<string, any> = { to: phoneNumber, body: content }
    if (leadId) payload.lead_id = leadId
    const response = await apiClient.post('/messages/send', payload)
    return response.data
  },

  broadcastMessage: async (data: { content: string; leadIds?: number[]; filters?: any }) => {
    const response = await apiClient.post('/messages/broadcast', data)
    return response.data
  },

  archiveConversation: async (id: string | number) => {
    const response = await apiClient.put(`/messages/conversations/${id}/archive`)
    return response.data
  },

  deleteConversation: async (id: string | number) => {
    const response = await apiClient.delete(`/messages/conversations/${id}`)
    return response.data
  },

  markConversationRead: async (id: string | number) => {
    const response = await apiClient.put(`/messages/conversations/${id}/read`)
    return response.data
  },

  starConversation: async (id: string | number) => {
    const response = await apiClient.put(`/messages/conversations/${id}/star`)
    return response.data
  },

  unstarConversation: async (id: string | number) => {
    const response = await apiClient.put(`/messages/conversations/${id}/unstar`)
    return response.data
  },

  getTemplates: async () => {
    const response = await apiClient.get('/message-templates')
    return response.data
  },

  getQuickResponses: async () => {
    const response = await apiClient.get('/quick-responses')
    return response.data
  }
}

// Templates API
export const templatesApi = {
  getTemplates: async (params?: any) => {
    const response = await apiClient.get('/templates/', params ? { params } : undefined)
    return response.data
  },

  getTemplate: async (id: string | number) => {
    const response = await apiClient.get(`/templates/${id}`)
    return response.data
  },

  createTemplate: async (data: any) => {
    const response = await apiClient.post('/templates', data)
    return response.data
  },

  updateTemplate: async (id: string | number, data: any) => {
    const response = await apiClient.put(`/templates/${id}`, data)
    return response.data
  },

  deleteTemplate: async (id: string | number) => {
    const response = await apiClient.delete(`/templates/${id}`)
    return response.data
  },

  getTemplateStats: async (params?: { timeRange?: string }) => {
    const response = await apiClient.get('/templates/stats', params ? { params } : undefined)
    return response.data
  },

  testTemplate: async (id: number, testData: any) => {
    const response = await apiClient.post(`/templates/${id}/test`, testData)
    return response.data
  },

  getTemplatePerformance: async (id: string | number, timeRange?: string) => {
    const params = timeRange ? `?timeRange=${timeRange}` : ''
    const response = await apiClient.get(`/templates/${id}/performance${params}`)
    return response.data
  }
}

// Phone Numbers API
export const phoneNumbersApi = {
  getPhoneNumbers: async (params?: any) => {
    const response = await apiClient.get('/phone-numbers', params ? { params } : undefined)
    return response.data
  },

  getPhoneNumber: async (id: number) => {
    const response = await apiClient.get(`/phone-numbers/${id}`)
    return response.data
  },

  getPhoneNumberHealth: async (id: number) => {
    const response = await apiClient.get(`/phone-numbers/${id}/health`)
    return response.data
  },

  purchasePhoneNumber: async (data: any) => {
    const response = await apiClient.post('/phone-numbers/purchase', data)
    return response.data
  },

  testPhoneNumber: async (id: number, testData: any) => {
    const response = await apiClient.post(`/phone-numbers/${id}/test`, testData)
    return response.data
  },

  syncTwilioNumbers: async () => {
    const response = await apiClient.post('/phone-numbers/sync-twilio')
    return response.data
  },

  updatePhoneNumberSettings: async (id: number, settings: any) => {
    const response = await apiClient.put(`/phone-numbers/${id}/settings`, settings)
    return response.data
  },

  getPhoneNumberAnalytics: async (id: number, timeRange?: string) => {
    const params = timeRange ? `?timeRange=${timeRange}` : ''
    const response = await apiClient.get(`/phone-numbers/${id}/analytics${params}`)
    return response.data
  }
}

// Compliance API
export const complianceApi = {
  getOptOuts: async (params?: any) => {
    const response = await apiClient.get('/compliance/opt-outs', params ? { params } : undefined)
    return response.data
  },

  getAuditLogs: async (params?: any) => {
    const response = await apiClient.get('/compliance/audit-logs', params ? { params } : undefined)
    return response.data
  },

  getConsentRecords: async (params?: any) => {
    const response = await apiClient.get('/compliance/consent-records', params ? { params } : undefined)
    return response.data
  },

  addOptOut: async (phoneNumber: string, reason?: string) => {
    const response = await apiClient.post('/compliance/opt-outs', { phoneNumber, reason })
    return response.data
  },

  bulkOptOut: async (phoneNumbers: string[], reason?: string, source?: string) => {
    const response = await apiClient.post('/compliance/opt-outs/bulk', { phoneNumbers, reason, source })
    return response.data
  },

  getComplianceDashboard: async () => {
    const response = await apiClient.get('/compliance/dashboard')
    return response.data
  },

  generateComplianceReport: async (params: { type: string; startDate: string; endDate: string; format?: string }) => {
    const response = await apiClient.post('/compliance/reports', params)
    return response.data
  },

  reports: {
    list: async (params?: any) => {
      const response = await apiClient.get('/compliance/reports', params ? { params } : undefined)
      return response.data
    },

    download: async (reportId: string) => {
      const response = await apiClient.get(`/compliance/reports/${reportId}/download`)
      return response.data
    }
  }
}

// Organizations API
export const organizationsApi = {
  getCurrentOrganization: async () => {
    const response = await apiClient.get('/organizations/current')
    return response.data
  },

  getOrganizationUsers: async (params?: any) => {
    const response = await apiClient.get('/organizations/users', params ? { params } : undefined)
    return response.data
  }
}

// Settings API
export const settingsApi = {
  getSettings: async () => {
    const response = await apiClient.get('/settings')
    return response.data
  },

  getIntegrationSettings: async () => {
    const response = await apiClient.get('/settings/integrations')
    return response.data
  },

  updateSettings: async (data: any) => {
    const response = await apiClient.put('/settings', data)
    return response.data
  }
}

// Webhooks API
export const webhooksApi = {
  getWebhooks: async (params?: any) => {
    const response = await apiClient.get('/webhooks', params ? { params } : undefined)
    return response.data
  },

  createWebhook: async (data: any) => {
    const response = await apiClient.post('/webhooks', data)
    return response.data
  },

  testWebhook: async (data: any) => {
    const response = await apiClient.post('/webhooks/test', data)
    return response.data
  },

  testByUrl: async (url: string, data?: any) => {
    const response = await apiClient.post('/webhooks/test-url', { url, data })
    return response.data
  }
}

// Integrations API
export const integrationsApi = {
  list: async (params?: any) => {
    const response = await apiClient.get('/integrations', params ? { params } : undefined)
    return response.data
  },

  getTwilioStatus: async () => {
    const response = await apiClient.get('/integrations/twilio/status')
    return response.data
  },

  testTwilioConnection: async () => {
    const response = await apiClient.post('/integrations/twilio/test')
    return response.data
  },

  updateTwilioConfig: async (data: any) => {
    const response = await apiClient.put('/integrations/twilio/config', data)
    return response.data
  },

  getAPIKeys: async (params?: any) => {
    const response = await apiClient.get('/integrations/api-keys', params ? { params } : undefined)
    return response.data
  },

  createAPIKey: async (data: any) => {
    const response = await apiClient.post('/integrations/api-keys', data)
    return response.data
  },

  deleteAPIKey: async (id: number) => {
    const response = await apiClient.delete(`/integrations/api-keys/${id}`)
    return response.data
  }
}

// Generic API function for simple replacement
export const api = {
  get: (url: string, config?: any) => apiClient.get(url, config),
  post: (url: string, data?: any, config?: any) => apiClient.post(url, data, config),
  put: (url: string, data?: any, config?: any) => apiClient.put(url, data, config),
  delete: (url: string, config?: any) => apiClient.delete(url, config),
  interceptors: apiClient.interceptors
}

// Export for compatibility
export default api
