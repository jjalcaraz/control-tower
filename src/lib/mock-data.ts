// Mock data service for frontend-only development

export const mockDashboardMetrics = {
  totalLeads: 1247,
  activeCampaigns: 3,
  messagesSent: 8459,
  deliveryRate: 96.8,
  responseRate: 12.4,
  conversionRate: 3.2,
  recentActivity: [
    { id: 1, type: 'lead', message: 'New lead: John Doe - john@example.com', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
    { id: 2, type: 'campaign', message: 'Campaign "Summer Sale" completed', timestamp: new Date(Date.now() - 1000 * 60 * 15) },
    { id: 3, type: 'message', message: 'SMS sent to 234 recipients', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
  ]
}

export const mockLeads = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    propertyAddress: '123 Main St, Anytown, USA',
    propertyType: 'Single Family',
    beds: 3,
    baths: 2,
    squareFootage: 1500,
    landSize: 0.25,
    offerPrice: 250000,
    status: 'new',
    source: 'Website',
    assignedAgent: 'Agent Smith',
    tags: ['hot-lead', 'single-family'],
    notes: 'Interested in selling quickly',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+1234567891',
    propertyAddress: '456 Oak Ave, Anytown, USA',
    propertyType: 'Condo',
    beds: 2,
    baths: 2,
    squareFootage: 1200,
    landSize: 0,
    offerPrice: 180000,
    status: 'contacted',
    source: 'Referral',
    assignedAgent: 'Agent Johnson',
    tags: ['condo', 'investor'],
    notes: 'Looking for quick sale',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18')
  }
]

export const mockCampaigns = [
  {
    id: 1,
    name: 'Spring Cash Offer Campaign',
    description: 'Target homeowners interested in quick cash sales',
    status: 'active',
    templateId: 1,
    recipientCount: 245,
    sentCount: 200,
    deliveryRate: 97.5,
    responseRate: 15.2,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
    createdAt: new Date('2023-12-15'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: 2,
    name: 'Multi-Property Owners',
    description: 'Focus on owners with multiple investment properties',
    status: 'draft',
    templateId: 2,
    recipientCount: 150,
    sentCount: 0,
    deliveryRate: 0,
    responseRate: 0,
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-04-30'),
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10')
  }
]

export const mockTemplates = [
  {
    id: 1,
    name: 'Cash Offer Template',
    content: 'Hi {{firstName}}, I saw your property at {{propertyAddress}} and would like to make a fair cash offer. No fees, no commissions. Call us at {{phoneNumber}}.',
    category: 'Cash Offer',
    variables: ['firstName', 'propertyAddress', 'phoneNumber'],
    isActive: true,
    usageCount: 156,
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 2,
    name: 'Investment Opportunity',
    content: 'Hello {{firstName}}, are you interested in selling your {{propertyType}} property? We are buying properties in {{area}} and can close quickly.',
    category: 'Investment',
    variables: ['firstName', 'propertyType', 'area'],
    isActive: true,
    usageCount: 89,
    createdAt: new Date('2023-12-10'),
    updatedAt: new Date('2024-01-10')
  }
]

export const mockMessages = [
  {
    id: 1,
    to: '+1234567890',
    from: '+1987654321',
    content: 'Hi John, thanks for your interest. We can definitely work with your timeline.',
    direction: 'outgoing',
    status: 'delivered',
    leadId: 1,
    campaignId: 'c459679f-f251-4f41-8031-ad3cfd0192ab',
    sentAt: new Date(Date.now() - 1000 * 60 * 60),
    deliveredAt: new Date(Date.now() - 1000 * 60 * 59),
    createdAt: new Date(Date.now() - 1000 * 60 * 60)
  },
  {
    id: 2,
    to: '+1987654321',
    from: '+1234567890',
    content: 'That sounds great! What are the next steps?',
    direction: 'incoming',
    status: 'received',
    leadId: 1,
    campaignId: null,
    sentAt: new Date(Date.now() - 1000 * 60 * 30),
    createdAt: new Date(Date.now() - 1000 * 60 * 30)
  }
]

export interface MockConversationSummary {
  id: string
  leadId: string
  leadName: string
  leadPhone: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  status: 'active' | 'archived' | 'starred'
  tags: string[]
  campaignId?: string
  campaignName?: string
}

export interface MockConversationMessage {
  id: string
  conversationId: string
  content: string
  direction: 'inbound' | 'outbound'
  timestamp: string
  status: 'sent' | 'delivered' | 'failed' | 'read'
  leadId: string
}

export const mockConversationSummaries: MockConversationSummary[] = [
  {
    id: '1',
    leadId: '101',
    leadName: 'John Smith',
    leadPhone: '+1 (555) 123-4567',
    lastMessage: "Yes, I'm interested in hearing more about your offer.",
    lastMessageAt: '2024-01-15T14:30:00Z',
    unreadCount: 2,
    status: 'active',
    tags: ['interested', 'texas'],
    campaignId: 'c459679f-f251-4f41-8031-ad3cfd0192ab',
    campaignName: 'Test Campaign Q1 2025'
  },
  {
    id: '2',
    leadId: '102',
    leadName: 'Sarah Johnson',
    leadPhone: '+1 (555) 987-6543',
    lastMessage: 'Not interested, please remove me from your list.',
    lastMessageAt: '2024-01-15T12:15:00Z',
    unreadCount: 0,
    status: 'active',
    tags: ['opt-out'],
    campaignId: 'c459679f-f251-4f41-8031-ad3cfd0192ab',
    campaignName: 'Test Campaign Q1 2025'
  },
  {
    id: '3',
    leadId: '103',
    leadName: 'Mike Wilson',
    leadPhone: '+1 (555) 456-7890',
    lastMessage: 'Can you tell me more about the process?',
    lastMessageAt: '2024-01-15T09:45:00Z',
    unreadCount: 1,
    status: 'starred',
    tags: ['warm-lead', 'commercial'],
    campaignId: 'c459679f-f251-4f41-8031-ad3cfd0192ab',
    campaignName: 'Test Campaign Q1 2025'
  }
]

export const mockConversationMessages: MockConversationMessage[] = [
  {
    id: '1',
    conversationId: '1',
    content: "Hi John, I saw your property in Austin and I'm interested in making a fair cash offer. Are you looking to sell?",
    direction: 'outbound',
    timestamp: '2024-01-15T10:00:00Z',
    status: 'delivered',
    leadId: '101'
  },
  {
    id: '2',
    conversationId: '1',
    content: 'Thanks for reaching out. Can you tell me more about your company?',
    direction: 'inbound',
    timestamp: '2024-01-15T10:30:00Z',
    status: 'read',
    leadId: '101'
  },
  {
    id: '3',
    conversationId: '1',
    content: "Absolutely! We're a local land buying company that's been in business for 10+ years. We buy properties with cash and can close quickly.",
    direction: 'outbound',
    timestamp: '2024-01-15T10:45:00Z',
    status: 'delivered',
    leadId: '101'
  },
  {
    id: '4',
    conversationId: '1',
    content: "That sounds good. What's the next step?",
    direction: 'inbound',
    timestamp: '2024-01-15T11:15:00Z',
    status: 'read',
    leadId: '101'
  },
  {
    id: '5',
    conversationId: '1',
    content: 'I can schedule a quick call to learn more about your timeline and any specific requirements. Does this afternoon work?',
    direction: 'outbound',
    timestamp: '2024-01-15T11:30:00Z',
    status: 'sent',
    leadId: '101'
  },
  {
    id: '6',
    conversationId: '2',
    content: 'Hi Sarah, following up regarding your property in Dallas. Are you still considering offers?',
    direction: 'outbound',
    timestamp: '2024-01-15T09:00:00Z',
    status: 'delivered',
    leadId: '102'
  },
  {
    id: '7',
    conversationId: '2',
    content: 'Not interested, please remove me from your list.',
    direction: 'inbound',
    timestamp: '2024-01-15T12:15:00Z',
    status: 'read',
    leadId: '102'
  },
  {
    id: '8',
    conversationId: '3',
    content: 'Mike, just checking in about the commercial lot in Houston. We have a buyer ready to move quickly.',
    direction: 'outbound',
    timestamp: '2024-01-15T08:30:00Z',
    status: 'delivered',
    leadId: '103'
  },
  {
    id: '9',
    conversationId: '3',
    content: 'Can you tell me more about the process?',
    direction: 'inbound',
    timestamp: '2024-01-15T09:45:00Z',
    status: 'read',
    leadId: '103'
  },
  {
    id: '10',
    conversationId: '1',
    content: "Yes, I'm interested in hearing more about your offer.",
    direction: 'inbound',
    timestamp: '2024-01-15T14:30:00Z',
    status: 'read',
    leadId: '101'
  }
]
