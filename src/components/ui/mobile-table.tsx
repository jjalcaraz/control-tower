import React, { useState } from 'react'
import { Card, CardContent } from './card'
import { Button } from './button'
import { Badge } from './badge'
import { Checkbox } from './checkbox'
import { MoreHorizontal, Eye, Edit, Trash2, MessageSquare } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { TableColumn, useLongPress } from '@/lib/utils'

interface MobileTableProps<T extends Record<string, any>> {
  data: T[]
  columns: TableColumn[]
  titleField?: string
  onRowClick?: (item: T) => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  onView?: (item: T) => void
  onMessage?: (item: T) => void
  selectionMode?: boolean
  selectedItems?: string[]
  onSelectionChange?: (selectedItems: string[]) => void
  getIdField?: (item: T) => string
  isLoading?: boolean
  emptyMessage?: string
  actions?: Array<{
    label: string
    icon?: React.ReactNode
    onClick: (item: T) => void
    variant?: 'default' | 'destructive'
  }>
}

export function MobileTable<T extends Record<string, any>>({
  data,
  columns,
  titleField = 'name',
  onRowClick,
  onEdit,
  onDelete,
  onView,
  onMessage,
  selectionMode = false,
  selectedItems = [],
  onSelectionChange,
  getIdField = (item) => item.id?.toString() || JSON.stringify(item),
  isLoading = false,
  emptyMessage = 'No data available',
  actions = [],
}: MobileTableProps<T>) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [swipedItem, setSwipedItem] = useState<string | null>(null)
  const longPressHandlers = useLongPress(() => {
    // Handle long press - could show context menu or selection mode
    console.log('Long press detected')
  })

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const handleSwipeLeft = (item: T) => {
    const id = getIdField(item)
    setSwipedItem(id)
    setTimeout(() => setSwipedItem(null), 100) // Reset after animation
    if (onDelete) {
      onDelete(item)
    }
  }

  const handleSwipeRight = (item: T) => {
    const id = getIdField(item)
    setSwipedItem(id)
    setTimeout(() => setSwipedItem(null), 100) // Reset after animation
    if (onEdit) {
      onEdit(item)
    }
  }

  const handleSelection = (item: T, checked: boolean) => {
    const id = getIdField(item)
    const newSelection = checked
      ? [...selectedItems, id]
      : selectedItems.filter(selectedId => selectedId !== id)
    onSelectionChange?.(newSelection)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange?.(data.map(getIdField))
    } else {
      onSelectionChange?.([])
    }
  }

  // Handle touch events directly for swipe gestures
  const handleTouchStart = (e: React.TouchEvent, item: T) => {
    const target = e.currentTarget as HTMLElement
    target.dataset.touchStart = e.targetTouches[0].clientX.toString()
    target.dataset.itemId = getIdField(item)
    longPressHandlers.onTouchStart(e)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement
    if (!target.dataset.touchStart) return
    target.dataset.touchEnd = e.targetTouches[0].clientX.toString()
  }

  const handleTouchEnd = (e: React.TouchEvent, item: T) => {
    const target = e.currentTarget as HTMLElement
    const touchStart = parseFloat(target.dataset.touchStart || '0')
    const touchEnd = parseFloat(target.dataset.touchEnd || touchStart.toString())
    const minSwipeDistance = 50

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      handleSwipeLeft(item)
    } else if (isRightSwipe) {
      handleSwipeRight(item)
    }

    // Clean up
    delete target.dataset.touchStart
    delete target.dataset.touchEnd
    delete target.dataset.itemId
    longPressHandlers.onTouchEnd()
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {/* Selection Mode Header */}
      {selectionMode && (
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selectedItems.length === data.length && data.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedItems.length} of {data.length} selected
                </span>
              </div>
              {selectedItems.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Bulk Actions
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile Table Rows */}
      {data.map((item) => {
        const id = getIdField(item)
        const isExpanded = expandedItems.has(id)
        const isSwiped = swipedItem === id
        const isVisible = selectedItems.includes(id)

        return (
          <Card
            key={id}
            className={`
              transition-all duration-200 transform
              ${isSwiped ? '-translate-x-4 opacity-75' : ''}
              ${isVisible ? 'ring-2 ring-blue-500' : ''}
              ${onRowClick ? 'cursor-pointer active:scale-[0.98]' : ''}
            `}
            onClick={(e) => {
              longPressHandlers.onClick(e)
              onRowClick?.(item)
            }}
            onMouseDown={longPressHandlers.onMouseDown}
            onMouseUp={longPressHandlers.onMouseUp}
            onMouseLeave={longPressHandlers.onMouseLeave}
            onTouchStart={(e) => handleTouchStart(e, item)}
            onTouchMove={handleTouchMove}
            onTouchEnd={(e) => handleTouchEnd(e, item)}
          >
            <CardContent className="p-4">
              {/* Header Section */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3 flex-1">
                  {selectionMode && (
                    <Checkbox
                      checked={isVisible}
                      onCheckedChange={(checked) => handleSelection(item, checked === true)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {item[titleField] || 'Untitled'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {/* Display 2-3 most important fields */}
                      {columns
                        .slice(0, 3)
                        .map(column => (
                          <span key={column.key} className="inline-block mr-3">
                            <span className="text-gray-600">{column.title}:</span>{' '}
                            <span className="font-medium">
                              {column.key === 'phone' && formatPhoneNumber(item[column.key])}
                              {column.key === 'email' && item[column.key]}
                              {column.key === 'status' && (
                                <Badge variant="outline" className="text-xs">
                                  {item[column.key]}
                                </Badge>
                              )}
                              {column.key !== 'phone' && column.key !== 'email' && column.key !== 'status' &&
                                item[column.key]?.toString()}
                            </span>
                          </span>
                        ))}
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center space-x-1">
                  {onMessage && item.phone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onMessage(item)
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onView && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          onView(item)
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                      )}
                      {onEdit && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          onEdit(item)
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {actions.map((action, index) => (
                        <DropdownMenuItem
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation()
                            action.onClick(item)
                          }}
                          className={action.variant === 'destructive' ? 'text-red-600' : ''}
                        >
                          {action.icon}
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                      {onEdit && onDelete && <DropdownMenuSeparator />}
                      {onDelete && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(item)
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Expand/Collapse Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-left mt-2 p-0 h-auto"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpanded(id)
                }}
              >
                <span className="text-xs text-blue-600">
                  {isExpanded ? 'Hide Details' : 'Show Details'}
                </span>
              </Button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {columns
                      .slice(3)
                      .map(column => {
                        let value = item[column.key]
                        let formattedValue = value

                        // Format specific field types
                        if (column.key === 'created_at' || column.key === 'updated_at') {
                          formattedValue = new Date(value).toLocaleString()
                        } else if (column.key === 'amount' || column.key.includes('cost')) {
                          formattedValue = formatCurrency(value)
                        } else if (typeof value === 'boolean') {
                          formattedValue = value ? 'Yes' : 'No'
                        }

                        return (
                          <div key={column.key} className="flex justify-between">
                            <span className="text-gray-600">{column.title}:</span>
                            <span className="font-medium text-right break-all">
                              {formattedValue?.toString() || '-'}
                            </span>
                          </div>
                        )
                      })}
                  </div>

                  {/* Additional Actions in Expanded View */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                    {onView && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          onView(item)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(item)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                    {onMessage && item.phone && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          onMessage(item)
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Swipe Indicators */}
      <div className="flex justify-center mt-4 text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-8 h-0.5 bg-green-500 mr-1"></div>
            <span>Swipe right to edit</span>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-0.5 bg-red-500 mr-1"></div>
            <span>Swipe left to delete</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to format phone numbers (would typically be imported from utils)
function formatPhoneNumber(phone: string): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

// Helper function to format currency (would typically be imported from utils)
function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num)
}
