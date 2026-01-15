export interface Message {
  id: string | number
  conversationId: string | number
  leadId: string | number
  campaignId?: string | number
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
  id: string | number
  leadId: string | number
  lead: {
    id: string | number
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
  id: string | number
  name: string
  content: string
  category: string
  tags: string[]
  variables: string[] // ["firstName", "propertyAddress"]
  createdAt: string
}

export interface QuickResponse {
  id: string | number
  name: string
  content: string
  category: string
  hotkey?: string
  order: number
}

export interface PhoneNumber {
  id: string | number
  number: string
  provider: 'twilio' | 'bandwidth'
  status: 'active' | 'suspended' | 'failed'
  capabilities: string[]
  healthScore: number
  messagesPerDay: number
  createdAt: string
}
