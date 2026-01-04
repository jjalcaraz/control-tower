import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LeadsPage } from '@/pages/LeadsPage'
import { CampaignsPage } from '@/pages/CampaignsPage'
import { MessagesPage } from '@/pages/MessagesPage'
import { TemplatesPage } from '@/pages/TemplatesPage'
import { PhoneNumbersPage } from '@/pages/PhoneNumbersPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { CompliancePage } from '@/pages/CompliancePage'
import { IntegrationsPage } from '@/pages/IntegrationsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { MainLayout } from '@/components/layout/MainLayout'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { NetworkErrorBoundary } from '@/components/NetworkErrorBoundary'
import { Toaster } from 'sonner'

function App() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SMS Marketing System...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <NetworkErrorBoundary>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <Toaster />
        </ErrorBoundary>
      </NetworkErrorBoundary>
    )
  }

  return (
    <NetworkErrorBoundary>
      <ErrorBoundary>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/phone-numbers" element={<PhoneNumbersPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/compliance" element={<CompliancePage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </MainLayout>
        <Toaster />
      </ErrorBoundary>
    </NetworkErrorBoundary>
  )
}

export default App