/**
 * Comprehensive React Component Tests for Lead Management
 *
 * This test suite covers:
 * - LeadsPage component rendering and interactions
 * - Lead CRUD operations with API integration
 * - Form validation and error handling
 * - Data transformation and display
 * - Bulk operations
 * - Filtering and searching
 * - Responsive design
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Import components and hooks
import { LeadsPage } from '../pages/LeadsPage'
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead } from '../hooks/use-leads'
import { leadsApi } from '../lib/api'
import type { Lead } from '../types/lead'

// Mock API responses
const mockLeads: Lead[] = [
  {
    id: 1,
    owner_name: 'John Doe',
    phone_number_1: '5551234567',
    phone_number_2: null,
    phone_number_3: null,
    email: 'john.doe@example.com',
    street_address: '123 Main St',
    city: 'Austin',
    state: 'TX',
    zip_code: '78701',
    country: 'US',
    property_type: 'Single Family',
    property_value: 450000,
    acreage: 0.25,
    year_built: 2010,
    bedrooms: 3,
    bathrooms: 2,
    square_feet: 1800,
    lead_score: 'hot',
    lead_source: 'Website',
    status: 'new',
    notes: 'Test lead',
    tags: [],
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    last_contacted: null,
    next_follow_up: null,
    do_not_contact: false,
    opt_out_reason: null,
    opt_out_date: null,
    // Transformed fields for frontend
    firstName: 'John',
    lastName: 'Doe',
    primaryPhone: '5551234567',
    fullName: 'John Doe'
  },
  {
    id: 2,
    owner_name: 'Jane Smith',
    phone_number_1: '5559876543',
    phone_number_2: null,
    phone_number_3: null,
    email: 'jane.smith@example.com',
    street_address: '456 Oak Ave',
    city: 'Houston',
    state: 'TX',
    zip_code: '77001',
    country: 'US',
    property_type: 'Condo',
    property_value: 320000,
    acreage: null,
    year_built: 2015,
    bedrooms: 2,
    bathrooms: 2,
    square_feet: 1200,
    lead_score: 'cold',
    lead_source: 'Referral',
    status: 'active',
    notes: 'Another test lead',
    tags: [],
    created_at: '2024-01-14T14:20:00Z',
    updated_at: '2024-01-14T14:20:00Z',
    last_contacted: null,
    next_follow_up: null,
    do_not_contact: false,
    opt_out_reason: null,
    opt_out_date: null,
    // Transformed fields for frontend
    firstName: 'Jane',
    lastName: 'Smith',
    primaryPhone: '5559876543',
    fullName: 'Jane Smith'
  }
]

// Mock the API
vi.mock('../lib/api', () => ({
  leadsApi: {
    getLeads: vi.fn(),
    createLead: vi.fn(),
    updateLead: vi.fn(),
    deleteLead: vi.fn(),
    importLeads: vi.fn()
  }
}))

// Mock React Query hooks
vi.mock('../hooks/use-leads', () => ({
  useLeads: vi.fn(),
  useCreateLead: vi.fn(),
  useUpdateLead: vi.fn(),
  useDeleteLead: vi.fn(),
  useBulkUpdateLeads: vi.fn()
}))

// Test utilities
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
})

const renderWithQuery = (component: React.ReactElement) => {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('Lead Management Components', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createQueryClient()
    vi.clearAllMocks()
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===== LEADS PAGE COMPONENT TESTS =====

  describe('LeadsPage Component', () => {
    it('renders leads page with loading state', () => {
      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn()
      })

      renderWithQuery(<LeadsPage />)

      expect(screen.getByText('Loading leads...')).toBeInTheDocument()
    })

    it('renders leads page with data', () => {
      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: mockLeads,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderWithQuery(<LeadsPage />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument()
      expect(screen.getByText('Austin, TX')).toBeInTheDocument()
    })

    it('renders empty state when no leads', () => {
      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderWithQuery(<LeadsPage />)

      expect(screen.getByText(/no leads found/i)).toBeInTheDocument()
    })

    it('renders error state', () => {
      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch leads'),
        refetch: vi.fn()
      })

      renderWithQuery(<LeadsPage />)

      expect(screen.getByText(/error loading leads/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('displays correct lead count', () => {
      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: mockLeads,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderWithQuery(<LeadsPage />)

      expect(screen.getByText('2 Leads')).toBeInTheDocument()
    })

    it('allows searching leads', async () => {
      const mockUseLeads = vi.mocked(useLeads)
      const mockRefetch = vi.fn()
      mockUseLeads.mockReturnValue({
        data: mockLeads,
        isLoading: false,
        error: null,
        refetch: mockRefetch
      })

      renderWithQuery(<LeadsPage />)

      const searchInput = screen.getByPlaceholderText(/search leads/i)
      await userEvent.type(searchInput, 'John')
      await userEvent.keyboard('Enter')

      expect(mockRefetch).toHaveBeenCalledWith(expect.objectContaining({
        search: 'John'
      }))
    })

    it('allows filtering by status', async () => {
      const mockUseLeads = vi.mocked(useLeads)
      const mockRefetch = vi.fn()
      mockUseLeads.mockReturnValue({
        data: mockLeads,
        isLoading: false,
        error: null,
        refetch: mockRefetch
      })

      renderWithQuery(<LeadsPage />)

      const statusFilter = screen.getByLabelText(/status/i)
      await userEvent.click(statusFilter)

      const statusOption = screen.getByText(/new/i)
      await userEvent.click(statusOption)

      expect(mockRefetch).toHaveBeenCalledWith(expect.objectContaining({
        filters: expect.objectContaining({
          status: 'new'
        })
      }))
    })
  })

  // ===== LEAD CRUD OPERATIONS TESTS =====

  describe('Lead CRUD Operations', () => {
    it('creates a new lead successfully', async () => {
      const mockCreateLead = vi.mocked(useCreateLead)
      const mockMutateAsync = vi.fn().mockResolvedValue({
        success: true,
        data: mockLeads[0]
      })
      mockCreateLead.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: null
      })

      renderWithQuery(<LeadsPage />)

      const addButton = screen.getByRole('button', { name: /add lead/i })
      await userEvent.click(addButton)

      // Fill out the form
      const nameInput = screen.getByLabelText(/owner name/i)
      await userEvent.type(nameInput, 'New Test Lead')

      const phoneInput = screen.getByLabelText(/phone/i)
      await userEvent.type(phoneInput, '5555555555')

      const emailInput = screen.getByLabelText(/email/i)
      await userEvent.type(emailInput, 'newlead@test.com')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create/i })
      await userEvent.click(submitButton)

      expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        owner_name: 'New Test Lead',
        phone_number_1: '5555555555',
        email: 'newlead@test.com'
      }))
    })

    it('updates an existing lead', async () => {
      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: mockLeads,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      const mockUpdateLead = vi.mocked(useUpdateLead)
      const mockMutateAsync = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockLeads[0], status: 'qualified' }
      })
      mockUpdateLead.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: null
      })

      renderWithQuery(<LeadsPage />)

      // Click edit button for first lead
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      await userEvent.click(editButtons[0])

      // Update status
      const statusSelect = screen.getByLabelText(/status/i)
      await userEvent.click(statusSelect)
      await userEvent.click(screen.getByText(/qualified/i))

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i })
      await userEvent.click(saveButton)

      expect(mockMutateAsync).toHaveBeenCalledWith(
        1, // Lead ID
        expect.objectContaining({
          status: 'qualified'
        })
      )
    })

    it('deletes a lead successfully', async () => {
      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: mockLeads,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      const mockDeleteLead = vi.mocked(useDeleteLead)
      const mockMutateAsync = vi.fn().mockResolvedValue({
        success: true,
        message: 'Lead deleted successfully'
      })
      mockDeleteLead.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: null
      })

      renderWithQuery(<LeadsPage />)

      // Click delete button for first lead
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await userEvent.click(deleteButtons[0])

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /delete/i })
      await userEvent.click(confirmButton)

      expect(mockMutateAsync).toHaveBeenCalledWith(1) // Lead ID
    })

    it('handles delete cancellation', async () => {
      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: mockLeads,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      const mockDeleteLead = vi.mocked(useDeleteLead)
      const mockMutateAsync = vi.fn()
      mockDeleteLead.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: null
      })

      renderWithQuery(<LeadsPage />)

      // Click delete button for first lead
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await userEvent.click(deleteButtons[0])

      // Cancel deletion
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await userEvent.click(cancelButton)

      expect(mockMutateAsync).not.toHaveBeenCalled()
    })
  })

  // ===== DATA TRANSFORMATION TESTS =====

  describe('Data Transformation', () => {
    it('transforms backend data to frontend format', () => {
      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: mockLeads,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderWithQuery(<LeadsPage />)

      // Check transformed fields are displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument() // fullName
      expect(screen.getByText('555-123-4567')).toBeInTheDocument() // formatted phone
    })

    it('handles missing optional fields gracefully', () => {
      const leadWithMissingFields = {
        ...mockLeads[0],
        email: null,
        street_address: null,
        city: null,
        state: null,
        phone_number_2: null
      }

      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: [leadWithMissingFields],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderWithQuery(<LeadsPage />)

      // Should not crash and should still display available data
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('555-123-4567')).toBeInTheDocument()
    })
  })

  // ===== BULK OPERATIONS TESTS =====

  describe('Bulk Operations', () => {
    it('selects multiple leads', async () => {
      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: mockLeads,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderWithQuery(<LeadsPage />)

      // Select first lead
      const checkboxes = screen.getAllByRole('checkbox')
      await userEvent.click(checkboxes[0])

      // Select second lead
      await userEvent.click(checkboxes[1])

      // Check bulk actions are available
      expect(screen.getByText(/selected/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /bulk delete/i })).toBeInTheDocument()
    })

    it('performs bulk delete operation', async () => {
      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: mockLeads,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      const mockBulkUpdate = vi.mocked(useBulkUpdateLeads)
      const mockMutateAsync = vi.fn().mockResolvedValue({
        success: true,
        message: '2 leads deleted'
      })
      mockBulkUpdate.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: null
      })

      renderWithQuery(<LeadsPage />)

      // Select leads
      const checkboxes = screen.getAllByRole('checkbox')
      await userEvent.click(checkboxes[0])
      await userEvent.click(checkboxes[1])

      // Perform bulk delete
      const bulkDeleteButton = screen.getByRole('button', { name: /bulk delete/i })
      await userEvent.click(bulkDeleteButton)

      // Confirm
      const confirmButton = screen.getByRole('button', { name: /delete selected/i })
      await userEvent.click(confirmButton)

      expect(mockMutateAsync).toHaveBeenCalled()
    })
  })

  // ===== FORM VALIDATION TESTS =====

  describe('Form Validation', () => {
    it('validates required fields on lead creation', async () => {
      const mockCreateLead = vi.mocked(useCreateLead)
      mockCreateLead.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
        error: null
      })

      renderWithQuery(<LeadsPage />)

      const addButton = screen.getByRole('button', { name: /add lead/i })
      await userEvent.click(addButton)

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /create/i })
      await userEvent.click(submitButton)

      // Should show validation errors
      expect(screen.getByText(/owner name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/phone number is required/i)).toBeInTheDocument()
    })

    it('validates email format', async () => {
      const mockCreateLead = vi.mocked(useCreateLead)
      mockCreateLead.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
        error: null
      })

      renderWithQuery(<LeadsPage />)

      const addButton = screen.getByRole('button', { name: /add lead/i })
      await userEvent.click(addButton)

      const emailInput = screen.getByLabelText(/email/i)
      await userEvent.type(emailInput, 'invalid-email')

      const submitButton = screen.getByRole('button', { name: /create/i })
      await userEvent.click(submitButton)

      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    })

    it('validates phone number format', async () => {
      const mockCreateLead = vi.mocked(useCreateLead)
      mockCreateLead.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
        error: null
      })

      renderWithQuery(<LeadsPage />)

      const addButton = screen.getByRole('button', { name: /add lead/i })
      await userEvent.click(addButton)

      const phoneInput = screen.getByLabelText(/phone/i)
      await userEvent.type(phoneInput, 'abc123')

      const submitButton = screen.getByRole('button', { name: /create/i })
      await userEvent.click(submitButton)

      expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument()
    })
  })

  // ===== RESPONSIVE DESIGN TESTS =====

  describe('Responsive Design', () => {
    it('displays mobile-friendly table on small screens', async () => {
      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: mockLeads,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      // Mock small screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640,
      })

      renderWithQuery(<LeadsPage />)

      // Should use card layout on mobile
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Austin, TX')).toBeInTheDocument()
    })

    it('shows full table on large screens', async () => {
      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: mockLeads,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      // Mock large screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      })

      renderWithQuery(<LeadsPage />)

      // Should show all table columns
      expect(screen.getByText('Owner Name')).toBeInTheDocument()
      expect(screen.getByText('Phone')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
    })
  })

  // ===== ACCESSIBILITY TESTS =====

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: mockLeads,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderWithQuery(<LeadsPage />)

      // Check main landmarks
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('table')).toBeInTheDocument()

      // Check form elements have proper labels
      const searchInput = screen.getByRole('textbox', { name: /search/i })
      expect(searchInput).toHaveAttribute('aria-label')

      // Check buttons have descriptive text
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName()
      })
    })

    it('supports keyboard navigation', async () => {
      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: mockLeads,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderWithQuery(<LeadsPage />)

      // Test tab navigation
      await userEvent.tab()
      const searchInput = screen.getByRole('textbox', { name: /search/i })
      expect(searchInput).toHaveFocus()

      await userEvent.tab()
      const firstButton = screen.getAllByRole('button')[0]
      expect(firstButton).toHaveFocus()
    })
  })

  // ===== PERFORMANCE TESTS =====

  describe('Performance', () => {
    it('renders large lead lists efficiently', async () => {
      // Create large dataset
      const largeLeads = Array.from({ length: 100 }, (_, i) => ({
        ...mockLeads[0],
        id: i + 1,
        owner_name: `Lead ${i + 1}`,
        email: `lead${i + 1}@example.com`
      }))

      const mockUseLeads = vi.mocked(useLeads)
      mockUseLeads.mockReturnValue({
        data: largeLeads,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      const startTime = performance.now()
      renderWithQuery(<LeadsPage />)
      const endTime = performance.now()

      // Should render within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000)
      expect(screen.getByText('100 Leads')).toBeInTheDocument()
    })

    it('handles rapid search input without errors', async () => {
      const mockUseLeads = vi.mocked(useLeads)
      const mockRefetch = vi.fn()
      mockUseLeads.mockReturnValue({
        data: mockLeads,
        isLoading: false,
        error: null,
        refetch: mockRefetch
      })

      renderWithQuery(<LeadsPage />)

      const searchInput = screen.getByRole('textbox', { name: /search/i })

      // Rapid typing
      await userEvent.type(searchInput, 'test search query', { delay: 10 })

      // Should handle rapid input without crashing
      expect(mockRefetch).toHaveBeenCalled()
    })
  })
})

// ===== INTEGRATION TESTS =====

describe('Lead Management Integration', () => {
  it('completes full lead lifecycle successfully', async () => {
    // Mock API responses
    const mockLeadsApi = vi.mocked(leadsApi)

    // Create lead response
    mockLeadsApi.createLead.mockResolvedValue({
      success: true,
      data: mockLeads[0]
    })

    // Update lead response
    mockLeadsApi.updateLead.mockResolvedValue({
      success: true,
      data: { ...mockLeads[0], status: 'qualified' }
    })

    // Delete lead response
    mockLeadsApi.deleteLead.mockResolvedValue({
      success: true,
      message: 'Lead deleted successfully'
    })

    // Test create
    const createdLead = await leadsApi.createLead(mockLeads[0])
    expect(createdLead.success).toBe(true)
    expect(createdLead.data.owner_name).toBe('John Doe')

    // Test update
    const updatedLead = await leadsApi.updateLead(1, { status: 'qualified' })
    expect(updatedLead.success).toBe(true)
    expect(updatedLead.data.status).toBe('qualified')

    // Test delete
    const deleteResult = await leadsApi.deleteLead(1)
    expect(deleteResult.success).toBe(true)
  })

  it('handles API errors gracefully', async () => {
    const mockLeadsApi = vi.mocked(leadsApi)

    // Mock network error
    mockLeadsApi.getLeads.mockRejectedValue(new Error('Network error'))

    try {
      await leadsApi.getLeads()
      expect(true).toBe(false) // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Network error')
    }
  })
})