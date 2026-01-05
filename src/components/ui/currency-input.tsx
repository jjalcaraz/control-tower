import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number | string
  onChange?: (value: number) => void
  onValueChange?: (formattedValue: string, numericValue: number) => void
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value = '', onChange, onValueChange, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState<string>('')

    // Initialize display value from prop
    useEffect(() => {
      const numValue = typeof value === 'string' ? parseCurrencyInput(value) : (value || 0)
      const formatted = numValue === 0 ? '' : formatCurrencyInput(numValue.toString())
      setDisplayValue(formatted)
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      
      // Allow empty input
      if (!inputValue) {
        setDisplayValue('')
        onChange?.(0)
        onValueChange?.('', 0)
        return
      }

      // Remove non-numeric characters except decimal point
      const cleaned = inputValue.replace(/[^\d.]/g, '')
      
      // Prevent multiple decimal points
      const decimalCount = (cleaned.match(/\./g) || []).length
      if (decimalCount > 1) return

      // Parse numeric value
      const numericValue = parseCurrencyInput(cleaned)
      
      // Format for display
      const formatted = formatCurrencyInput(cleaned)
      
      setDisplayValue(formatted)
      onChange?.(numericValue)
      onValueChange?.(formatted, numericValue)
    }

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        className={className}
        placeholder={props.placeholder || '25,000'}
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'