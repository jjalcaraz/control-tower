// Demo API - provides mock data for frontend development when backend is unavailable
import { AuthResponse } from '@/types/auth'
import * as mockData from './mock-data'

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const suppressErrors = import.meta.env.VITE_SUPPRESS_API_ERRORS === 'true'

// Simulate API delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms))

// Demo API client
const demoApiClient = {
  get: async (url: string, config?: any) => {
    if (!suppressErrors) {
      console.log(`Demo API: GET ${url}`)
    }

    await delay()

    // Return mock data based on URL patterns
    if (url.includes('/auth/me')) {
      return {
        data: {
          id: 1,
          email: 'demo@example.com',
          username: 'demo',
          role: 'admin',
          isActive: true,
          firstName: 'Demo',
          lastName: 'User'
        }
      }
    }

    if (url.includes('/analytics/dashboard')) {
      return { data: mockData.mockDashboardMetrics }
    }

    if (url.includes('/leads')) {
      return {
        data: {
          data: mockData.mockLeads,
          total: mockData.mockLeads.length,
          page: 1,
          limit: 10
        }
      }
    }

    if (url.includes('/campaigns')) {
      return {
        data: {
          data: mockData.mockCampaigns,
          total: mockData.mockCampaigns.length
        }
      }
    }

    if (url.includes('/templates')) {
      return {
        data: {
          data: mockData.mockTemplates,
          total: mockData.mockTemplates.length
        }
      }
    }

    if (url.includes('/conversations')) {
      return {
        data: {
          data: mockData.mockMessages,
          total: mockData.mockMessages.length
        }
      }
    }

    // Default empty response
    return { data: {} }
  },

  post: async (url: string, data?: any, config?: any) => {
    if (!suppressErrors) {
      console.log(`Demo API: POST ${url}`, data)
    }

    await delay()

    if (url.includes('/auth/login')) {
      return {
        data: {
          user: {
            id: 1,
            email: data?.email || 'demo@example.com',
            username: (data?.email || 'demo@example.com').split('@')[0],
            role: 'admin',
            isActive: true,
            firstName: 'Demo',
            lastName: 'User'
          },
          token: 'demo-token',
          refreshToken: 'demo-refresh-token',
          expiresIn: 3600
        } as AuthResponse
      }
    }

    return { data: { success: true, data } }
  },

  put: async (url: string, data?: any, config?: any) => {
    if (!suppressErrors) {
      console.log(`Demo API: PUT ${url}`, data)
    }

    await delay()
    return { data: { success: true, data } }
  },

  delete: async (url: string, config?: any) => {
    if (!suppressErrors) {
      console.log(`Demo API: DELETE ${url}`)
    }

    await delay()
    return { data: { success: true } }
  }
}

// Demo interceptors (no-op)
const demoInterceptors = {
  request: {
    use: () => {},
    eject: () => {}
  },
  response: {
    use: () => {},
    eject: () => {}
  }
}

export const api = isDemoMode ? demoApiClient : null
export { demoInterceptors as interceptors }

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await demoApiClient.post('/auth/login', { email, password })
    return response.data
  },

  register: async (userData: any): Promise<AuthResponse> => {
    const response = await demoApiClient.post('/auth/register', userData)
    return response.data
  },

  logout: async (): Promise<void> => {
    await demoApiClient.post('/auth/logout')
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await demoApiClient.post('/auth/refresh', { refreshToken })
    return response.data
  },

  getCurrentUser: async () => {
    const response = await demoApiClient.get('/auth/me')
    return response.data
  },

  setupTwoFactor: async () => {
    return { qr_code: 'mock-qr-code', secret: 'mock-secret' }
  },

  verifyTwoFactor: async (token: string) => {
    return { verified: true }
  },

  disableTwoFactor: async (token: string) => {
    return { disabled: true }
  },
}

// Generic API function for any endpoint
export const createApiCall = async (method: string, url: string, data?: any) => {
  switch (method.toLowerCase()) {
    case 'get':
      return demoApiClient.get(url)
    case 'post':
      return demoApiClient.post(url, data)
    case 'put':
      return demoApiClient.put(url, data)
    case 'delete':
      return demoApiClient.delete(url)
    default:
      throw new Error(`Unsupported method: ${method}`)
  }
}