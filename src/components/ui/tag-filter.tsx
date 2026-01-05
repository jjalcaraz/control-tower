import { useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TagFilterProps {
  availableTags: string[]
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  leadCounts?: Record<string, number>
  className?: string
  showSearch?: boolean
  multiple?: boolean
  placeholder?: string
}

export function TagFilter({
  availableTags = [],
  selectedTags = [],
  onTagsChange,
  leadCounts = {},
  className,
  showSearch = true,
  multiple = true,
  placeholder = "Filter by tags..."
}: TagFilterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredTags = availableTags.filter(tag =>
    tag.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleTagToggle = useCallback((tag: string) => {
    if (!multiple) {
      onTagsChange(selectedTags.includes(tag) ? [] : [tag])
      setIsOpen(false)
      return
    }

    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag]
    
    onTagsChange(newTags)
  }, [selectedTags, onTagsChange, multiple])

  const clearAll = useCallback(() => {
    onTagsChange([])
  }, [onTagsChange])

  const selectAll = useCallback(() => {
    onTagsChange([...availableTags])
  }, [availableTags, onTagsChange])

  if (availableTags.length === 0) {
    return (
      <div className={cn("text-center py-4 text-gray-500", className)}>
        <p className="text-sm">No tags available</p>
        <p className="text-xs">Import leads with tags to use tag filtering</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Tag Filter</Label>
        {selectedTags.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-auto p-1 text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              selectedTags.length === 0 && "text-muted-foreground"
            )}
          >
            <Filter className="h-4 w-4 mr-2" />
            {selectedTags.length === 0 
              ? placeholder
              : `${selectedTags.length} tag${selectedTags.length === 1 ? '' : 's'} selected`
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="flex flex-col max-h-96">
            {/* Search */}
            {showSearch && (
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            )}

            {/* Select All / Clear All */}
            {multiple && (
              <div className="p-3 border-b flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  disabled={selectedTags.length === availableTags.length}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  disabled={selectedTags.length === 0}
                >
                  Clear All
                </Button>
              </div>
            )}

            {/* Tag List */}
            <div className="flex-1 overflow-y-auto">
              {filteredTags.length === 0 ? (
                <div className="p-3 text-center text-gray-500">
                  <p className="text-sm">No tags found</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredTags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => handleTagToggle(tag)}
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        {multiple && (
                          <Checkbox
                            checked={selectedTags.includes(tag)}
                            readOnly
                          />
                        )}
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <Badge
                            variant={selectedTags.includes(tag) ? "default" : "outline"}
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                          {leadCounts[tag] && (
                            <span className="text-xs text-gray-500">
                              ({leadCounts[tag]})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1 cursor-pointer hover:bg-gray-200"
              >
                <span>{tag}</span>
                {leadCounts[tag] && (
                  <span className="text-xs opacity-60">({leadCounts[tag]})</span>
                )}
                <X
                  className="h-3 w-3 hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTagToggle(tag)
                  }}
                />
              </Badge>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {selectedTags.length} tag{selectedTags.length === 1 ? '' : 's'} selected
            {Object.keys(leadCounts).length > 0 && (
              <span> • Total leads: {selectedTags.reduce((sum, tag) => sum + (leadCounts[tag] || 0), 0)}</span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}