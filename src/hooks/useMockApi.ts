import { useState, useCallback } from 'react'
import * as mockData from '@/lib/mock-data'

interface MockApiOptions {
  delay?: number
  failureRate?: number
}

export function useMockApi<T>(
  mockDataGenerator: () => T,
  options: MockApiOptions = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { delay = 1000, failureRate = 0 } = options

  const execute = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, delay))

      // Simulate occasional failures
      if (Math.random() < failureRate) {
        throw new Error('Simulated API failure')
      }

      const result = mockDataGenerator()
      setData(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [mockDataGenerator, delay, failureRate])

  return {
    data,
    isLoading,
    error,
    execute,
    refetch: execute
  }
}

// Pre-configured mock API hooks
export function useMockDashboardMetrics() {
  return useMockApi(() => mockData.mockDashboardMetrics, { delay: 500 })
}

export function useMockLeads(params?: { page?: number; limit?: number; search?: string }) {
  return useMockApi(() => {
    let leads = [...mockData.mockLeads]

    // Simulate pagination
    if (params?.page && params?.limit) {
      const start = (params.page - 1) * params.limit
      const end = start + params.limit
      leads = leads.slice(start, end)
    }

    // Simulate search
    if (params?.search) {
      leads = leads.filter(lead =>
        lead.firstName.toLowerCase().includes(params.search!.toLowerCase()) ||
        lead.lastName.toLowerCase().includes(params.search!.toLowerCase()) ||
        lead.email?.toLowerCase().includes(params.search!.toLowerCase())
      )
    }

    return {
      data: leads,
      total: mockData.mockLeads.length,
      page: params?.page || 1,
      limit: params?.limit || 10,
      totalPages: Math.ceil(mockData.mockLeads.length / (params?.limit || 10))
    }
  }, { delay: 800 })
}

export function useMockCampaigns() {
  return useMockApi(() => ({
    data: mockData.mockCampaigns,
    total: mockData.mockCampaigns.length
  }), { delay: 600 })
}

export function useMockTemplates() {
  return useMockApi(() => ({
    data: mockData.mockTemplates,
    total: mockData.mockTemplates.length
  }), { delay: 400 })
}

export function useMockMessages() {
  return useMockApi(() => ({
    data: mockData.mockMessages,
    total: mockData.mockMessages.length
  }), { delay: 700 })
}
