import * as React from 'react'

import { cn } from '@/lib/utils'

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange'> {
  value?: number[]
  defaultValue?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
}

export function Slider({
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  ...props
}: SliderProps) {
  const [internalValue, setInternalValue] = React.useState<number>(() => {
    if (value && value.length > 0) return value[0]
    if (defaultValue && defaultValue.length > 0) return defaultValue[0]
    return min
  })

  React.useEffect(() => {
    if (value && value.length > 0) {
      setInternalValue(value[0])
    }
  }, [value])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value)
    setInternalValue(nextValue)
    onValueChange?.([nextValue])
  }

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={internalValue}
      onChange={handleChange}
      className={cn(
        'w-full cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        className
      )}
      {...props}
    />
  )
}
