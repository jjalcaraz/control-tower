import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { LeadForm } from '@/components/leads/LeadForm'
import type { Lead } from '@/types/lead'

vi.mock('@/components/ui/select', () => {
  const React = require('react')

  const SelectItem = ({ value, children }: any) => (
    <option value={value}>{children}</option>
  )

  const SelectContent = ({ children }: any) => <>{children}</>

  const SelectTrigger = ({ children }: any) => <>{children}</>

  const SelectValue = ({ placeholder }: any) => (
    <option value="">{placeholder}</option>
  )

  const Select = ({ onValueChange, children }: any) => {
    const options: any[] = []

    const walk = (nodes: any) => {
      React.Children.forEach(nodes, (child: any) => {
        if (!child) return
        if (child.type === SelectItem) {
          options.push(child)
          return
        }
        if (child.props?.children) {
          walk(child.props.children)
        }
      })
    }

    walk(children)

    return (
      <select
        aria-label="mock-select"
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {options.map((option) =>
          React.cloneElement(option, { key: option.props.value })
        )}
      </select>
    )
  }

  return {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  }
})

describe('LeadForm', () => {
  it('shows validation errors on empty submit', async () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    const user = userEvent.setup()

    const { container } = render(<LeadForm onSubmit={onSubmit} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: /create lead/i }))

    expect(await screen.findByText('First name is required')).toBeInTheDocument()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
    expect(
      screen.getByText(/Primary phone number must be at least 10 digits/i)
    ).toBeInTheDocument()
  })

  it('prefills required fields from lead defaults', async () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    const leadDefaults: Partial<Lead> = {
      firstName: 'Jane',
      lastName: 'Doe',
      primaryPhone: '5551234567',
      address: {
        street: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        county: 'Travis',
      },
      property: {
        propertyType: 'Vacant Land',
      },
      leadSource: 'SMS',
      status: 'new',
      score: 'cold',
      tags: [],
    }

    render(
      <LeadForm
        lead={leadDefaults}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    expect(screen.getByLabelText(/first name/i)).toHaveValue('Jane')
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe')
    expect(screen.getByLabelText(/primary phone/i)).toHaveValue('5551234567')
    expect(screen.getByLabelText(/street address/i)).toHaveValue('123 Main St')
    expect(screen.getByLabelText(/city/i)).toHaveValue('Austin')
    expect(screen.getByLabelText(/^state$/i)).toHaveValue('TX')
    expect(screen.getByLabelText(/zip code/i)).toHaveValue('78701')
    expect(screen.getByLabelText(/county/i)).toHaveValue('Travis')

    expect(screen.getByRole('button', { name: /update lead/i })).toBeInTheDocument()
  })
})
