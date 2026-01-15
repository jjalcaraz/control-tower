import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  Send, 
  Zap,
  Type,
  Calendar,
  Users,
  MessageSquare,
  Plus,
  X,
  Phone,
  Search
} from 'lucide-react'
import { useSendMessage, useTemplates, useLeads } from '@/hooks/use-api'
import type { Lead } from '@/types/lead'

interface MessageComposerProps {
  conversationId?: string
  recipientIds?: string[]
  recipientType?: 'conversation' | 'broadcast' | 'campaign'
  onSendMessage?: (message: { content: string; recipients?: string[] }) => void
  onSaveTemplate?: (template: { name: string; content: string; category: string }) => void
  placeholder?: string
  showTemplateOptions?: boolean
  showScheduling?: boolean
  showRecipientSelector?: boolean
  maxLength?: number
}

interface Template {
  id: string
  name: string
  content: string
  category: string
  variables?: string[]
}

const quickInserts = [
  { label: 'First Name', value: '{{firstName}}' },
  { label: 'Last Name', value: '{{lastName}}' },
  { label: 'Phone', value: '{{phone}}' },
  { label: 'City', value: '{{city}}' },
  { label: 'State', value: '{{state}}' },
  { label: 'Property Type', value: '{{propertyType}}' },
  { label: 'Today\'s Date', value: '{{today}}' },
]

export function MessageComposer({
  conversationId,
  recipientIds = [],
  recipientType = 'conversation',
  onSendMessage,
  onSaveTemplate,
  placeholder = "Type your message...",
  showTemplateOptions = true,
  showScheduling = false,
  showRecipientSelector = false,
  maxLength = 1600
}: MessageComposerProps) {
  const [message, setMessage] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showVariables, setShowVariables] = useState(false)
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateCategory, setTemplateCategory] = useState('custom')
  const [scheduleTime, setScheduleTime] = useState('')
  const [isScheduled, setIsScheduled] = useState(false)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(recipientIds)
  const [showRecipientDialog, setShowRecipientDialog] = useState(false)
  const [recipientSearch, setRecipientSearch] = useState('')
  const [manualPhones, setManualPhones] = useState<string[]>([])
  const [newPhoneInput, setNewPhoneInput] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendMessageMutation = useSendMessage()
  const { data: templatesData } = useTemplates()
  const { data: leadsData } = useLeads({ limit: 100 }, { enabled: showRecipientSelector })

  const templates = (templatesData?.data || []) as Template[]
  const leads = (leadsData?.data || []) as Lead[]

  // Filter leads based on search
  const filteredLeads = leads.filter(lead => {
    if (!recipientSearch) return true
    const searchTerm = recipientSearch.toLowerCase()
    return (
      lead.firstName.toLowerCase().includes(searchTerm) ||
      lead.lastName.toLowerCase().includes(searchTerm) ||
      (lead.primaryPhone || '').includes(searchTerm)
    )
  })

  const addManualPhone = () => {
    if (newPhoneInput.trim() && !manualPhones.includes(newPhoneInput.trim())) {
      setManualPhones([...manualPhones, newPhoneInput.trim()])
      setNewPhoneInput('')
    }
  }

  const removeManualPhone = (phone: string) => {
    setManualPhones(manualPhones.filter(p => p !== phone))
  }

  const toggleRecipient = (phone: string) => {
    setSelectedRecipients(prev => 
      prev.includes(phone) 
        ? prev.filter(p => p !== phone)
        : [...prev, phone]
    )
  }

  const allRecipients = [...selectedRecipients, ...manualPhones]

  const handleSendMessage = async () => {
    if (!message.trim()) return

    try {
      if (conversationId) {
        // Send to specific conversation
        await sendMessageMutation.mutateAsync({
          conversationId: conversationId,
          content: message.trim()
        })
      } else if (onSendMessage) {
        // Broadcast or custom send handling
        await onSendMessage({
          content: message.trim(),
          recipients: showRecipientSelector ? allRecipients : recipientIds
        })
      }

      setMessage('')
      textareaRef.current?.focus()
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const insertTemplate = (template: Template) => {
    setMessage(template.content)
    setShowTemplates(false)
    textareaRef.current?.focus()
  }

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newMessage = message.slice(0, start) + variable + message.slice(end)
    
    setMessage(newMessage)
    setShowVariables(false)
    
    // Reset cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  const handleSaveAsTemplate = () => {
    if (!templateName.trim() || !message.trim()) return

    onSaveTemplate?.({
      name: templateName,
      content: message,
      category: templateCategory
    })

    setTemplateCategory('custom')
    setTemplateName('')
    setSaveAsTemplate(false)
  }

  const getRecipientText = () => {
    if (recipientType === 'conversation') {
      return 'Reply to conversation'
    }
    if (recipientType === 'broadcast') {
      const count = showRecipientSelector ? allRecipients.length : recipientIds.length
      return count > 0 ? `Broadcast to ${count} recipients` : 'Select recipients to broadcast'
    }
    if (recipientType === 'campaign') {
      return 'Campaign message'
    }
    return 'Send message'
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {getRecipientText()}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {(showRecipientSelector ? allRecipients.length : recipientIds.length) > 0 && (
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {showRecipientSelector ? allRecipients.length : recipientIds.length}
              </Badge>
            )}
            {recipientType === 'broadcast' && (
              <Badge variant="secondary" className="text-xs">
                Broadcast
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Recipient Selector */}
        {showRecipientSelector && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Recipients</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRecipientDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Select Recipients
              </Button>
            </div>
            
            {/* Selected Recipients Display */}
            {allRecipients.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {selectedRecipients.map((phone) => {
                    const lead = leads.find(l => l.primaryPhone === phone)
                    return (
                      <Badge key={phone} variant="outline" className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead ? `${lead.firstName} ${lead.lastName}` : phone}
                        <button
                          onClick={() => toggleRecipient(phone)}
                          className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                  {manualPhones.map((phone) => (
                    <Badge key={phone} variant="secondary" className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {phone}
                      <button
                        onClick={() => removeManualPhone(phone)}
                        className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                {allRecipients.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recipients selected</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recipient Selection Dialog */}
        {showRecipientDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[70vh] overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Select Recipients</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRecipientDialog(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search leads by name or phone..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Manual Phone Entry */}
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Enter phone number manually"
                    value={newPhoneInput}
                    onChange={(e) => setNewPhoneInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addManualPhone()}
                  />
                  <Button onClick={addManualPhone} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Leads List */}
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted ${
                        selectedRecipients.includes(lead.primaryPhone) ? 'bg-muted border-primary' : ''
                      }`}
                      onClick={() => toggleRecipient(lead.primaryPhone)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {lead.firstName} {lead.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {lead.primaryPhone}
                          </div>
                        </div>
                      </div>
                      {selectedRecipients.includes(lead.primaryPhone) && (
                        <Badge variant="default" className="text-xs">Selected</Badge>
                      )}
                    </div>
                  ))}
                  
                  {filteredLeads.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No leads found matching your search
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-4 border-t">
                <Button
                  onClick={() => setShowRecipientDialog(false)}
                  className="w-full"
                >
                  Done ({allRecipients.length} recipients selected)
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[120px] resize-none pr-16"
            maxLength={maxLength}
          />
          
          {/* Character Count */}
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {message.length}/{maxLength}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Template Dropdown */}
            {showTemplateOptions && (
              <DropdownMenu open={showTemplates} onOpenChange={setShowTemplates}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Templates
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80">
                  <div className="p-2 space-y-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="p-2 hover:bg-muted rounded-sm cursor-pointer"
                        onClick={() => insertTemplate(template)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{template.name}</div>
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {template.content}
                        </div>
                      </div>
                    ))}
                    
                    {templates.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        No templates available
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Variable Insertion */}
            <DropdownMenu open={showVariables} onOpenChange={setShowVariables}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Type className="h-4 w-4 mr-1" />
                  Variables
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {quickInserts.map((insert) => (
                  <DropdownMenuItem
                    key={insert.value}
                    onClick={() => insertVariable(insert.value)}
                  >
                    {insert.label}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {insert.value}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Save as Template */}
            {onSaveTemplate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveAsTemplate(true)}
                disabled={!message.trim()}
              >
                <Zap className="h-4 w-4 mr-1" />
                Save Template
              </Button>
            )}

            {/* Scheduling (if enabled) */}
            {showScheduling && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsScheduled(!isScheduled)}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Schedule
              </Button>
            )}
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={
              !message.trim() || 
              sendMessageMutation.isPending ||
              (showRecipientSelector && allRecipients.length === 0)
            }
            size="sm"
          >
            {sendMessageMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : isScheduled ? (
              <>
                <Calendar className="h-4 w-4 mr-1" />
                Schedule
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                Send
              </>
            )}
          </Button>
        </div>

        {/* Schedule Time Input */}
        {isScheduled && (
          <div className="border-t pt-4">
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <label className="text-sm font-medium">Send at:</label>
                <input
                  type="datetime-local"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsScheduled(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Save as Template Dialog */}
        {saveAsTemplate && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Save as Template</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSaveAsTemplate(false)}
              >
                ✕
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Template Name</label>
                <input
                  type="text"
                  placeholder="Enter template name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={templateCategory} onValueChange={setTemplateCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial">Initial Outreach</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                    <SelectItem value="closing">Closing</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleSaveAsTemplate}>
                Save Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveAsTemplate(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Message Preview for Variables */}
        {message.includes('{{') && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Preview (with sample data):</h4>
            <div className="p-3 bg-muted rounded-lg text-sm">
              {message
                .replace(/\{\{firstName\}\}/g, 'John')
                .replace(/\{\{lastName\}\}/g, 'Smith')
                .replace(/\{\{phone\}\}/g, '(555) 123-4567')
                .replace(/\{\{city\}\}/g, 'Austin')
                .replace(/\{\{state\}\}/g, 'TX')
                .replace(/\{\{propertyType\}\}/g, 'Vacant Land')
                .replace(/\{\{today\}\}/g, new Date().toLocaleDateString())
              }
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
