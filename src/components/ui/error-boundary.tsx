import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Alert, AlertDescription } from './alert'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ComponentType<ErrorBoundaryFallbackProps>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

interface ErrorBoundaryFallbackProps {
  error: Error
  errorInfo?: ErrorInfo | null
  resetError: () => void
}

const DefaultErrorFallback: ComponentType<ErrorBoundaryFallbackProps> = ({ error, errorInfo, resetError }) => {
  const handleReload = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  const handleReportError = () => {
    // In production, you might send this to your error reporting service
    const errorReport = {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    }

    // Create mailto link for error reporting
    const subject = encodeURIComponent('Error Report - SMS Marketing System')
    const body = encodeURIComponent(`Error Details:\n\n${JSON.stringify(errorReport, null, 2)}`)
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-600">
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription className="text-center">
              We're sorry, but something unexpected happened. The error has been logged and our team will look into it.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <strong>Error:</strong> {error.message}
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                  {error.stack}
                  {'\n\nComponent Stack:\n'}
                  {errorInfo?.componentStack || 'Component stack not available'}
                </pre>
              </details>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={resetError} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={handleReload} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
            <Button onClick={handleGoHome} variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
            <Button onClick={handleReportError} variant="ghost" className="w-full">
              Report This Error
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Error ID: {Math.random().toString(36).substr(2, 9)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type ComponentType<P = {}> = React.ComponentType<P>

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo)
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // In production, you might send error to error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo })
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
        />
      )
    }

    return this.props.children
  }
}

// Hook for using ErrorBoundary in functional components
export const useErrorHandler = () => {
  const resetError = () => {
    window.location.reload()
  }

  return { resetError }
}

// Higher-order component for wrapping components with ErrorBoundary
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  fallback?: ComponentType<ErrorBoundaryFallbackProps>,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

export default ErrorBoundary
