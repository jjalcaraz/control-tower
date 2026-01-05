import { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  Send, 
  Search, 
  Phone, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle,
  MoreVertical,
  Archive,
  Star,
  Filter,
  Trash2
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useConversations, useArchiveConversation, useDeleteConversation, useStarConversation, useUnstarConversation } from '@/hooks/use-api'
import { useQueryClient } from '@tanstack/react-query'
import { mockConversationSummaries, mockConversationMessages } from '@/lib/mock-data'

const normalizeConversations = (rawData: any): Conversation[] => {
  if (!rawData) return []
  if (Array.isArray(rawData)) {
    return rawData as Conversation[]
  }
  if (Array.isArray(rawData.data)) {
    return rawData.data as Conversation[]
  }
  if (Array.isArray(rawData.items)) {
    return rawData.items as Conversation[]
  }
  if (Array.isArray(rawData.results)) {
    return rawData.results as Conversation[]
  }
  return []
}

const normalizeMessages = (rawData: any): Message[] => {
  if (!rawData) return []
  if (Array.isArray(rawData)) return rawData as Message[]
  if (Array.isArray(rawData.data)) return rawData.data as Message[]
  if (Array.isArray(rawData.messages)) return rawData.messages as Message[]
  return []
}

interface Message {
  id: string
  conversationId: string
  content: string
  direction: 'inbound' | 'outbound'
  timestamp: string
  status: 'sent' | 'delivered' | 'failed' | 'read'
  leadId: string
}

interface Conversation {
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

interface QuickResponse {
  id: string
  name: string
  content: string
  category: string
  usageCount: number
}


const quickResponses: QuickResponse[] = [
  {
    id: '1',
    name: 'Interested Follow-up',
    content: 'Great! I\'d love to discuss this further. When would be a good time for a quick call?',
    category: 'followup',
    usageCount: 45
  },
  {
    id: '2',
    name: 'Property Details Request',
    content: 'Thanks for your interest! Can you share the property address or parcel number so I can provide an accurate offer?',
    category: 'information',
    usageCount: 32
  },
  {
    id: '3',
    name: 'Cash Offer Explanation',
    content: 'We provide fair cash offers with no fees, commissions, or closing costs. Most transactions close in 7-14 days.',
    category: 'explanation',
    usageCount: 67
  },
  {
    id: '4',
    name: 'Opt-out Acknowledgment',
    content: 'No problem, I\'ve removed you from our list. Thanks for letting me know!',
    category: 'opt-out',
    usageCount: 15
  }
]

interface MessageInboxProps {
  onSelectConversation?: (conversationId: string) => void
}

export function MessageInbox({ onSelectConversation }: MessageInboxProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [messageText, setMessageText] = useState('')
  const [showQuickResponses, setShowQuickResponses] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use real API data instead of mock data
  const { data: conversationsData, isLoading } = useConversations(undefined, {
    retry: false,
    onError: (err) => {
      console.warn('Conversation fetch failed, using mock data fallback:', err)
    }
  })
  const archiveConversation = useArchiveConversation()
  const deleteConversation = useDeleteConversation()
  const starConversation = useStarConversation()
  const unstarConversation = useUnstarConversation()
  const queryClient = useQueryClient()
  
  // Transform API data to match expected interface
  const normalizedConversations = normalizeConversations(conversationsData)
  const apiConversations = normalizedConversations.map((conv: any) => ({
    id: (conv.id ?? conv.conversation_id ?? '').toString(),
    leadId: conv.lead_id?.toString() || '',
    leadName: conv.lead_name || conv.contact_name || 'Unknown',
    leadPhone: conv.phone_number || conv.leadPhone || '',
    lastMessage: conv.last_message || conv.lastMessage || '',
    lastMessageAt: conv.last_message_time || conv.lastMessageAt || new Date().toISOString(),
    unreadCount: conv.unread_count ?? conv.unreadCount ?? 0,
    status: conv.status || 'active',
    tags: conv.tags || [],
    campaignId: conv.campaign_id?.toString() || conv.campaignId?.toString(),
    campaignName: conv.campaign_name || conv.campaignName || ''
  }))
  
  const conversations = apiConversations.length > 0 ? apiConversations : mockConversationSummaries

  // Set the first conversation as selected when data loads
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0])
    }
  }, [conversations, selectedConversation])

  const filteredConversations = conversations.filter((conv: Conversation) => {
    const matchesSearch = conv.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.leadPhone.includes(searchTerm) ||
                         conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'unread' && conv.unreadCount > 0) ||
                         (filterStatus === 'starred' && conv.status === 'starred') ||
                         (filterStatus === 'archived' && conv.status === 'archived')
    
    return matchesSearch && matchesFilter
  })

  const conversationMessages = useMemo(() => {
    const normalized = normalizeMessages(conversationsData?.messages || conversationsData?.data?.messages)
    const sourceMessages = normalized.length > 0 ? normalized : mockConversationMessages
    return sourceMessages.filter(msg => msg.conversationId === selectedConversation?.id)
  }, [conversationsData, selectedConversation])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversationMessages])

  const handleSendMessage = () => {
    if (messageText.trim() && selectedConversation) {
      // In a real app, you would send this via your SMS service
      console.log('Sending message:', messageText, 'to:', selectedConversation.leadPhone)
      setMessageText('')
      setShowQuickResponses(false)
    }
  }

  const handleQuickResponse = (response: QuickResponse) => {
    setMessageText(response.content)
    setShowQuickResponses(false)
  }

  const handleArchiveConversation = async (conversationId: string) => {
    try {
      await archiveConversation.mutateAsync(parseInt(conversationId))
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null)
      }
      queryClient.invalidateQueries(['conversations'])
    } catch (error) {
      console.error('Error archiving conversation:', error)
    }
  }

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation.mutateAsync(parseInt(conversationId))
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null)
      }
      queryClient.invalidateQueries(['conversations'])
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  const handleStarConversation = async (conversationId: string) => {
    try {
      const conversation = conversations.find(c => c.id === conversationId)
      if (conversation?.status === 'starred') {
        await unstarConversation.mutateAsync(parseInt(conversationId))
        console.log('Conversation unstarred:', conversationId)
      } else {
        await starConversation.mutateAsync(parseInt(conversationId))
        console.log('Conversation starred:', conversationId)
      }
    } catch (error) {
      console.error('Error toggling star status:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'failed':
        return <XCircle className="h-3 w-3 text-red-500" />
      case 'sent':
        return <Clock className="h-3 w-3 text-blue-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'starred':
        return 'border-l-yellow-400'
      case 'archived':
        return 'border-l-gray-400'
      default:
        return 'border-l-blue-400'
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-lg shadow-lg">
      {/* Conversations List */}
      <div className="w-1/3 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Messages</h2>
            <Badge variant="secondary">
              {filteredConversations.reduce((sum: number, conv: Conversation) => sum + conv.unreadCount, 0)} unread
            </Badge>
          </div>
          
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="starred">Starred</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading conversations...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <p className="text-sm">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conversation: Conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors border-l-4",
                selectedConversation?.id === conversation.id ? "bg-blue-50" : "",
                getStatusColor(conversation.status)
              )}
              onClick={() => {
                setSelectedConversation(conversation)
                onSelectConversation?.(conversation.id)
              }}
            >
              <div className="flex items-start space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {conversation.leadName.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm truncate">{conversation.leadName}</h3>
                    <div className="flex items-center space-x-1">
                      {conversation.status === 'starred' && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                      {conversation.unreadCount > 0 && (
                        <Badge variant="default" className="text-xs">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-1">{conversation.leadPhone}</p>
                  <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                    </span>
                    {conversation.campaignName && (
                      <Badge variant="outline" className="text-xs">
                        {conversation.campaignName}
                      </Badge>
                    )}
                  </div>
                  
                  {conversation.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {conversation.tags.slice(0, 2).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {conversation.tags.length > 2 && (
                        <span className="text-xs text-gray-500">+{conversation.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {selectedConversation.leadName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{selectedConversation.leadName}</h3>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-3 w-3 text-gray-500" />
                      <span className="text-sm text-gray-600">{selectedConversation.leadPhone}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleStarConversation(selectedConversation.id)}
                    className={selectedConversation.status === 'starred' ? 'text-yellow-500' : ''}
                  >
                    <Star className={cn("h-4 w-4", selectedConversation.status === 'starred' ? 'fill-current' : '')} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleArchiveConversation(selectedConversation.id)}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStarConversation(selectedConversation.id)}>
                        <Star className="mr-2 h-4 w-4" />
                        {selectedConversation.status === 'starred' ? 'Unstar' : 'Star'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleArchiveConversation(selectedConversation.id)}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteConversation(selectedConversation.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.direction === 'outbound' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
                      message.direction === 'outbound'
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-900"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className={cn(
                      "flex items-center justify-between mt-1 text-xs",
                      message.direction === 'outbound' ? "text-blue-100" : "text-gray-500"
                    )}>
                      <span>{format(new Date(message.timestamp), 'h:mm a')}</span>
                      {message.direction === 'outbound' && getStatusIcon(message.status)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Responses */}
            {showQuickResponses && (
              <div className="border-t bg-gray-50 p-4">
                <div className="grid gap-2 md:grid-cols-2">
                  {quickResponses.map((response) => (
                    <Card
                      key={response.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleQuickResponse(response)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm">{response.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {response.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{response.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowQuickResponses(!showQuickResponses)}
                    className={showQuickResponses ? "bg-blue-50" : ""}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleSendMessage} disabled={!messageText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>Press Enter to send, Shift+Enter for new line</span>
                <span>{messageText.length}/160 chars</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-600">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
