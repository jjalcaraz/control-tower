import { useState, useCallback, forwardRef } from 'react'
import { X, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { validateAndCleanTags } from '@/lib/leadTagging'
import { cn } from '@/lib/utils'

export interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  className?: string
  disabled?: boolean
  autoValidate?: boolean
}

export const TagInput = forwardRef<HTMLDivElement, TagInputProps>(
  ({ 
    value = [], 
    onChange, 
    placeholder = "Enter tags...", 
    maxTags = 10,
    className,
    disabled = false,
    autoValidate = true,
    ...props 
  }, ref) => {
    const [inputValue, setInputValue] = useState('')
    const [error, setError] = useState<string>('')

    const validateTag = useCallback((tag: string): string | null => {
      if (!tag.trim()) return 'Tag cannot be empty'
      if (tag.length > 50) return 'Tag must be less than 50 characters'
      if (!/^[A-Z0-9\s\-+]+$/i.test(tag)) return 'Tag can only contain letters, numbers, spaces, hyphens, and plus signs'
      if (value.includes(tag.toUpperCase())) return 'Tag already exists'
      if (value.length >= maxTags) return `Maximum ${maxTags} tags allowed`
      return null
    }, [value, maxTags])

    const addTag = useCallback((tag: string) => {
      const trimmedTag = tag.trim()
      
      if (!trimmedTag) {
        setError('')
        return
      }

      const validationError = validateTag(trimmedTag)
      if (validationError) {
        setError(validationError)
        return
      }

      setError('')
      
      const newTags = autoValidate 
        ? validateAndCleanTags([...value, trimmedTag])
        : [...value, trimmedTag.toUpperCase()]
      
      onChange(newTags)
      setInputValue('')
    }, [value, onChange, validateTag, autoValidate])

    const removeTag = useCallback((tagToRemove: string) => {
      const newTags = value.filter(tag => tag !== tagToRemove)
      onChange(newTags)
      setError('')
    }, [value, onChange])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        addTag(inputValue)
      } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
        removeTag(value[value.length - 1])
      }
    }, [inputValue, addTag, removeTag, value])

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value)
      setError('')
    }, [])

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        <div 
          className={cn(
            "min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            disabled && "cursor-not-allowed opacity-50",
            error && "border-red-500 focus-within:ring-red-500"
          )}
        >
          {/* Display existing tags */}
          <div className="flex flex-wrap gap-1 mb-2">
            {value.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1 cursor-pointer hover:bg-gray-200"
              >
                <span>{tag}</span>
                {!disabled && (
                  <X
                    className="h-3 w-3 hover:text-red-600"
                    onClick={() => removeTag(tag)}
                  />
                )}
              </Badge>
            ))}
          </div>

          {/* Input field */}
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={value.length === 0 ? placeholder : "Add more tags..."}
              disabled={disabled || value.length >= maxTags}
              className="border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {inputValue && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => addTag(inputValue)}
                disabled={disabled}
                className="h-6 w-6 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {/* Help text */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>Press Enter or comma to add a tag. Press Backspace to remove the last tag.</p>
          {autoValidate && (
            <p>Tags are automatically formatted: uppercase, max 3 tags, alphanumeric only.</p>
          )}
          <p>{value.length}/{maxTags} tags used</p>
        </div>
      </div>
    )
  }
)

TagInput.displayName = "TagInput"