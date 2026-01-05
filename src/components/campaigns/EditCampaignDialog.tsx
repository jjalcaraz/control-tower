import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, Target, Save, X } from 'lucide-react'

interface Campaign {
  id: number
  name: string
  description: string
  type: string
  status: string
  targetAudience?: {
    leadCount: number
    tags?: string[]
  }
  schedule?: {
    startDate: string
    timezone?: string
    rateLimiting?: number
  }
  messages?: Array<{
    content: string
  }>
  createdAt: string
}

interface EditCampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaign: Campaign | null
  onUpdateCampaign: (updatedCampaign: Campaign) => void
}

const CAMPAIGN_TYPES = [
  { value: 'broadcast', label: 'Broadcast', description: 'Send immediately to all leads' },
  { value: 'drip', label: 'Drip Campaign', description: 'Send sequence over time' },
  { value: 'trigger', label: 'Trigger-Based', description: 'Send based on lead behavior' }
]

const CAMPAIGN_STATUSES = [
  { value: 'draft', label: 'Draft', description: 'Campaign not yet launched' },
  { value: 'active', label: 'Active', description: 'Campaign is running' },
  { value: 'paused', label: 'Paused', description: 'Campaign temporarily stopped' },
  { value: 'completed', label: 'Completed', description: 'Campaign finished' },
  { value: 'archived', label: 'Archived', description: 'Campaign archived' }
]

export function EditCampaignDialog({ 
  open, 
  onOpenChange, 
  campaign, 
  onUpdateCampaign 
}: EditCampaignDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'broadcast',
    status: 'draft',
    messageContent: '',
    rateLimiting: 3,
    timezone: 'America/Chicago'
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form data when campaign changes
  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        description: campaign.description || '',
        type: campaign.type || 'broadcast',
        status: campaign.status || 'draft',
        messageContent: campaign.messages?.[0]?.content || '',
        rateLimiting: campaign.schedule?.rateLimiting || 3,
        timezone: campaign.schedule?.timezone || 'America/Chicago'
      })
      setErrors({})
    }
  }, [campaign])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required'
    }
    
    if (formData.name.trim().length > 100) {
      newErrors.name = 'Campaign name must be less than 100 characters'
    }
    
    if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }
    
    if (!formData.messageContent.trim()) {
      newErrors.messageContent = 'Message content is required'
    }
    
    if (formData.rateLimiting < 1 || formData.rateLimiting > 10) {
      newErrors.rateLimiting = 'Rate limiting must be between 1-10 messages per minute'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!campaign || !validateForm()) return

    const updatedCampaign: Campaign = {
      ...campaign,
      name: formData.name.trim(),
      description: formData.description.trim(),
      type: formData.type,
      status: formData.status,
      messages: [{
        content: formData.messageContent.trim()
      }],
      schedule: {
        ...campaign.schedule,
        rateLimiting: formData.rateLimiting,
        timezone: formData.timezone,
        startDate: campaign.schedule?.startDate || new Date().toISOString()
      }
    }

    onUpdateCampaign(updatedCampaign)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setErrors({})
    onOpenChange(false)
  }

  if (!campaign) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Edit Campaign</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter campaign name"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the purpose of this campaign..."
                  rows={3}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Campaign Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex flex-col">
                            <span>{type.label}</span>
                            <span className="text-xs text-gray-500">{type.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Campaign Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex flex-col">
                            <span>{status.label}</span>
                            <span className="text-xs text-gray-500">{status.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Message Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Message Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="messageContent">SMS Message *</Label>
                <Textarea
                  id="messageContent"
                  value={formData.messageContent}
                  onChange={(e) => setFormData(prev => ({ ...prev, messageContent: e.target.value }))}
                  placeholder="Enter your SMS message content..."
                  rows={4}
                  className={errors.messageContent ? 'border-red-500' : ''}
                />
                {errors.messageContent && (
                  <p className="text-sm text-red-600 mt-1">{errors.messageContent}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Use variables like {'{{firstName}}'}, {'{{lastName}}'}, {'{{city}}'} to personalize messages
                </p>
                <p className="text-xs text-gray-500">
                  Character count: {formData.messageContent.length}/160 
                  {formData.messageContent.length > 160 && (
                    <span className="text-orange-600"> (Multiple SMS messages will be sent)</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Campaign Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rateLimiting">Messages per minute</Label>
                  <Input
                    id="rateLimiting"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.rateLimiting}
                    onChange={(e) => setFormData(prev => ({ ...prev, rateLimiting: parseInt(e.target.value) || 3 }))}
                    className={errors.rateLimiting ? 'border-red-500' : ''}
                  />
                  {errors.rateLimiting && (
                    <p className="text-sm text-red-600 mt-1">{errors.rateLimiting}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Lower rates help avoid carrier filtering
                  </p>
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={formData.timezone} onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Campaign Info */}
              <div className="pt-4 border-t">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Target Audience:</span>
                    <p>{campaign.targetAudience?.leadCount || 0} leads</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Created:</span>
                    <p>{new Date(campaign.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Campaign ID:</span>
                    <p>#{campaign.id}</p>
                  </div>
                </div>
                {campaign.targetAudience?.tags && campaign.targetAudience.tags.length > 0 && (
                  <div className="mt-3">
                    <span className="font-medium text-gray-600 text-sm">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {campaign.targetAudience.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}