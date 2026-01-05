import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  Send, 
  Phone, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle,
  MoreVertical,
  Archive,
  Star,
  FileText,
  AlertTriangle,
  Zap,
  Trash2
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { useSendMessage, useQuickResponses } from '@/hooks/use-api'
import { useConversationWebSocket } from '@/hooks/use-websocket'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  conversationId: string
  content: string
  direction: 'inbound' | 'outbound'
  timestamp: string
  status: 'sent' | 'delivered' | 'failed' | 'read'
  fromNumber?: string
  toNumber?: string
}

interface Lead {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string
  address?: {
    city: string
    state: string
    county?: string
  }
  tags: string[]
  score: 'cold' | 'warm' | 'hot'
  status: string
  notes?: string
}

interface ConversationViewProps {
  conversationId: string
  lead: Lead
  messages: Message[]
  onSendMessage: (content: string) => void
  onUpdateLead?: (leadId: string, updates: Partial<Lead>) => void
  onArchiveConversation?: (conversationId: string) => void
  onDeleteConversation?: (conversationId: string) => void
  onOptOut?: (phoneNumber: string) => void
}

interface QuickResponse {
  id: string
  category: string
  title: string
  content: string
  shortcut: string
}

const defaultQuickResponses: QuickResponse[] = [
  {
    id: '1',
    category: 'greeting',
    title: 'Thanks for your interest',
    content: 'Hi {{firstName}}! Thanks for your interest in our land buying program. When would be a good time to discuss your property?',
    shortcut: 'thanks'
  },
  {
    id: '2',
    category: 'followup',
    title: 'Following up',
    content: 'Hi {{firstName}}, I wanted to follow up on our previous conversation about your property in {{city}}. Are you still interested in selling?',
    shortcut: 'followup'
  },
  {
    id: '3',
    category: 'info',
    title: 'More information',
    content: 'I\'d be happy to provide more information about our cash offer process. Can I call you at {{phone}} to discuss the details?',
    shortcut: 'info'
  },
  {
    id: '4',
    category: 'stop',
    title: 'Stop messages',
    content: 'I understand you\'re not interested. I\'ve removed your number from our list. Reply STOP at any time to stop all messages.',
    shortcut: 'stop'
  }
]

export function ConversationView({
  conversationId,
  lead,
  messages,
  onSendMessage,
  onUpdateLead,
  onArchiveConversation,
  onDeleteConversation,
  onOptOut
}: ConversationViewProps) {
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showQuickResponses, setShowQuickResponses] = useState(false)
  const [notes, setNotes] = useState(lead.notes || '')
  const [notesEditing, setNotesEditing] = useState(false)

  // State to hold displayed messages (combines props + live messages)
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>(messages)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Real-time message updates
  const { data: liveMessage } = useConversationWebSocket(parseInt(conversationId))
  const sendMessageMutation = useSendMessage()
  const { data: quickResponsesData } = useQuickResponses()

  const quickResponses = quickResponsesData?.data || defaultQuickResponses

  // Update displayed messages when props change
  useEffect(() => {
    setDisplayedMessages(messages)
  }, [messages])

  // Append live WebSocket messages to displayed messages (deduplicate by message ID)
  useEffect(() => {
    if (liveMessage) {
      setDisplayedMessages(prev => {
        // Check if message already exists to prevent duplicates
        const existingMessage = prev.find(msg =>
          msg.id === liveMessage.message_id ||
          (msg.content === liveMessage.content && Math.abs(new Date(msg.timestamp).getTime() - new Date(liveMessage.timestamp).getTime()) < 1000)
        )

        if (existingMessage) {
          return prev // Don't add duplicate message
        }

        // Convert live message to proper format
        const newMessage: Message = {
          id: liveMessage.message_id || `live_${Date.now()}`,
          conversationId: conversationId,
          content: liveMessage.content,
          direction: liveMessage.direction as 'inbound' | 'outbound',
          timestamp: liveMessage.timestamp || new Date().toISOString(),
          status: liveMessage.status || 'sent',
          fromNumber: liveMessage.from_number,
          toNumber: liveMessage.to_number
        }

        return [...prev, newMessage]
      })
    }
  }, [liveMessage, conversationId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayedMessages])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey && newMessage.trim()) {
        handleSendMessage()
      }
      
      if (e.key === '/' && e.ctrlKey) {
        e.preventDefault()
        setShowQuickResponses(!showQuickResponses)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [newMessage, showQuickResponses])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendMessageMutation.isPending) return

    try {
      await sendMessageMutation.mutateAsync({
        conversationId: parseInt(conversationId),
        content: newMessage.trim()
      })
      
      onSendMessage(newMessage.trim())
      setNewMessage('')
      textareaRef.current?.focus()
    } catch (error) {
      console.error('Failed to send message:', error)
      // Show error to user (in a real app, you'd want a proper toast/notification system)
      alert('Failed to send message. Please try again.')
    }
  }

  const insertQuickResponse = (response: QuickResponse) => {
    let content = response.content
    
    // Replace template variables
    content = content.replace('{{firstName}}', lead.firstName)
    content = content.replace('{{lastName}}', lead.lastName)
    content = content.replace('{{phone}}', lead.primaryPhone || lead.phone)
    content = content.replace('{{city}}', lead.address?.city || '')
    content = content.replace('{{state}}', lead.address?.state || '')
    
    setNewMessage(content)
    setShowQuickResponses(false)
    textareaRef.current?.focus()
  }

  const handleOptOut = () => {
    if (window.confirm('Are you sure you want to opt out this contact? This action cannot be undone.')) {
      onOptOut?.(lead.primaryPhone || lead.phone)
    }
  }

  const handleArchive = () => {
    if (window.confirm('Archive this conversation?')) {
      onArchiveConversation?.(conversationId)
    }
  }

  const handleDelete = () => {
    if (window.confirm('Delete this conversation? This action cannot be undone.')) {
      onDeleteConversation?.(conversationId)
    }
  }

  const handleUpdateNotes = () => {
    if (onUpdateLead) {
      onUpdateLead(lead.id, { notes })
    }
    setNotesEditing(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Clock className="h-3 w-3 text-gray-400" />
      case 'delivered':
        return <CheckCircle className="h-3 w-3 text-blue-500" />
      case 'read':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'failed':
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'hot':
        return 'bg-red-100 text-red-800'
      case 'warm':
        return 'bg-orange-100 text-orange-800'
      case 'cold':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {lead.firstName[0]}{lead.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold flex items-center space-x-2">
              <span>{lead.firstName} {lead.lastName}</span>
              <Badge className={getScoreColor(lead.score)}>
                {lead.score}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground flex items-center space-x-2">
              <Phone className="h-3 w-3" />
              <span>{lead.primaryPhone || lead.phone}</span>
              {lead.address && (
                <>
                  <span>•</span>
                  <span>{lead.address.city}, {lead.address.state}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.open(`tel:${lead.primaryPhone || lead.phone}`)}>
              <Phone className="h-4 w-4 mr-2" />
              Call Lead
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="h-4 w-4 mr-2" />
              Archive Conversation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Conversation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleOptOut} className="text-red-600 focus:text-red-600">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Opt Out Contact
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 flex">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {displayedMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-xs lg:max-w-md px-3 py-2 rounded-lg',
                      message.direction === 'outbound'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                      <span>
                        {format(new Date(message.timestamp), 'MMM d, HH:mm')}
                      </span>
                      {message.direction === 'outbound' && (
                        <div className="ml-2">
                          {getStatusIcon(message.status)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Live typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted px-3 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick Responses */}
          {showQuickResponses && (
            <div className="border-t bg-muted/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Quick Responses</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickResponses(false)}
                >
                  ✕
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {quickResponses.map((response) => (
                  <Button
                    key={response.id}
                    variant="outline"
                    size="sm"
                    className="justify-start text-left h-auto p-3"
                    onClick={() => insertQuickResponse(response)}
                  >
                    <div>
                      <div className="font-medium text-sm">{response.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {response.content}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Shortcut: /{response.shortcut}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  placeholder="Type your message... (Ctrl+Enter to send, Ctrl+/ for quick responses)"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="resize-none min-h-[60px]"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQuickResponses(!showQuickResponses)}
                    >
                      <Zap className="h-4 w-4 mr-1" />
                      Quick Responses
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {newMessage.length}/1600
                    </span>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                size="lg"
              >
                {sendMessageMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Lead Information Sidebar */}
        <div className="w-80 border-l bg-muted/30 p-4">
          <div className="space-y-6">
            {/* Lead Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Lead Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.email && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="text-sm">{lead.email}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge variant="outline" className="text-xs">
                    {lead.status}
                  </Badge>
                </div>
                {lead.tags.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Tags</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {lead.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Notes</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNotesEditing(!notesEditing)}
                  >
                    <FileText className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {notesEditing ? (
                  <div className="space-y-3">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this lead..."
                      rows={4}
                    />
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={handleUpdateNotes}>
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNotes(lead.notes || '')
                          setNotesEditing(false)
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {notes || 'No notes added yet. Click the edit button to add notes.'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("text-sm font-medium", className)}>{children}</div>
}
