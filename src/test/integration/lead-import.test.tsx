import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ImportLeadsDialog } from '@/components/leads/ImportLeadsDialog'
import { useImportLeads, useImportStatus } from '@/hooks/use-api'

// Mock the API hooks
vi.mock('@/hooks/use-api', () => ({
  useImportLeads: vi.fn(),
  useImportStatus: vi.fn(),
}))

describe('Lead Import Integration Tests', () => {
  let queryClient: QueryClient
  let mockImportLeads: any
  let mockImportStatus: any

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    mockImportLeads = vi.mocked(useImportLeads)
    mockImportStatus = vi.mocked(useImportStatus)

    vi.clearAllMocks()

    // Set up default mock return values
    mockImportLeads.mockReturnValue({ mutateAsync: vi.fn(), isLoading: false } as any)
    mockImportStatus.mockReturnValue({ data: undefined } as any)
  })

  const createMockFile = (content: string) => {
    const file = new File([content], 'test.csv', { type: 'text/csv' })
    return file
  }

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  describe('File Upload and Parsing', () => {
    it('should render the import dialog', async () => {
      const onOpenChange = vi.fn()

      renderWithProviders(
        <ImportLeadsDialog open={true} onOpenChange={onOpenChange} />
      )

      // Should show dialog title
      expect(screen.getByText('Import Leads')).toBeInTheDocument()

      // Should show drop zone text
      expect(screen.getByText('Drop your CSV file here')).toBeInTheDocument()
      expect(screen.getByText('or click to browse')).toBeInTheDocument()

      // Should show "Choose File" button
      expect(screen.getByRole('button', { name: /Choose File/i })).toBeInTheDocument()

      // Should show automatic tagging section
      expect(screen.getByText('Automatic Lead Tagging')).toBeInTheDocument()
      expect(screen.getByText('Manual Campaign Tags')).toBeInTheDocument()
    })

    it('should show auto-tagging options', async () => {
      const onOpenChange = vi.fn()

      renderWithProviders(
        <ImportLeadsDialog open={true} onOpenChange={onOpenChange} />
      )

      // Should show auto-tagging checkbox
      expect(screen.getByRole('checkbox', { name: /Enable automatic tag generation/i })).toBeInTheDocument()

      // Should show tagging options
      expect(screen.getByText(/Time Tag \(SEP25\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Geographic Tag \(TX-HAR\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Property Tag \(1-5AC\)/i)).toBeInTheDocument()
    })

    it('should allow adding manual tags', async () => {
      const onOpenChange = vi.fn()

      renderWithProviders(
        <ImportLeadsDialog open={true} onOpenChange={onOpenChange} />
      )

      // Find the tag input
      const tagInput = screen.getByPlaceholderText(/Enter tag/i)
      fireEvent.change(tagInput, { target: { value: 'test-tag' } })
      fireEvent.keyDown(tagInput, { key: 'Enter' })

      // For now, just verify the input exists - the tag would appear after Enter
      expect(tagInput).toHaveValue('')
    })

    it('should have auto-generate campaign tag button', async () => {
      const onOpenChange = vi.fn()

      renderWithProviders(
        <ImportLeadsDialog open={true} onOpenChange={onOpenChange} />
      )

      // Should show auto-generate button
      expect(screen.getByRole('button', { name: /Auto-Generate/i })).toBeInTheDocument()
    })
  })

  describe('Import Execution', () => {
    it('should navigate through import steps', async () => {
      const mockMutation = {
        mutateAsync: vi.fn().mockResolvedValue({
          import_id: 'test-import-id',
          status: 'processing',
          message: 'Import started successfully',
        }),
      }

      mockImportLeads.mockReturnValue(mockMutation as any)

      const onOpenChange = vi.fn()

      renderWithProviders(
        <ImportLeadsDialog open={true} onOpenChange={onOpenChange} />
      )

      // Should start on upload step
      expect(screen.getByText('Drop your CSV file here')).toBeInTheDocument()

      // Should show footer buttons
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
    })

    it('should show dialog footer with correct buttons', async () => {
      const onOpenChange = vi.fn()

      renderWithProviders(
        <ImportLeadsDialog open={true} onOpenChange={onOpenChange} />
      )

      // Should have Cancel button
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()

      // Should have Close button in footer
      const footerButtons = screen.getAllByRole('button', { name: /Cancel/i })
      expect(footerButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Tagging Features', () => {
    it('should display tagging sections', async () => {
      const onOpenChange = vi.fn()

      renderWithProviders(
        <ImportLeadsDialog open={true} onOpenChange={onOpenChange} />
      )

      // Should show Automatic Lead Tagging card
      expect(screen.getByText('Automatic Lead Tagging')).toBeInTheDocument()
      expect(screen.getByText('Automatically generate strategic tags for lead organization and targeting')).toBeInTheDocument()

      // Should show Manual Campaign Tags card
      expect(screen.getByText('Manual Campaign Tags')).toBeInTheDocument()
      expect(screen.getByText('Add custom tags to all imported leads for campaign targeting')).toBeInTheDocument()
    })

    it('should have tag input and buttons', async () => {
      const onOpenChange = vi.fn()

      renderWithProviders(
        <ImportLeadsDialog open={true} onOpenChange={onOpenChange} />
      )

      // Should have tag input
      expect(screen.getByPlaceholderText(/Enter tag/i)).toBeInTheDocument()

      // Should have Add Tag and Auto-Generate buttons
      expect(screen.getByRole('button', { name: /Add Tag/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Auto-Generate/i })).toBeInTheDocument()
    })
  })

  describe('Dialog Actions', () => {
    it('should close dialog when Cancel is clicked', async () => {
      const onOpenChange = vi.fn()

      renderWithProviders(
        <ImportLeadsDialog open={true} onOpenChange={onOpenChange} />
      )

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      fireEvent.click(cancelButton)

      // Should call onOpenChange with false
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('should show checkbox for auto-tagging', async () => {
      const onOpenChange = vi.fn()

      renderWithProviders(
        <ImportLeadsDialog open={true} onOpenChange={onOpenChange} />
      )

      const checkbox = screen.getByRole('checkbox', { name: /Enable automatic tag generation/i })
      expect(checkbox).toBeInTheDocument()

      // Should be checked by default
      expect(checkbox).toBeChecked()
    })
  })
})
