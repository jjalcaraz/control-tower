import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Search,
  Edit3,
  Copy,
  Trash2,
  MessageSquare,
  Variable,
  Eye,
  Save
} from 'lucide-react'
import { MessageTemplate } from '@/types/campaign'

interface TemplateManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: MessageTemplate[]
  onCreateTemplate: (template: Partial<MessageTemplate>) => void
  onUpdateTemplate: (id: number, template: Partial<MessageTemplate>) => void
  onDeleteTemplate: (id: number) => void
  onSelectTemplate?: (template: MessageTemplate) => void
}

interface TemplatePreview {
  firstName: string
  lastName: string
  city: string
  state: string
  propertyType: string
  companyName: string
}

const TEMPLATE_CATEGORIES = [
  { value: 'welcome', label: 'Welcome', color: 'bg-blue-100 text-blue-800' },
  { value: 'followup', label: 'Follow-up', color: 'bg-green-100 text-green-800' },
  { value: 'nurture', label: 'Nurture', color: 'bg-purple-100 text-purple-800' },
  { value: 'promotional', label: 'Promotional', color: 'bg-orange-100 text-orange-800' },
  { value: 'custom', label: 'Custom', color: 'bg-gray-100 text-gray-800' },
]

const AVAILABLE_VARIABLES = [
  { key: '{{firstName}}', description: 'Lead\'s first name' },
  { key: '{{lastName}}', description: 'Lead\'s last name' },
  { key: '{{fullName}}', description: 'Lead\'s full name' },
  { key: '{{phone}}', description: 'Lead\'s phone number' },
  { key: '{{email}}', description: 'Lead\'s email address' },
  { key: '{{city}}', description: 'Lead\'s city' },
  { key: '{{state}}', description: 'Lead\'s state' },
  { key: '{{county}}', description: 'Lead\'s county' },
  { key: '{{propertyType}}', description: 'Property type' },
  { key: '{{acreage}}', description: 'Property acreage' },
  { key: '{{estimatedValue}}', description: 'Estimated property value' },
  { key: '{{companyName}}', description: 'Your company name' },
  { key: '{{senderName}}', description: 'Your name' },
]

const SAMPLE_TEMPLATES: Partial<MessageTemplate>[] = [
  {
    name: 'Initial Land Inquiry',
    category: 'welcome',
    content: 'Hi {{firstName}}, I noticed your property in {{city}}, {{state}}. I buy land in the area and would like to make you a fair cash offer. Interested? - {{companyName}}',
    variables: ['firstName', 'city', 'state', 'companyName']
  },
  {
    name: 'Follow-up Response',
    category: 'followup',
    content: 'Thanks for your response {{firstName}}! I\'d love to discuss your {{propertyType}} property. When would be a good time to chat? - {{senderName}}',
    variables: ['firstName', 'propertyType', 'senderName']
  },
  {
    name: 'No Response Follow-up',
    category: 'nurture',
    content: 'Hi {{firstName}}, I reached out about your {{city}} property. Still interested in hearing our cash offer? No obligation to sell. - {{companyName}}',
    variables: ['firstName', 'city', 'companyName']
  }
]

export function TemplateManager({
  open,
  onOpenChange,
  templates,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onSelectTemplate
}: TemplateManagerProps) {
  const [activeTab, setActiveTab] = useState('browse')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [newTemplate, setNewTemplate] = useState<Partial<MessageTemplate>>({
    name: '',
    description: '',
    category: 'custom',
    content: '',
    variables: []
  })
  const [previewData, _setPreviewData] = useState<TemplatePreview>({
    firstName: 'John',
    lastName: 'Smith',
    city: 'Austin',
    state: 'TX',
    propertyType: 'vacant land',
    companyName: 'Your Company'
  })

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const insertVariable = (variable: string, isEditing = false) => {
    const template = isEditing ? editingTemplate : newTemplate
    const currentContent = template?.content || ''
    const updatedContent = currentContent + variable
    
    if (isEditing && editingTemplate) {
      setEditingTemplate({ ...editingTemplate, content: updatedContent })
    } else {
      setNewTemplate(prev => ({ ...prev, content: updatedContent }))
    }
  }

  const previewTemplate = (content: string) => {
    return content
      .replace(/\{\{firstName\}\}/g, previewData.firstName)
      .replace(/\{\{lastName\}\}/g, previewData.lastName)
      .replace(/\{\{fullName\}\}/g, `${previewData.firstName} ${previewData.lastName}`)
      .replace(/\{\{city\}\}/g, previewData.city)
      .replace(/\{\{state\}\}/g, previewData.state)
      .replace(/\{\{propertyType\}\}/g, previewData.propertyType)
      .replace(/\{\{companyName\}\}/g, previewData.companyName)
      .replace(/\{\{senderName\}\}/g, previewData.companyName)
  }

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g
    const variables: string[] = []
    let match
    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1])
      }
    }
    return variables
  }

  const handleSaveTemplate = () => {
    if (newTemplate.name && newTemplate.content) {
      const variables = extractVariables(newTemplate.content)
      onCreateTemplate({
        ...newTemplate,
        variables,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      setNewTemplate({
        name: '',
        description: '',
        category: 'custom',
        content: '',
        variables: []
      })
      setActiveTab('browse')
    }
  }

  const handleUpdateTemplate = () => {
    if (editingTemplate) {
      const variables = extractVariables(editingTemplate.content)
      onUpdateTemplate(editingTemplate.id, {
        ...editingTemplate,
        variables,
        updatedAt: new Date().toISOString()
      })
      setEditingTemplate(null)
    }
  }

  const getCategoryColor = (category: string) => {
    const categoryInfo = TEMPLATE_CATEGORIES.find(c => c.value === category)
    return categoryInfo?.color || 'bg-gray-100 text-gray-800'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6" />
            <span>Message Templates</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="browse">Browse Templates</TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="samples">Sample Templates</TabsTrigger>
          </TabsList>

          {/* Browse Templates */}
          <TabsContent value="browse" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {TEMPLATE_CATEGORIES.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="secondary">
                {filteredTemplates.length} templates
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge className={getCategoryColor(template.category)}>
                          {template.category}
                        </Badge>
                        <div className="flex space-x-1">
                          {onSelectTemplate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onSelectTemplate(template)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingTemplate(template)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => onDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-600">{template.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="bg-gray-50 p-3 rounded-lg text-sm">
                        {template.content}
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg text-sm">
                        <p className="text-xs text-gray-500 mb-1">Preview:</p>
                        {previewTemplate(template.content)}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Used {template.usageCount} times</span>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map(variable => (
                            <Badge key={variable} variant="outline" className="text-xs">
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Create New Template */}
          <TabsContent value="create" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Template Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="templateName">Template Name *</Label>
                    <Input
                      id="templateName"
                      value={newTemplate.name || ''}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Initial Land Inquiry"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="templateDescription">Description</Label>
                    <Input
                      id="templateDescription"
                      value={newTemplate.description || ''}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of when to use this template"
                    />
                  </div>

                  <div>
                    <Label htmlFor="templateCategory">Category</Label>
                    <Select 
                      value={newTemplate.category} 
                      onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_CATEGORIES.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="templateContent">Message Content *</Label>
                    <Textarea
                      id="templateContent"
                      value={newTemplate.content || ''}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Hi {{firstName}}, I saw your property in {{city}} and..."
                      rows={6}
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button onClick={handleSaveTemplate} disabled={!newTemplate.name || !newTemplate.content}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Template
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setNewTemplate({
                        name: '',
                        description: '',
                        category: 'custom',
                        content: '',
                        variables: []
                      })
                    }}>
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Variable className="h-5 w-5" />
                      <span>Available Variables</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 max-h-64 overflow-y-auto">
                      {AVAILABLE_VARIABLES.map((variable) => (
                        <div
                          key={variable.key}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                          onClick={() => insertVariable(variable.key)}
                        >
                          <div>
                            <p className="text-sm font-mono">{variable.key}</p>
                            <p className="text-xs text-gray-500">{variable.description}</p>
                          </div>
                          <Plus className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Eye className="h-5 w-5" />
                      <span>Preview</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {newTemplate.content ? (
                      <div className="bg-green-50 p-3 rounded-lg text-sm">
                        {previewTemplate(newTemplate.content)}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Start typing your template to see a preview...</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Sample Templates */}
          <TabsContent value="samples" className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Pre-built Templates</h3>
              <p className="text-sm text-gray-600 mb-4">
                Get started quickly with these proven templates for land buying campaigns
              </p>
            </div>

            <div className="grid gap-4">
              {SAMPLE_TEMPLATES.map((template, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge className={getCategoryColor(template.category!)}>
                          {template.category}
                        </Badge>
                        <Button
                          onClick={() => {
                            onCreateTemplate({
                              ...template,
                              usageCount: 0,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString()
                            })
                          }}
                          size="sm"
                        >
                          Use Template
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="bg-gray-50 p-3 rounded-lg text-sm">
                        {template.content}
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg text-sm">
                        <p className="text-xs text-gray-500 mb-1">Preview:</p>
                        {previewTemplate(template.content || '')}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {template.variables?.map(variable => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Template Dialog */}
        {editingTemplate && (
          <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Template</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="editName">Template Name</Label>
                  <Input
                    id="editName"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </div>

                <div>
                  <Label htmlFor="editDescription">Description</Label>
                  <Input
                    id="editDescription"
                    value={editingTemplate.description}
                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, description: e.target.value } : null)}
                  />
                </div>

                <div>
                  <Label htmlFor="editContent">Message Content</Label>
                  <Textarea
                    id="editContent"
                    value={editingTemplate.content}
                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, content: e.target.value } : null)}
                    rows={4}
                  />
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <p className="text-sm">{previewTemplate(editingTemplate.content)}</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateTemplate}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}