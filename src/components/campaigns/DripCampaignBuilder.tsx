import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Play,
  Pause,
  Trash2,
  Clock,
  MessageSquare,
  Filter,
  Target,
  ArrowDown,
  Save,
  Users
} from 'lucide-react'

interface DripStep {
  id: string
  type: 'message' | 'delay' | 'condition' | 'action'
  name: string
  config: any
  position: { x: number; y: number }
  connections: string[]
}

interface DripCampaign {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  triggers: string[]
  steps: DripStep[]
  analytics: {
    enrolled: number
    active: number
    completed: number
    optedOut: number
    conversionRate: number
  }
  createdAt: string
}

const STEP_TEMPLATES = [
  {
    type: 'message',
    name: 'Welcome Message',
    icon: MessageSquare,
    description: 'Send a welcome message to new leads',
    defaultConfig: {
      content: 'Welcome! Thanks for your interest in our land opportunities.',
      delay: 0
    }
  },
  {
    type: 'delay',
    name: 'Wait Period',
    icon: Clock,
    description: 'Add a delay before the next action',
    defaultConfig: {
      duration: 24,
      unit: 'hours'
    }
  },
  {
    type: 'condition',
    name: 'Decision Point',
    icon: Filter,
    description: 'Branch based on lead behavior or attributes',
    defaultConfig: {
      field: 'responded',
      operator: 'equals',
      value: true
    }
  },
  {
    type: 'action',
    name: 'Update Lead',
    icon: Target,
    description: 'Update lead properties or status',
    defaultConfig: {
      field: 'status',
      value: 'qualified'
    }
  }
]

export function DripCampaignBuilder() {
  const [_selectedCampaign, _setSelectedCampaign] = useState<string>('new')
  const [campaign, setCampaign] = useState<DripCampaign>({
    id: 'new',
    name: 'New Drip Campaign',
    description: '',
    status: 'draft',
    triggers: ['lead_created'],
    steps: [],
    analytics: {
      enrolled: 0,
      active: 0,
      completed: 0,
      optedOut: 0,
      conversionRate: 0
    },
    createdAt: new Date().toISOString()
  })
  const [selectedStep, setSelectedStep] = useState<DripStep | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const addStep = (template: typeof STEP_TEMPLATES[0]) => {
    const newStep: DripStep = {
      id: `step-${Date.now()}`,
      type: template.type as DripStep['type'],
      name: template.name,
      config: template.defaultConfig,
      position: { x: 300, y: campaign.steps.length * 150 + 100 },
      connections: []
    }

    setCampaign(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }))
  }

  const updateStep = (stepId: string, updates: Partial<DripStep>) => {
    setCampaign(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      )
    }))
  }

  const deleteStep = (stepId: string) => {
    setCampaign(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
    }))
    setSelectedStep(null)
  }

  const saveCampaign = async () => {
    try {
      const response = await fetch('/api/drip-campaigns', {
        method: campaign.id === 'new' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign)
      })

      if (response.ok) {
        const savedCampaign = await response.json()
        setCampaign(savedCampaign)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error saving campaign:', error)
    }
  }

  const toggleCampaignStatus = async () => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    updateCampaign({ status: newStatus })
  }

  const updateCampaign = (updates: Partial<DripCampaign>) => {
    setCampaign(prev => ({ ...prev, ...updates }))
    setIsEditing(true)
  }

  const getStepIcon = (type: string) => {
    const template = STEP_TEMPLATES.find(t => t.type === type)
    return template?.icon || MessageSquare
  }

  const renderStepEditor = () => {
    if (!selectedStep) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStepIcon(selectedStep.type)({ className: 'h-5 w-5' })}
            Edit {selectedStep.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Step Name</label>
            <input
              type="text"
              value={selectedStep.name}
              onChange={(e) => updateStep(selectedStep.id, { name: e.target.value })}
              className="w-full p-2 border rounded-md"
            />
          </div>

          {selectedStep.type === 'message' && (
            <div>
              <label className="block text-sm font-medium mb-2">Message Content</label>
              <textarea
                value={selectedStep.config.content || ''}
                onChange={(e) => updateStep(selectedStep.id, { 
                  config: { ...selectedStep.config, content: e.target.value }
                })}
                className="w-full p-2 border rounded-md h-24 resize-none"
                placeholder="Enter your message content..."
              />
            </div>
          )}

          {selectedStep.type === 'delay' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Duration</label>
                <input
                  type="number"
                  value={selectedStep.config.duration || 1}
                  onChange={(e) => updateStep(selectedStep.id, {
                    config: { ...selectedStep.config, duration: parseInt(e.target.value) }
                  })}
                  className="w-full p-2 border rounded-md"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Unit</label>
                <Select 
                  value={selectedStep.config.unit || 'hours'}
                  onValueChange={(value) => updateStep(selectedStep.id, {
                    config: { ...selectedStep.config, unit: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {selectedStep.type === 'condition' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Condition Field</label>
                <Select 
                  value={selectedStep.config.field || ''}
                  onValueChange={(value) => updateStep(selectedStep.id, {
                    config: { ...selectedStep.config, field: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="responded">Has Responded</SelectItem>
                    <SelectItem value="clicked_link">Clicked Link</SelectItem>
                    <SelectItem value="lead_score">Lead Score</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                    <SelectItem value="budget">Budget Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Operator</label>
                <Select 
                  value={selectedStep.config.operator || 'equals'}
                  onValueChange={(value) => updateStep(selectedStep.id, {
                    config: { ...selectedStep.config, operator: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="not_equals">Not Equals</SelectItem>
                    <SelectItem value="greater_than">Greater Than</SelectItem>
                    <SelectItem value="less_than">Less Than</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Value</label>
                <input
                  type="text"
                  value={selectedStep.config.value || ''}
                  onChange={(e) => updateStep(selectedStep.id, {
                    config: { ...selectedStep.config, value: e.target.value }
                  })}
                  className="w-full p-2 border rounded-md"
                  placeholder="Enter condition value..."
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedStep(null)}
            >
              Close
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => deleteStep(selectedStep.id)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Drip Campaign Builder</h2>
          <p className="text-muted-foreground">
            Create automated message sequences for lead nurturing
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {campaign.status === 'active' && (
            <Badge className="bg-green-100 text-green-800">
              <Users className="h-3 w-3 mr-1" />
              {campaign.analytics.active} Active
            </Badge>
          )}
          <Button 
            onClick={toggleCampaignStatus}
            variant={campaign.status === 'active' ? 'outline' : 'default'}
          >
            {campaign.status === 'active' ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Activate
              </>
            )}
          </Button>
          <Button onClick={saveCampaign} disabled={!isEditing}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="builder" className="space-y-4">
        <TabsList>
          <TabsTrigger value="builder">Campaign Builder</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Steps</CardTitle>
                  <CardDescription>
                    Drag or click to add steps to your workflow
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {STEP_TEMPLATES.map((template) => (
                    <Button
                      key={template.type}
                      variant="outline"
                      className="w-full justify-start h-auto p-3"
                      onClick={() => addStep(template)}
                    >
                      <template.icon className="h-4 w-4 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {template.description}
                        </div>
                      </div>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {selectedStep && renderStepEditor()}
            </div>

            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>{campaign.name}</CardTitle>
                  <CardDescription>
                    {campaign.steps.length} steps configured
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 min-h-96">
                    {campaign.steps.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-lg">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="font-medium">No steps configured</h3>
                        <p className="text-sm text-muted-foreground">
                          Add your first step from the sidebar to get started
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {campaign.steps.map((step, index) => {
                          const StepIcon = getStepIcon(step.type)
                          return (
                            <div key={step.id} className="flex items-start space-x-4">
                              <div className="flex flex-col items-center">
                                <div 
                                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                                    selectedStep?.id === step.id 
                                      ? 'border-primary bg-primary text-white' 
                                      : 'border-gray-300 bg-white'
                                  }`}
                                >
                                  <span className="text-xs font-medium">{index + 1}</span>
                                </div>
                                {index < campaign.steps.length - 1 && (
                                  <ArrowDown className="h-4 w-4 text-muted-foreground mt-2" />
                                )}
                              </div>
                              
                              <Card 
                                className={`flex-1 cursor-pointer transition-colors ${
                                  selectedStep?.id === step.id ? 'border-primary' : ''
                                }`}
                                onClick={() => setSelectedStep(step)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3">
                                      <StepIcon className="h-5 w-5 text-muted-foreground" />
                                      <div>
                                        <h4 className="font-medium">{step.name}</h4>
                                        <div className="text-sm text-muted-foreground">
                                          {step.type === 'message' && `Message: "${step.config.content?.slice(0, 50)}..."`}
                                          {step.type === 'delay' && `Wait ${step.config.duration} ${step.config.unit}`}
                                          {step.type === 'condition' && `If ${step.config.field} ${step.config.operator} ${step.config.value}`}
                                          {step.type === 'action' && `Update ${step.config.field} to ${step.config.value}`}
                                        </div>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {step.type}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Settings</CardTitle>
              <CardDescription>
                Configure triggers and general campaign settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Campaign Name</label>
                <input
                  type="text"
                  value={campaign.name}
                  onChange={(e) => updateCampaign({ name: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={campaign.description}
                  onChange={(e) => updateCampaign({ description: e.target.value })}
                  className="w-full p-2 border rounded-md h-20 resize-none"
                  placeholder="Describe the purpose of this drip campaign..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Trigger Events</label>
                <div className="space-y-2">
                  {['lead_created', 'form_submitted', 'campaign_responded', 'tag_added'].map((trigger) => (
                    <label key={trigger} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={campaign.triggers.includes(trigger)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateCampaign({ 
                              triggers: [...campaign.triggers, trigger]
                            })
                          } else {
                            updateCampaign({ 
                              triggers: campaign.triggers.filter(t => t !== trigger)
                            })
                          }
                        }}
                      />
                      <span className="text-sm">
                        {trigger.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Enrolled Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaign.analytics.enrolled}</div>
                <p className="text-xs text-muted-foreground">
                  Total leads in campaign
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaign.analytics.active}</div>
                <p className="text-xs text-muted-foreground">
                  Currently in sequence
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaign.analytics.completed}</div>
                <p className="text-xs text-muted-foreground">
                  Finished sequence
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(campaign.analytics.conversionRate * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Campaign effectiveness
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Step Performance</CardTitle>
              <CardDescription>
                How each step is performing in your sequence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaign.steps.map((step, index) => (
                  <div key={step.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-medium">{step.name}</div>
                        <div className="text-sm text-muted-foreground">{step.type}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">95%</div>
                      <div className="text-xs text-muted-foreground">completion</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}