import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { NetworkErrorBoundary } from '@/components/NetworkErrorBoundary'

describe('Error boundaries', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('renders fallback when a child throws', () => {
    const onError = vi.fn()

    function Boom() {
      throw new Error('Boom')
      return null
    }

    render(
      <ErrorBoundary onError={onError}>
        <Boom />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
    expect(onError).toHaveBeenCalled()
  })

  it('shows offline mode for network failures', () => {
    function NetworkBoom() {
      throw new Error('Network error: Failed to fetch')
      return null
    }

    render(
      <NetworkErrorBoundary>
        <NetworkBoom />
      </NetworkErrorBoundary>
    )

    expect(
      screen.getByText(/Backend Connection Unavailable/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/Demo Mode Active/i)).toBeInTheDocument()
  })
})
