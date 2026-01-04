import { useState, useRef, useEffect } from 'react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  Search,
  Filter,
  Download,
  Upload,
  Edit3,
  Copy,
  Trash2,
  MoreHorizontal,
  Eye,
  BarChart3,
  MessageSquare,
  Type,
  Zap,
  FileText,
  Tag,
  Calendar,
  TrendingUp,
  Users,
  Send
} from 'lucide-react'
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, useTemplateStats } from '@/hooks/use-api'
import { cn, formatDate } from '@/lib/utils'
import { format } from 'date-fns'

interface Template {
  id: string
  name: string
  content: string
  category: string
  variables: string[]
  tags: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  stats?: {
    sent: number
    delivered: number
    responded: number
    conversionRate: number
  }
}

const templateCategories = [
  'initial_outreach',
  'follow_up',
  'nurture',
  'closing',
  'support',
  'custom'
]

const quickInserts = [
  { label: 'First Name', value: '{{firstName}}', description: 'Lead\'s first name' },
  { label: 'Last Name', value: '{{lastName}}', description: 'Lead\'s last name' },
  { label: 'Phone', value: '{{phone}}', description: 'Lead\'s phone number' },
  { label: 'Email', value: '{{email}}', description: 'Lead\'s email address' },
  { label: 'City', value: '{{city}}', description: 'Lead\'s city' },
  { label: 'State', value: '{{state}}', description: 'Lead\'s state' },
  { label: 'County', value: '{{county}}', description: 'Lead\'s county' },
  { label: 'Property Type', value: '{{propertyType}}', description: 'Type of property' },
  { label: 'Property Address', value: '{{propertyAddress}}', description: 'Full property address' },
  { label: 'Today\'s Date', value: '{{today}}', description: 'Current date' },
  { label: 'Company Name', value: '{{companyName}}', description: 'Your company name' },
  { label: 'Agent Name', value: '{{agentName}}', description: 'Agent\'s name' }
]

export function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('library')
  const [showPreview, setShowPreview] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [preview, setPreview] = useState<string>('')

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: 'custom',
    tags: [] as string[],
    isActive: true
  })
  const [newTag, setNewTag] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load templates on component mount
  useEffect(() => {
    loadTemplates()
  }, [selectedCategory])

  const loadTemplates = async () => {
    setIsLoading(true)
    try {
      const params = selectedCategory === 'all' ? {} : { category: selectedCategory }
      const response = await api.get('/templates', { params })
      if (response.data.data) {
        setTemplates(response.data.data)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createTemplate = async () => {
    try {
      const response = await api.post('/templates', {
        name: formData.name,
        content: formData.content,
        category: formData.category
      })
      if (response.data.success) {
        await loadTemplates()
        setIsCreating(false)
        resetForm()
        console.log('Template created successfully')
      }
    } catch (error) {
      console.error('Failed to create template:', error)
    }
  }

  const updateTemplate = async () => {
    if (!selectedTemplate) return
    
    try {
      const response = await api.put(`/templates/${selectedTemplate.id}`, {
        name: formData.name,
        content: formData.content,
        category: formData.category,
        is_active: formData.isActive
      })
      if (response.data.success) {
        await loadTemplates()
        setIsEditing(false)
        setSelectedTemplate(null)
        resetForm()
        console.log('Template updated successfully')
      }
    } catch (error) {
      console.error('Failed to update template:', error)
    }
  }

  const deleteTemplate = async (templateId: number) => {
    try {
      const response = await api.delete(`/templates/${templateId}`)
      if (response.data.success) {
        await loadTemplates()
        console.log('Template deleted successfully')
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  const previewTemplate = async (templateId: number) => {
    try {
      const response = await api.get(`/templates/${templateId}/preview`)
      if (response.data.success) {
        setPreview(response.data.data.preview_content)
        setShowPreview(true)
      }
    } catch (error) {
      console.error('Failed to preview template:', error)
    }
  }

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Template operations
  const handleEdit = (template: Template) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      content: template.content,
      category: template.category,
      tags: template.variables || [],
      isActive: template.isActive ?? true
    })
    setIsEditing(true)
  }

  const handleSave = () => {
    if (isEditing) {
      updateTemplate()
    } else if (isCreating) {
      createTemplate()
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setIsCreating(false)
    setSelectedTemplate(null)
    resetForm()
  }

  // Event handlers for UI interactions
  const insertVariable = (variable: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = formData.content.substring(0, start) + variable + formData.content.substring(end)
      setFormData({ ...formData, content: newContent })
      
      // Restore cursor position
      setTimeout(() => {
        textarea.setSelectionRange(start + variable.length, start + variable.length)
        textarea.focus()
      }, 0)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      await deleteTemplate(templateId)
    }
  }

  const handleDuplicateTemplate = (template: Template) => {
    setFormData({
      name: `${template.name} (Copy)`,
      content: template.content,
      category: template.category,
      tags: [...template.tags],
      isActive: true
    })
    setIsCreating(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      content: '',
      category: 'custom',
      tags: [],
      isActive: true
    })
    setNewTag('')
  }


  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const getPreviewContent = () => {
    return formData.content
      .replace(/\{\{firstName\}\}/g, 'John')
      .replace(/\{\{lastName\}\}/g, 'Smith')
      .replace(/\{\{phone\}\}/g, '(555) 123-4567')
      .replace(/\{\{email\}\}/g, 'john.smith@email.com')
      .replace(/\{\{city\}\}/g, 'Austin')
      .replace(/\{\{state\}\}/g, 'TX')
      .replace(/\{\{county\}\}/g, 'Travis')
      .replace(/\{\{propertyType\}\}/g, 'Vacant Land')
      .replace(/\{\{propertyAddress\}\}/g, '123 Main St, Austin, TX 78701')
      .replace(/\{\{today\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{companyName\}\}/g, 'Your Company')
      .replace(/\{\{agentName\}\}/g, 'Your Name')
  }

  const getCategoryLabel = (category: string) => {
    const labels = {
      initial_outreach: 'Initial Outreach',
      follow_up: 'Follow-up',
      nurture: 'Nurture',
      closing: 'Closing',
      support: 'Support',
      custom: 'Custom'
    }
    return labels[category as keyof typeof labels] || category
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      initial_outreach: 'bg-blue-100 text-blue-800',
      follow_up: 'bg-green-100 text-green-800',
      nurture: 'bg-yellow-100 text-yellow-800',
      closing: 'bg-red-100 text-red-800',
      support: 'bg-purple-100 text-purple-800',
      custom: 'bg-gray-100 text-gray-800'
    }
    return colors[category as keyof typeof colors] || colors.custom
  }

  if (isCreating || isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{isCreating ? 'Create Template' : 'Edit Template'}</h1>
            <p className="text-muted-foreground">
              {isCreating ? 'Create a new message template' : 'Update your message template'}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false)
                setIsEditing(false)
                setSelectedTemplate(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name.trim() || !formData.content.trim() || isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Edit3 className="h-5 w-5 mr-2" />
                Template Editor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Template Name</label>
                <Input
                  placeholder="Enter template name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {templateCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          {getCategoryLabel(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={formData.isActive ? 'active' : 'inactive'} onValueChange={(value) => setFormData(prev => ({ ...prev, isActive: value === 'active' }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Message Content</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Type className="h-4 w-4 mr-1" />
                        Insert Variable
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80">
                      <div className="max-h-60 overflow-y-auto">
                        {quickInserts.map((insert) => (
                          <DropdownMenuItem
                            key={insert.value}
                            onClick={() => insertVariable(insert.value)}
                          >
                            <div>
                              <div className="font-medium">{insert.label}</div>
                              <div className="text-xs text-muted-foreground">{insert.description}</div>
                              <div className="text-xs text-blue-600">{insert.value}</div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Textarea
                  ref={textareaRef}
                  placeholder="Enter your message template..."
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="min-h-[200px] resize-none"
                  rows={8}
                />
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>Use variables like {'{firstName}'} for personalization</span>
                  <span>{formData.content.length}/1600</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Tags</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    placeholder="Add tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="text-sm font-medium mb-2">Preview (with sample data):</div>
                <div className="bg-white border rounded-lg p-3 min-h-[200px]">
                  <div className="text-sm whitespace-pre-wrap">
                    {formData.content ? getPreviewContent() : 'Start typing to see preview...'}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Character count: {getPreviewContent().length}/1600
                </div>
              </div>
              
              {formData.content && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Detected Variables:</h4>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(formData.content.match(/\{\{[^}]+\}\}/g) || []).map((variable, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates</h1>
          <p className="text-muted-foreground">
            Manage your SMS message templates and track performance
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.filter(t => t.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24.5%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="library">Template Library</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {activeTab === 'library' && (
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {templateCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {getCategoryLabel(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <TabsContent value="library" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map(template => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center">
                          {template.name}
                          {!template.isActive && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Inactive
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getCategoryColor(template.category)} variant="outline">
                            {getCategoryLabel(template.category)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(template.updatedAt)}
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTemplate(template)
                              setFormData({
                                name: template.name,
                                content: template.content,
                                category: template.category,
                                tags: template.tags,
                                isActive: template.isActive
                              })
                              setIsEditing(true)
                            }}
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Template
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {template.content}
                    </p>
                    
                    {template.tags && template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {template.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {template.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {template.stats && (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-semibold">{template.stats.sent}</div>
                          <div className="text-muted-foreground">Sent</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{template.stats.delivered}</div>
                          <div className="text-muted-foreground">Delivered</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{template.stats.conversionRate.toFixed(1)}%</div>
                          <div className="text-muted-foreground">Response</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || selectedCategory !== 'all' ? 'No templates found' : 'No templates yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create your first message template to get started'
                }
              </p>
              {!searchTerm && selectedCategory === 'all' && (
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Performance Analytics</h3>
            <p className="text-muted-foreground">
              Detailed template performance analytics coming soon...
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}