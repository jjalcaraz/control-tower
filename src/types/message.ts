export interface Message {
  id: number
  conversationId: number
  leadId: number
  campaignId?: number
  direction: 'inbound' | 'outbound'
  content: string
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read'
  fromNumber: string
  toNumber: string
  providerMessageId?: string
  failureReason?: string
  sentAt?: string
  deliveredAt?: string
  readAt?: string
  createdAt: string
}

export interface Conversation {
  id: number
  leadId: number
  lead: {
    id: number
    firstName: string
    lastName: string
    phone: string
  }
  lastMessage: Message
  unreadCount: number
  status: 'active' | 'closed' | 'archived'
  tags: string[]
  notes: string
  assignedTo?: number
  createdAt: string
  updatedAt: string
}

export interface MessageTemplate {
  id: number
  name: string
  content: string
  category: string
  tags: string[]
  variables: string[] // ["firstName", "propertyAddress"]
  createdAt: string
}

export interface QuickResponse {
  id: number
  name: string
  content: string
  category: string
  hotkey?: string
  order: number
}

export interface PhoneNumber {
  id: number
  number: string
  provider: 'twilio' | 'bandwidth'
  status: 'active' | 'suspended' | 'failed'
  capabilities: string[]
  healthScore: number
  messagesPerDay: number
  createdAt: string
}