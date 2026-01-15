import * as React from 'react'

import { cn } from '@/lib/utils'

export interface CalendarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'disabled' | 'onSelect'> {
  selected?: Date
  onSelect?: (date?: Date) => void
  disabled?: (date: Date) => boolean
  mode?: 'single'
  initialFocus?: boolean
}

export function Calendar({
  className,
  selected,
  onSelect,
  disabled,
  mode = 'single',
  initialFocus = false,
  ...props
}: CalendarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const formattedValue = selected ? toInputValue(selected) : ''

  React.useEffect(() => {
    if (initialFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [initialFocus])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value

    if (!nextValue) {
      onSelect?.(undefined)
      return
    }

    const nextDate = new Date(`${nextValue}T00:00:00`)

    if (Number.isNaN(nextDate.getTime())) {
      return
    }

    if (disabled?.(nextDate)) {
      if (inputRef.current) {
        inputRef.current.value = formattedValue
      }
      return
    }

    onSelect?.(nextDate)
  }

  const minValue = getMinValue(disabled)

  return (
    <div className={cn('p-3', className)}>
      <input
        ref={inputRef}
        type="date"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        value={formattedValue}
        onChange={handleChange}
        min={props.min ?? minValue}
        aria-label="Select date"
        {...props}
      />
      {mode !== 'single' && (
        <p className="mt-2 text-xs text-muted-foreground">
          This simplified calendar currently supports selecting a single date.
        </p>
      )}
    </div>
  )
}

function toInputValue(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMinValue(disabled?: (date: Date) => boolean) {
  if (!disabled) {
    return undefined
  }

  const today = new Date()
  const normalizedToday = new Date(`${toInputValue(today)}T00:00:00`)

  if (!disabled(normalizedToday)) {
    return undefined
  }

  for (let i = 1; i <= 365; i++) {
    const candidate = new Date(normalizedToday)
    candidate.setDate(candidate.getDate() + i)
    if (!disabled(candidate)) {
      return toInputValue(candidate)
    }
  }

  return undefined
}
