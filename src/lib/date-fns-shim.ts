type DateInput = Date | number | string | undefined | null

interface FormatDistanceOptions {
  addSuffix?: boolean
}

function toDate(input: DateInput): Date | null {
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input
  }

  if (typeof input === 'number') {
    const date = new Date(input)
    return isNaN(date.getTime()) ? null : date
  }

  if (typeof input === 'string') {
    const date = new Date(input)
    return isNaN(date.getTime()) ? null : date
  }

  return null
}

export function format(input: DateInput, pattern = 'MMM d, yyyy') {
  const date = toDate(input)
  if (!date) {
    return ''
  }

  const options: Intl.DateTimeFormatOptions = getFormatOptions(pattern)
  finaliseTimeParts(date, options, pattern)
  return new Intl.DateTimeFormat('en-US', options).format(date)
}

function getFormatOptions(pattern: string): Intl.DateTimeFormatOptions {
  switch (pattern) {
    case 'PPP':
      return { month: 'long', day: 'numeric', year: 'numeric' }
    case 'MMM d':
      return { month: 'short', day: 'numeric' }
    case 'MMM d, yyyy':
      return { month: 'short', day: 'numeric', year: 'numeric' }
    case 'MMM d, HH:mm':
      return { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }
    case 'MMM d, HH:mm:ss':
      return {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }
    case 'MMM d, h:mm a':
      return {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }
    case 'h:mm a':
      return { hour: 'numeric', minute: '2-digit', hour12: true }
    default:
      return { month: 'short', day: 'numeric', year: 'numeric' }
  }
}

function finaliseTimeParts(date: Date, options: Intl.DateTimeFormatOptions, pattern: string) {
  if (pattern === '') {
    options.month = undefined
    options.day = undefined
    options.year = undefined
  }
}

export function formatDistanceToNow(input: DateInput, options?: FormatDistanceOptions) {
  const date = toDate(input)
  if (!date) {
    return ''
  }

  const now = Date.now()
  const diff = now - date.getTime()
  const abs = Math.abs(diff)

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day

  let value: number
  let unit: string

  if (abs < minute) {
    value = Math.round(abs / 1000)
    unit = 'second'
  } else if (abs < hour) {
    value = Math.round(abs / minute)
    unit = 'minute'
  } else if (abs < day) {
    value = Math.round(abs / hour)
    unit = 'hour'
  } else if (abs < week) {
    value = Math.round(abs / day)
    unit = 'day'
  } else {
    value = Math.round(abs / week)
    unit = 'week'
  }

  const pluralised = `${value} ${unit}${value === 1 ? '' : 's'}`

  if (options?.addSuffix) {
    return diff >= 0 ? `${pluralised} ago` : `in ${pluralised}`
  }

  return pluralised
}

export function subDays(input: DateInput, amount: number) {
  const date = toDate(input) ?? new Date()
  const result = new Date(date)
  result.setDate(result.getDate() - amount)
  return result
}
