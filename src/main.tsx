import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './hooks/use-auth'
import { DemoDataProvider } from './components/DemoDataProvider'
import App from './App.tsx'
import './index.css'

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: isDemoMode ? 1000 * 60 * 30 : 1000 * 60 * 5, // 30 min in demo mode, 5 min normal
      retry: isDemoMode ? false : (failureCount, error: any) => {
        if (error?.response?.status === 404) return false
        return failureCount < 1 // Reduce retries in production
      },
      refetchOnWindowFocus: isDemoMode ? false : true,
      refetchOnReconnect: isDemoMode ? false : true,
    },
    mutations: {
      retry: isDemoMode ? false : 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DemoDataProvider enabled={isDemoMode}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </DemoDataProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)