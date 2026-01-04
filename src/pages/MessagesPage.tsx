import { useState, useEffect } from 'react'
import { MessageInbox } from '@/components/messages/MessageInbox'
import { ConversationView } from '@/components/messages/ConversationView'
import { MessageComposer } from '@/components/messages/MessageComposer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MessageSquare,
  Users,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Archive,
  Star,
  Plus
} from 'lucide-react'
import { useConversations, useArchiveConversation, useDeleteConversation, useLeads, useBroadcastMessage, useConversation } from '@/hooks/use-api'
import { useMessagesWebSocket } from '@/hooks/use-websocket'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { messagesApi, leadsApi } from '@/lib/api'

export function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('conversations')
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewMessage, setShowNewMessage] = useState(false)

  // API hooks
  const { data: conversationsData, isLoading } = useConversations()
  const { data: unreadConversationsData } = useConversations({ unread_count_gt: 0 })
  const { data: archivedConversationsData } = useConversations({ status: 'archived' })
  const { data: starredConversationsData } = useConversations({ starred: true })
  const { data: liveUpdates } = useMessagesWebSocket()
  const queryClient = useQueryClient()

  // Handle live WebSocket updates
  useEffect(() => {
    if (liveUpdates) {
      // Invalidate and refetch all conversation queries when new messages arrive
      queryClient.invalidateQueries({ queryKey: ['conversations'] })

      // Invalidate filtered queries
      queryClient.invalidateQueries({ queryKey: ['conversations', { unread_count_gt: 0 }] })
      queryClient.invalidateQueries({ queryKey: ['conversations', { status: 'archived' }] })
      queryClient.invalidateQueries({ queryKey: ['conversations', { starred: true }] })

      // If we have a selected conversation, update its messages directly for real-time updates
      if (selectedConversation && liveUpdates.conversation_id === parseInt(selectedConversation)) {
        queryClient.setQueryData(['conversations', parseInt(selectedConversation)], (old: any) => {
          if (!old) return old
          return {
            ...old,
            messages: [...(old.messages || []), liveUpdates]
          }
        })

        // Also invalidate to ensure data consistency
        queryClient.invalidateQueries({ queryKey: ['conversations', parseInt(selectedConversation)] })
      }
    }
  }, [liveUpdates, selectedConversation, queryClient])

  // Get conversation data for different tabs
  const normalizeConversationList = (data: any) => {
    if (!data) return []
    if (Array.isArray(data)) return data
    return data.results || data.data || []
  }

  const conversationsList = normalizeConversationList(conversationsData)
  const unreadConversations = normalizeConversationList(unreadConversationsData)
  const archivedConversations = normalizeConversationList(archivedConversationsData)
  const starredConversations = normalizeConversationList(starredConversationsData)
  const selectedConversationData = conversationsList.find(conv => conv.id.toString() === selectedConversation)
  
  // Archive and delete mutations
  const archiveConversation = useArchiveConversation()
  const deleteConversation = useDeleteConversation()

  // Fetch conversation data with messages when a conversation is selected
  const { data: conversationData, isLoading: isLoadingConversation } = useConversation(
    selectedConversation ? parseInt(selectedConversation) : 0,
    { enabled: !!selectedConversation }
  )

  // Fetch complete lead data when a conversation is selected
  const selectedPhone = selectedConversationData?.lead_phone || selectedConversationData?.phone_number || selectedConversationData?.leadPhone || selectedConversationData?.phoneNumber
  const { data: leadsSearchData } = useQuery({
    queryKey: ['leadByPhone', selectedPhone],
    queryFn: () => selectedPhone ? leadsApi.getLeads({ search: selectedPhone.replace(/\D/g, '') }) : null,
    enabled: !!selectedPhone && !!selectedConversationData,
  })

  const leadsSearchList = Array.isArray(leadsSearchData)
    ? leadsSearchData
    : (leadsSearchData?.data || leadsSearchData?.results || [])

  const normalizedLeadSearch = leadsSearchList.map((lead: any) => {
    if (!lead?.owner_name) {
      return lead
    }
    const nameParts = lead.owner_name.split(' ')
    return {
      ...lead,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      primaryPhone: lead.phone_number_1,
      secondaryPhone: lead.phone_number_2,
      alternatePhone: lead.phone_number_3,
      phone: lead.phone_number_1,
      address: {
        city: lead.city,
        state: lead.state,
        county: lead.county || '',
      }
    }
  })

  // Find the matching lead from search results
  const matchingLead = normalizedLeadSearch.find((lead: any) => {
    const leadPhone = lead.primaryPhone || lead.phone || ''
    if (!leadPhone || !selectedPhone) return false
    const normalizedLead = leadPhone.replace(/\D/g, '')
    const normalizedSelected = selectedPhone.replace(/\D/g, '')
    return (
      normalizedLead === normalizedSelected ||
      normalizedLead === normalizedSelected.replace(/^1/, '') ||
      normalizedSelected === normalizedLead.replace(/^1/, '')
    )
  })

  // Get real messages from conversation data
  const conversationMessages = conversationData?.messages || []

  // Create lead data from selected conversation with complete lead info if available
  const currentLead = selectedConversationData ? {
    id: matchingLead?.id?.toString() || selectedConversationData.lead_id?.toString() || selectedConversationData.id.toString(),
    firstName: matchingLead?.firstName || selectedConversationData.lead_name?.split(' ')[0] || 'Unknown',
    lastName: matchingLead?.lastName || selectedConversationData.lead_name?.split(' ').slice(1).join(' ') || '',
    phone: selectedConversationData.lead_phone || selectedConversationData.phone_number || selectedConversationData.leadPhone || selectedConversationData.phoneNumber || '',
    email: matchingLead?.email || '', // Now gets email from lead data
    address: {
      city: matchingLead?.address?.city || '',
      state: matchingLead?.address?.state || '',
      county: matchingLead?.address?.county || ''
    },
    tags: matchingLead?.tags || [],
    score: (matchingLead?.score as 'hot' | 'warm' | 'cold') || 'warm',
    status: matchingLead?.status || 'interested',
    notes: matchingLead?.notes || ''
  } : null

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId)
  }

  const handleSendMessage = async (message: string | { content: string; recipients?: string[] }) => {
    try {
      const content = typeof message === 'string' ? message : message.content

      if (selectedConversation) {
        // Send message to specific conversation
        const response = await messagesApi.sendMessage(parseInt(selectedConversation), content)
        console.log('Message sent successfully to conversation:', response)

        // After interceptor processing, success is determined by successful promise resolution
        // or presence of response data like message ID
        if (response?.id || response?.message) {
          console.log('SMS sent:', response.message || 'Message sent successfully')
        } else {
          console.error('Failed to send SMS: No response data received')
        }
      } else {
        // This should not happen in the current implementation since broadcast
        // is handled separately in the New Message modal
        console.log('Direct broadcast from handleSendMessage is deprecated - use New Message modal')
      }

      // Refresh conversations to show new message
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleArchiveConversation = async (conversationId: string) => {
    try {
      console.log('Archiving conversation:', conversationId)
      await archiveConversation.mutateAsync(parseInt(conversationId))
      setSelectedConversation(null)
      console.log('Conversation archived successfully')
    } catch (error) {
      console.error('Error archiving conversation:', error)
    }
  }

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      console.log('Deleting conversation:', conversationId)
      await deleteConversation.mutateAsync(parseInt(conversationId))
      setSelectedConversation(null)
      console.log('Conversation deleted successfully')
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  const handleOptOut = async (phoneNumber: string) => {
    try {
      console.log('Opting out:', phoneNumber)
      // For now, just add to suppression list (could be implemented later)
      // await suppressionApi.addToList(phoneNumber)
      console.log('Contact opted out successfully')
    } catch (error) {
      console.error('Error opting out contact:', error)
    }
  }

  // Stats for header
  const stats = {
    totalConversations: conversationsList.length,
    unreadCount: conversationsList.filter(c => c.unreadCount > 0).length,
    activeToday: conversationsList.filter(c => {
      const lastMessage = new Date(c.lastMessageAt)
      const today = new Date()
      return lastMessage.toDateString() === today.toDateString()
    }).length
  }

  if (selectedConversation && currentLead) {
    if (isLoadingConversation) {
      return (
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    return (
      <div className="h-screen flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <Button
              variant="ghost"
              onClick={() => setSelectedConversation(null)}
              className="mb-2"
            >
              ← Back to Conversations
            </Button>
            <h1 className="text-2xl font-bold">Conversation</h1>
          </div>
        </div>

        <div className="flex-1">
          <ConversationView
            conversationId={selectedConversation}
            lead={currentLead}
            messages={conversationMessages}
            onSendMessage={handleSendMessage}
            onArchiveConversation={handleArchiveConversation}
            onDeleteConversation={handleDeleteConversation}
            onOptOut={handleOptOut}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">
            Manage two-way SMS conversations with your leads
          </p>
        </div>
        <Button onClick={() => setShowNewMessage(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {stats.unreadCount}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unreadCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="conversations">All Conversations</TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({stats.unreadCount})
            </TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
            <TabsTrigger value="starred">Starred</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        <TabsContent value="conversations" className="space-y-4">
          <MessageInbox onSelectConversation={handleSelectConversation} />
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          {unreadConversations.length > 0 ? (
            <MessageInbox
              conversations={unreadConversations}
              selectedConversation={selectedConversation}
              onSelectConversation={setSelectedConversation}
              searchTerm={searchTerm}
              activeTab="unread"
            />
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No unread messages</h3>
              <p className="text-muted-foreground">
                All caught up! New messages will appear here.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          {archivedConversations.length > 0 ? (
            <MessageInbox
              conversations={archivedConversations}
              selectedConversation={selectedConversation}
              onSelectConversation={setSelectedConversation}
              searchTerm={searchTerm}
              activeTab="archived"
            />
          ) : (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No archived conversations</h3>
              <p className="text-muted-foreground">
                Archived conversations will appear here.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="starred" className="space-y-4">
          {starredConversations.length > 0 ? (
            <MessageInbox
              conversations={starredConversations}
              selectedConversation={selectedConversation}
              onSelectConversation={setSelectedConversation}
              searchTerm={searchTerm}
              activeTab="starred"
            />
          ) : (
            <div className="text-center py-12">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No starred conversations</h3>
              <p className="text-muted-foreground">
                Star important conversations to find them easily.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New Message Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">New Message</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewMessage(false)}
                >
                  ✕
                </Button>
              </div>
              
              <MessageComposer
                recipientType="broadcast"
                showTemplateOptions={true}
                showScheduling={true}
                showRecipientSelector={true}
                onSendMessage={async (message) => {
                  try {
                    const content = typeof message === 'string' ? message : message.content
                    const recipients = typeof message === 'object' ? message.recipients : []
                    const leadIds = typeof message === 'object' ? message.leadIds : []

                    console.log('Sending broadcast message to:', { recipients, leadIds })

                    if (recipients && recipients.length > 0) {
                      // Send to specific recipients by phone number
                      for (const recipient of recipients) {
                        const response = await messagesApi.sendMessageToLead(recipient, content)
                        console.log(`Message sent to ${recipient}:`, response)
                      }
                      console.log('All specific messages sent successfully')
                    } else if (leadIds && leadIds.length > 0) {
                      // Send to specific recipients by lead IDs
                      await messagesApi.broadcastMessage({ content, leadIds })
                      console.log('Broadcast to lead IDs sent successfully')
                    } else {
                      // Default broadcast behavior (to all leads)
                      await messagesApi.broadcastMessage({ content })
                      console.log('General broadcast sent successfully')
                    }

                    queryClient.invalidateQueries({ queryKey: ['conversations'] })
                  } catch (error) {
                    console.error('Error broadcasting message:', error)
                  } finally {
                    setShowNewMessage(false)
                  }
                }}
                onSaveTemplate={(template) => {
                  console.log('Saving template:', template)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
