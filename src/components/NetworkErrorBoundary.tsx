import React, { Component, ReactNode } from 'react'
import { OfflineMode } from './OfflineMode'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class NetworkErrorBoundary extends Component<Props, State> {
  private retryTimeouts: NodeJS.Timeout[] = []
  private consecutiveFailures = 0
  private maxFailures = 5

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('NetworkErrorBoundary caught an error:', error, errorInfo)
    this.setState({ error, errorInfo })

    // Check if it's a network-related error
    const isNetworkError =
      error.message.includes('Network error') ||
      error.message.includes('ERR_CONNECTION_REFUSED') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('API Error')

    if (isNetworkError) {
      this.consecutiveFailures++

      // Show offline mode after multiple consecutive failures
      if (this.consecutiveFailures >= this.maxFailures) {
        this.setState({ hasError: true, error })
      } else {
        // Try to recover
        this.scheduleRetry()
      }
    }
  }

  private scheduleRetry = () => {
    const timeout = setTimeout(() => {
      this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    }, 3000)
    this.retryTimeouts.push(timeout)
  }

  private handleReset = () => {
    this.consecutiveFailures = 0
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  componentWillUnmount() {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
  }

  render() {
    if (this.state.hasError) {
      const isNetworkError =
        this.state.error?.message.includes('Network error') ||
        this.state.error?.message.includes('ERR_CONNECTION_REFUSED') ||
        this.state.error?.message.includes('Failed to fetch') ||
        this.state.error?.message.includes('API Error')

      if (isNetworkError) {
        return <OfflineMode />
      }

      return this.props.fallback || (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-red-800 mb-2">Something went wrong</h2>
              <p className="text-red-600 mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={this.handleReset}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}