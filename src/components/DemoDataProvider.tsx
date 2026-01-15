import { createContext, useContext, ReactNode } from 'react'
import * as mockData from '@/lib/mock-data'

interface DemoDataContextType {
  dashboardMetrics: typeof mockData.mockDashboardMetrics
  leads: typeof mockData.mockLeads
  campaigns: typeof mockData.mockCampaigns
  templates: typeof mockData.mockTemplates
  messages: typeof mockData.mockMessages
  isDemoMode: boolean
}

const DemoDataContext = createContext<DemoDataContextType | undefined>(undefined)

interface DemoDataProviderProps {
  children: ReactNode
  enabled?: boolean
}

export function DemoDataProvider({ children, enabled = true }: DemoDataProviderProps) {
  if (!enabled) {
    return <>{children}</>
  }

  const contextValue: DemoDataContextType = {
    dashboardMetrics: mockData.mockDashboardMetrics,
    leads: mockData.mockLeads,
    campaigns: mockData.mockCampaigns,
    templates: mockData.mockTemplates,
    messages: mockData.mockMessages,
    isDemoMode: true
  }

  return (
    <DemoDataContext.Provider value={contextValue}>
      {children}
    </DemoDataContext.Provider>
  )
}

export function useDemoData() {
  const context = useContext(DemoDataContext)
  if (context === undefined) {
    throw new Error('useDemoData must be used within a DemoDataProvider')
  }
  return context
}

// Demo mode indicator component
export function DemoModeIndicator() {
  const { isDemoMode } = useDemoData()

  if (!isDemoMode) return null

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium">Demo Mode</span>
      </div>
    </div>
  )
}