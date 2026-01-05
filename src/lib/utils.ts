import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useEffect, useState } from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return ''
  
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  
  return phone
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

// Currency input formatting utilities (without $ symbol for form inputs)
export function formatCurrencyInput(value: string | number): string {
  if (!value && value !== 0) return ''
  
  // Convert to string and remove non-numeric characters except decimal point
  const str = value.toString().replace(/[^\d.]/g, '')
  
  // Handle empty string
  if (!str) return ''
  
  // Parse the number
  const num = parseFloat(str)
  if (isNaN(num)) return ''
  
  // Format with commas
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function parseCurrencyInput(value: string): number {
  if (!value) return 0
  
  // Remove commas and parse as number
  const cleaned = value.replace(/,/g, '')
  const num = parseFloat(cleaned)
  
  return isNaN(num) ? 0 : num
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A'
  }
  
  const dateObj = new Date(date)
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'N/A'
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj)
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A'
  }
  
  const dateObj = new Date(date)
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'N/A'
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}


export function calculateDeliveryRate(sent: number, delivered: number): number {
  if (sent === 0) return 0
  return Math.round((delivered / sent) * 100)
}

export function calculateResponseRate(sent: number, replies: number): number {
  if (sent === 0) return 0
  return Math.round((replies / sent) * 100)
}

export function calculateConversionRate(sent: number, conversions: number): number {
  if (sent === 0) return 0
  return Math.round((conversions / sent) * 100)
}

export function generateRandomId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substr(0, maxLength) + '...'
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned[0] === '1')
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()
}

export function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | undefined
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Mobile Responsiveness Utilities
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [matches, query])

  return matches
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}

export function useIsSmallMobile(): boolean {
  return useMediaQuery('(max-width: 479px)')
}

// Table Responsiveness Utilities
export interface TableColumn {
  key: string
  title: string
  mobileHide?: boolean
  tabletHide?: boolean
  priority?: 'high' | 'medium' | 'low'
}

export function getResponsiveTableColumns(
  columns: TableColumn[],
  viewportSize: 'mobile' | 'tablet' | 'desktop'
): TableColumn[] {
  return columns.filter(column => {
    if (viewportSize === 'mobile') return !column.mobileHide
    if (viewportSize === 'tablet') return !column.tabletHide
    return true
  })
}

export function formatTableDataForMobile<T extends Record<string, any>>(
  data: T[],
  columns: TableColumn[],
  titleField: string = 'name'
): Array<Record<string, any> & { _mobileTitle: string }> {
  return data.map(row => ({
    ...row,
    _mobileTitle: row[titleField] || 'Item',
    _mobileVisibleColumns: getResponsiveTableColumns(columns, 'mobile')
      .map(col => ({
        key: col.key,
        title: col.title,
        value: row[col.key],
      })),
  }))
}

// Touch Gesture Utilities
export interface SwipeHandlers<T = any> {
  onSwipeLeft?: (item?: T) => void
  onSwipeRight?: (item?: T) => void
  threshold?: number
  item?: T
}

export function useSwipeGesture<T = any>(handlers: SwipeHandlers<T>) {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const minSwipeDistance = handlers.threshold || 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && handlers.onSwipeLeft) {
      handlers.onSwipeLeft(handlers.item)
    } else if (isRightSwipe && handlers.onSwipeRight) {
      handlers.onSwipeRight(handlers.item)
    }
  }

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  }
}

export function useLongPress(
  onLongPress: () => void,
  delay: number = 500
) {
  const [longPressTriggered, setLongPressTriggered] = useState(false)
  let timeoutId: NodeJS.Timeout | null = null

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    timeoutId = setTimeout(() => {
      onLongPress()
      setLongPressTriggered(true)
    }, delay)
  }

  const clear = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    setLongPressTriggered(false)
  }

  const onClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (longPressTriggered) {
      e.preventDefault()
    }
  }

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    onClick,
  }
}

// Performance Utilities
export function memoize<T extends (...args: any[]) => any>(
  func: T
): T {
  const cache = new Map()

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) {
      return cache.get(key)
    }
    const result = func(...args)
    cache.set(key, result)
    return result
  }) as T
}

// Enhanced Data Formatting Utilities
export function formatPhoneNumberInternational(phone: string): string {
  if (!phone) return ''

  const cleaned = phone.replace(/\D/g, '')

  // Handle international format
  if (cleaned.length >= 10) {
    if (cleaned.length === 10) {
      // Assume US number
      return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    } else if (cleaned.length > 10) {
      // Already has country code
      const countryCode = cleaned.slice(0, cleaned.length - 10)
      const areaCode = cleaned.slice(-10, -7)
      const prefix = cleaned.slice(-7, -4)
      const lineNumber = cleaned.slice(-4)
      return `+${countryCode} (${areaCode}) ${prefix}-${lineNumber}`
    }
  }

  return phone
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  } else {
    return `${remainingSeconds}s`
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const diffInMs = now.getTime() - targetDate.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInMinutes < 1) {
    return 'Just now'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  } else {
    return targetDate.toLocaleDateString()
  }
}