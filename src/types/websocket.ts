export interface WebSocketMessage {
  type: string
  data: any
  timestamp?: string
}

export enum WebSocketEvent {
  // Dashboard events
  DASHBOARD_METRICS_UPDATE = 'dashboard_metrics_update',
  DASHBOARD_ACTIVITY_EVENT = 'dashboard_activity_event',
  SYSTEM_HEALTH_UPDATE = 'system_health_update',

  // Campaign events
  CAMPAIGN_STATUS_UPDATE = 'campaign_status_update',
  CAMPAIGN_METRICS_UPDATE = 'campaign_metrics_update',
  CAMPAIGN_PROGRESS_UPDATE = 'campaign_progress_update',

  // Message events
  NEW_MESSAGE_EVENT = 'new_message_event',
  MESSAGE_STATUS_UPDATE = 'message_status_update',
  TYPING_INDICATOR_EVENT = 'typing_indicator_event',
  CONVERSATION_UPDATE = 'conversation_update',

  // Lead events
  LEAD_CREATED = 'lead_created',
  LEAD_UPDATED = 'lead_updated',
  LEAD_DELETED = 'lead_deleted',
  LEAD_IMPORTED = 'lead_imported',

  // Compliance events
  OPT_OUT_EVENT = 'opt_out_event',
  COMPLIANCE_VIOLATION_EVENT = 'compliance_violation_event',
  AUDIT_LOG_EVENT = 'audit_log_event',

  // Phone number events
  PHONE_HEALTH_UPDATE = 'phone_health_update',
  PHONE_STATUS_CHANGE = 'phone_status_change',
  PHONE_VOLUME_UPDATE = 'phone_volume_update',
}

export type WebSocketStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'reconnecting'

// Dashboard WebSocket Types
export interface DashboardMetricsUpdate {
  total_leads: number
  active_campaigns: number
  messages_today: number
  delivery_rate: number
  reply_rate: number
  phone_health: number
  timestamp: string
  activities?: any[]
}

export interface DashboardActivityEvent {
  id: string
  type: 'message_sent' | 'campaign_started' | 'lead_imported' | 'compliance_issue'
  message: string
  user_id?: string
  timestamp: string
  metadata?: any
}

export interface SystemHealthUpdate {
  twilio_connection: 'connected' | 'disconnected' | 'error'
  database_connection: 'connected' | 'disconnected' | 'error'
  worker_queue_status: 'healthy' | 'warning' | 'error'
  error_rate: number
  last_sync: string
}

// Campaign WebSocket Types
export interface CampaignStatusUpdate {
  campaign_id: number
  status: 'draft' | 'queued' | 'sending' | 'paused' | 'completed' | 'failed'
  timestamp: string
  previous_status?: string
}

export interface CampaignMetricsUpdate {
  campaign_id: number
  sent_count: number
  delivered_count: number
  reply_count: number
  opt_out_count: number
  conversion_count: number
  timestamp: string
}

export interface CampaignProgressUpdate {
  campaign_id: number
  progress_percentage: number
  estimated_completion: string
  current_sending_rate: number
  timestamp: string
}

// Message WebSocket Types
export interface NewMessageEvent {
  conversation_id: string | number
  message_id: string | number
  content: string
  direction: 'inbound' | 'outbound'
  sender: string
  recipient: string
  status: 'sent' | 'delivered' | 'failed' | 'read'
  timestamp: string
}

export interface MessageStatusUpdate {
  message_id: string | number
  conversation_id: string | number
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'read'
  timestamp: string
  error_message?: string
}

export interface TypingIndicatorEvent {
  conversation_id: string | number
  user_id?: string | number
  is_typing: boolean
  timestamp: string
}

export interface ConversationUpdate {
  conversation_id: string | number
  unread_count: number
  last_message_at: string
  status: 'active' | 'archived'
  timestamp: string
}

// Lead WebSocket Types
export interface LeadCreated {
  lead_id: string | number
  data: any
  timestamp: string
}

export interface LeadUpdated {
  lead_id: string | number
  changes: Record<string, any>
  timestamp: string
}

export interface LeadDeleted {
  lead_id: string | number
  timestamp: string
}

export interface LeadImported {
  import_id: string
  status: 'started' | 'processing' | 'completed' | 'failed'
  progress: number
  total_rows: number
  processed_rows: number
  success_count: number
  error_count: number
  timestamp: string
}

// Compliance WebSocket Types
export interface OptOutEvent {
  phone_number: string
  reason?: string
  source: 'manual' | 'keyword' | 'complaint'
  timestamp: string
}

export interface ComplianceViolationEvent {
  violation_id: string
  type: 'time_restriction' | 'consent_missing' | 'rate_limit' | 'content_violation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  campaign_id?: number
  timestamp: string
}

export interface AuditLogEvent {
  log_id: string
  action: string
  resource_type: string
  resource_id?: string
  user_id?: string
  ip_address?: string
  timestamp: string
}

// Phone Number WebSocket Types
export interface PhoneHealthUpdate {
  phone_number_id: number
  phone_number: string
  health_score: number
  previous_health_score?: number
  issues: string[]
  timestamp: string
}

export interface PhoneStatusChange {
  phone_number_id: number
  phone_number: string
  status: 'active' | 'quarantined' | 'blocked' | 'suspended'
  previous_status?: string
  reason?: string
  timestamp: string
}

export interface PhoneVolumeUpdate {
  phone_number_id: number
  phone_number: string
  daily_sent: number
  daily_limit: number
  current_mps: number
  max_mps: number
  timestamp: string
}
