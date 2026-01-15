import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type {
  WebSocketMessage,
  WebSocketStatus,
  DashboardMetricsUpdate,
  CampaignMetricsUpdate,
  NewMessageEvent,
  OptOutEvent,
  PhoneHealthUpdate
} from '@/types/websocket'

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const isWebSocketFeatureEnabled =
  ((import.meta as any).env.VITE_ENABLE_WEBSOCKETS || 'false') === 'true'
const WS_BASE = (import.meta as any).env.VITE_WS_URL || 'ws://localhost:8000/ws'

interface UseWebSocketOptions<T = any> {
  onMessage?: (data: T) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  validateMessage?: (messageData: any) => messageData is T
  reconnectDelay?: number
  maxReconnectAttempts?: number
  enabled?: boolean
  reconnectAttempts?: number
  reconnectInterval?: number
}

export function useWebSocket<T = any>(url: string, options: UseWebSocketOptions<T> = {}) {
  const [data, setData] = useState<T | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [status, setStatus] = useState<WebSocketStatus>('disconnected')

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    validateMessage,
    reconnectDelay = parseInt((import.meta as any).env.VITE_WS_RECONNECT_DELAY || '3000'),
    maxReconnectAttempts = parseInt((import.meta as any).env.VITE_WS_MAX_RECONNECT_ATTEMPTS || '5'),
    enabled = true
  } = options

  // Disable WebSocket in demo mode
  const wsEnabled = enabled && !isDemoMode && isWebSocketFeatureEnabled
  const hasLoggedDisabledRef = useRef(false)

  const _defaultValidate = (messageData: any): messageData is T => {
    // Basic validation - override in specific hooks for stricter validation
    return messageData && typeof messageData === 'object'
  }

  const validator = validateMessage || _defaultValidate

  const connect = () => {
    // Skip connection in demo mode
    if (isDemoMode) {
      console.log('🔧 Demo Mode: WebSocket connections disabled')
      return
    }

    try {
      setStatus('connecting')

      // Get auth token for WebSocket connection
      const token = localStorage.getItem('auth_token')
      const wsUrl = `${url}${token ? `?token=${token}` : ''}`

      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        setIsConnected(true)
        setStatus('connected')
        setError(null)
        reconnectAttemptsRef.current = 0
        setReconnectAttempts(0)
        onConnect?.()
      }

      wsRef.current.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data) as WebSocketMessage

          if (validator(parsedData.data)) {
            setData(parsedData.data)
            onMessage?.(parsedData.data)
          } else {
            console.warn('Invalid WebSocket message format:', parsedData)
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      wsRef.current.onclose = () => {
        setIsConnected(false)
        setStatus('disconnected')
        onDisconnect?.()

        // Attempt to reconnect if not at max attempts
        const attempts = reconnectAttemptsRef.current
        if (attempts < maxReconnectAttempts) {
          setStatus('reconnecting')
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1
            setReconnectAttempts(reconnectAttemptsRef.current)
            connect()
          }, reconnectDelay * Math.pow(2, attempts)) // Exponential backoff
        } else {
          setStatus('error')
          setError('Max reconnection attempts reached')
        }
      }

      wsRef.current.onerror = (event) => {
        setStatus('error')
        setError('WebSocket connection error')
        onError?.(event)
      }

    } catch (err) {
      setStatus('error')
      setError('Failed to establish WebSocket connection')
      console.error('WebSocket connection error:', err)
    }
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnected(false)
    setStatus('disconnected')
    setReconnectAttempts(0)
    reconnectAttemptsRef.current = 0
  }

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  useEffect(() => {
    if (!wsEnabled) {
      // Ensure any stale connection is cleaned up when feature flag disables sockets
      disconnect()
      if (!hasLoggedDisabledRef.current && enabled && !isWebSocketFeatureEnabled) {
        console.info('ℹ️ WebSocket feature disabled via VITE_ENABLE_WEBSOCKETS=false')
        hasLoggedDisabledRef.current = true
      }
      return
    }

    connect()

    return () => {
      disconnect()
    }
  }, [url, wsEnabled])

  return {
    data,
    isConnected,
    error,
    status,
    reconnectAttempts,
    sendMessage,
    disconnect,
    reconnect: connect
  }
}

// Dashboard-specific WebSocket hooks
export function useDashboardWebSocket() {
  const queryClient = useQueryClient()
  const WS_URL = `${WS_BASE}/dashboard`

  return useWebSocket<DashboardMetricsUpdate>(WS_URL, {
    onMessage: (data) => {
      // Update dashboard metrics cache
      queryClient.setQueryData(['analytics', 'dashboard'], data)
    },
    reconnectDelay: 3000,
    maxReconnectAttempts: 5,
    validateMessage: (messageData): messageData is DashboardMetricsUpdate => {
      return (
        messageData &&
        typeof messageData === 'object' &&
        typeof messageData.total_leads === 'number' &&
        typeof messageData.active_campaigns === 'number' &&
        typeof messageData.messages_today === 'number' &&
        typeof messageData.delivery_rate === 'number' &&
        typeof messageData.reply_rate === 'number' &&
        typeof messageData.phone_health === 'number'
      )
    }
  })
}

// Lead-specific WebSocket hooks
export function useLeadWebSocket() {
  const queryClient = useQueryClient()
  const WS_URL = `${WS_BASE}/leads`

  return useWebSocket(WS_URL, {
    onMessage: (data) => {
      void data
      // Invalidate leads cache on lead updates
      switch (data.type) {
        case 'lead_created':
        case 'lead_updated':
        case 'lead_deleted':
        case 'lead_imported':
          queryClient.invalidateQueries(['leads'])
          break
      }
    },
    reconnectDelay: 3000,
    maxReconnectAttempts: 5
  })
}

// Campaign-specific WebSocket hooks
export function useCampaignWebSocket(campaignId?: number) {
  const queryClient = useQueryClient()
  const WS_URL = campaignId
    ? `${WS_BASE}/campaigns/${campaignId}`
    : `${WS_BASE}/campaigns`

  return useWebSocket<CampaignMetricsUpdate>(WS_URL, {
    onMessage: (data) => {
      // Update campaign-specific cache
      if (campaignId) {
        queryClient.setQueryData(['campaigns', campaignId], (old: any) => ({
          ...old,
          stats: data
        }))
      }
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
    reconnectDelay: 2000,
    maxReconnectAttempts: 5,
    validateMessage: (messageData): messageData is CampaignMetricsUpdate => {
      return (
        messageData &&
        typeof messageData === 'object' &&
        typeof messageData.campaign_id === 'number' &&
        typeof messageData.sent_count === 'number' &&
        typeof messageData.delivered_count === 'number' &&
        typeof messageData.reply_count === 'number'
      )
    }
  })
}

// Messages/Conversation WebSocket hooks
export function useMessagesWebSocket() {
  const queryClient = useQueryClient()
  const WS_URL = `${WS_BASE}/messages`

  return useWebSocket<NewMessageEvent>(WS_URL, {
    onMessage: (data) => {
      // Update conversation list when new messages arrive
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      // Remove unreadCount invalidation since this query doesn't exist in use-api.ts
    },
    reconnectDelay: 2000,
    maxReconnectAttempts: 5,
    validateMessage: (messageData): messageData is NewMessageEvent => {
      return (
        messageData &&
        typeof messageData === 'object' &&
        (typeof messageData.conversation_id === 'number' || typeof messageData.conversation_id === 'string') &&
        typeof messageData.content === 'string' &&
        typeof messageData.direction === 'string'
      )
    }
  })
}

// Conversation-specific WebSocket hook
export function useConversationWebSocket(conversationId: string | number) {
  const queryClient = useQueryClient()
  const WS_URL = `${WS_BASE}/conversations/${conversationId}`

  return useWebSocket<NewMessageEvent>(WS_URL, {
    onMessage: (data) => {
      // Update specific conversation messages
      queryClient.setQueryData(['conversations', conversationId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          messages: [...old.messages, data]
        }
      })
    },
    reconnectDelay: 2000,
    maxReconnectAttempts: 5
  })
}

// Phone Numbers health monitoring WebSocket
export function usePhoneNumbersWebSocket() {
  const queryClient = useQueryClient()
  const WS_URL = `${WS_BASE}/phone-numbers`

  return useWebSocket<PhoneHealthUpdate>(WS_URL, {
    onMessage: (data) => {
      // Update phone numbers cache
      queryClient.setQueryData(['phone-numbers'], (old: any) => {
        if (!old || !old.data) return old
        return {
          ...old,
          data: old.data.map((phone: any) =>
            phone.id === data.phone_number_id
              ? { ...phone, health_score: data.health_score }
              : phone
          )
        }
      })
      // Also invalidate parameterized queries to refresh
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'phone-numbers'
      })
    },
    reconnectDelay: 5000,
    maxReconnectAttempts: 5,
    validateMessage: (messageData): messageData is PhoneHealthUpdate => {
      return (
        messageData &&
        typeof messageData === 'object' &&
        typeof messageData.phone_number_id === 'number' &&
        typeof messageData.health_score === 'number'
      )
    }
  })
}

// Analytics real-time updates WebSocket
export function useAnalyticsWebSocket() {
  const queryClient = useQueryClient()
  const WS_URL = `${WS_BASE}/analytics`

  return useWebSocket(WS_URL, {
    onMessage: (data) => {
      void data
      // Update relevant analytics cache
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'analytics'
      })
    },
    reconnectDelay: 3000,
    maxReconnectAttempts: 3
  })
}

// Compliance monitoring WebSocket (for real-time opt-outs, violations)
export function useComplianceWebSocket() {
  const queryClient = useQueryClient()
  const WS_URL = `${WS_BASE}/compliance`

  return useWebSocket<OptOutEvent>(WS_URL, {
    onMessage: (data) => {
      void data
      // Update compliance cache
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'compliance'
      })
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'opt-outs'
      })
    },
    reconnectDelay: 2000,
    maxReconnectAttempts: 5,
    validateMessage: (messageData): messageData is OptOutEvent => {
      return (
        messageData &&
        typeof messageData === 'object' &&
        typeof messageData.phone_number === 'string' &&
        typeof messageData.source === 'string'
      )
    }
  })
}

// System-wide notifications WebSocket
export function useNotificationsWebSocket() {
  const WS_URL = `${WS_BASE}/notifications`

  return useWebSocket(WS_URL, {
    onMessage: (data) => {
      // Handle system notifications (show toast, update UI, etc.)
      console.log('System notification received:', data)
    },
    reconnectDelay: 2000,
    maxReconnectAttempts: 3
  })
}
