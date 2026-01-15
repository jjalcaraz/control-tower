import { useState, useMemo } from 'react'
import { Plus, Upload, Download, Search, Filter, MoreHorizontal, Edit, Trash2, MessageSquare, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ImportLeadsDialog } from '@/components/leads/ImportLeadsDialog'
import { AddLeadDialog } from '@/components/leads/AddLeadDialog'
import { EditLeadDialog } from '@/components/leads/EditLeadDialog'
import { ExportLeadsDialog } from '@/components/leads/ExportLeadsDialog'
import { exportLeadsToCSV, exportLeadsToExcel, ExportOptions } from '@/lib/exportUtils'
import { MessageComposer } from '@/components/messages/MessageComposer'
import { useLeads, useBulkUpdateLeads, useDeleteLead, useCreateLead, useUpdateLead, useSendMessage } from '@/hooks/use-api'
import { messagesApi } from '@/lib/api'
import { useLeadWebSocket } from '@/hooks/use-websocket'
import { formatPhoneNumber, formatDate } from '@/lib/utils'
import { TagFilter } from '@/components/ui/tag-filter'
import { extractAllTags, getLeadCountByTag, filterLeadsByTags } from '@/lib/leadTagging'

const normalizeLeadData = (rawData: any) => {
  if (!rawData) return []

  let leadsArray: any[] = []

  // Extract array from different response formats
  if (Array.isArray(rawData)) {
    leadsArray = rawData
  } else if (Array.isArray(rawData.data)) {
    leadsArray = rawData.data
  } else if (Array.isArray(rawData.items)) {
    leadsArray = rawData.items
  } else if (Array.isArray(rawData.results)) {
    leadsArray = rawData.results
  } else {
    return []
  }

  // Transform real API data to match frontend expectations
  return leadsArray.map(lead => {
    if (lead.first_name || lead.phone1) {
      return {
        ...lead,
        firstName: lead.first_name || '',
        lastName: lead.last_name || '',
        primaryPhone: lead.phone1,
        secondaryPhone: lead.phone2,
        alternatePhone: lead.phone3,
        phone: lead.phone1,
        fullName: lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
        address: {
          street: lead.address_line1,
          city: lead.city,
          state: lead.state,
          zip: lead.zip_code,
          county: lead.county,
        },
        property: lead.property_type ? {
          propertyType: lead.property_type,
          acreage: lead.acreage,
          estimatedValue: lead.estimated_value,
          parcelId: lead.parcel_id,
        } : undefined,
        status: lead.status || 'new',
        leadScore: lead.lead_score || 'cold',
        tags: lead.tags || [],
        notes: lead.notes || '',
        createdAt: lead.created_at,
        updatedAt: lead.updated_at,
      }
    }

    // Check for legacy API shape
    if (lead.owner_name) {
      // Transform legacy API data to frontend format
      return {
        ...lead,
        firstName: lead.owner_name ? lead.owner_name.split(' ')[0] : '',
        lastName: lead.owner_name ? lead.owner_name.split(' ').slice(1).join(' ') : '',
        primaryPhone: lead.phone_number_1,
        secondaryPhone: lead.phone_number_2,
        alternatePhone: lead.phone_number_3,
        phone: lead.phone_number_1,
        fullName: lead.owner_name,
        address: {
          street: lead.street_address,
          city: lead.city,
          state: lead.state,
          zip: lead.zip_code,
        },
        property: lead.property_type ? {
          propertyType: lead.property_type,
          beds: lead.bedrooms,
          baths: lead.bathrooms,
          squareFootage: lead.square_feet,
        } : undefined,
        status: lead.status || 'new',
        leadScore: lead.lead_score || 'cold',
        tags: lead.tags || [],
        notes: lead.notes || '',
        createdAt: lead.created_at,
        updatedAt: lead.updated_at,
      }
    } else {
      // Return mock data as-is
      return lead
    }
  })
}

const toBackendLeadPayload = (lead: any) => ({
  first_name: lead.firstName ?? lead.first_name ?? '',
  last_name: lead.lastName ?? lead.last_name ?? '',
  phone1: lead.primaryPhone ?? lead.phone1 ?? lead.phone ?? '',
  phone2: lead.secondaryPhone ?? lead.phone2 ?? undefined,
  phone3: lead.alternatePhone ?? lead.phone3 ?? undefined,
  email: lead.email ?? undefined,
  address_line1: lead.street ?? lead.address?.street ?? lead.address_line1 ?? undefined,
  address_line2: lead.address_line2 ?? undefined,
  city: lead.city ?? lead.address?.city ?? undefined,
  state: lead.state ?? lead.address?.state ?? undefined,
  zip_code: lead.zip ?? lead.address?.zip ?? undefined,
  county: lead.county ?? lead.address?.county ?? undefined,
  parcel_id: lead.parcelId ?? lead.property?.parcelId ?? lead.parcel_id ?? undefined,
  property_type: lead.propertyType ?? lead.property?.propertyType ?? lead.property_type ?? undefined,
  acreage: lead.acreage ?? lead.property?.acreage ?? undefined,
  estimated_value: lead.estimatedValue ?? lead.property?.estimatedValue ?? lead.estimated_value ?? undefined,
  lead_source: lead.leadSource ?? lead.lead_source ?? undefined,
  lead_score: lead.leadScore ?? lead.lead_score ?? undefined,
  status: lead.status ?? undefined,
  consent_status: lead.consent_status ?? undefined,
  tags: lead.tags ?? undefined,
  notes: lead.notes ?? undefined,
})

const mockLeads = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Smith',
    primaryPhone: '+15551234567',
    phone: '+15551234567',
    secondaryPhone: '+15551234568',
    alternatePhone: undefined,
    email: 'john@example.com',
    address: {
      street: '123 Oak Street',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      county: 'Travis',
    },
    property: {
      propertyType: 'Vacant Land',
      acreage: 5.2,
      estimatedValue: 45000,
    },
    leadSource: 'Website Form',
    status: 'new' as const,
    score: 'warm' as const,
    tags: ['texas', 'land'],
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 2,
    firstName: 'Sarah',
    lastName: 'Johnson',
    primaryPhone: '+15559876543',
    phone: '+15559876543',
    secondaryPhone: undefined,
    alternatePhone: '+15559876544',
    email: 'sarah@example.com',
    address: {
      street: '456 Pine Avenue',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      county: 'Dallas',
    },
    property: {
      propertyType: 'Residential',
      acreage: 0.25,
      estimatedValue: 125000,
    },
    leadSource: 'Cold Call',
    status: 'contacted' as const,
    score: 'hot' as const,
    tags: ['texas', 'residential'],
    createdAt: '2024-01-14T14:20:00Z',
  },
  {
    id: 3,
    firstName: 'Mike',
    lastName: 'Wilson',
    primaryPhone: '+15554567890',
    phone: '+15554567890',
    secondaryPhone: '+15554567891',
    alternatePhone: '+15554567892',
    address: {
      street: '789 Elm Drive',
      city: 'Houston',
      state: 'TX',
      zip: '77001',
      county: 'Harris',
    },
    property: {
      propertyType: 'Commercial',
      acreage: 2.0,
      estimatedValue: 250000,
    },
    leadSource: 'Referral',
    status: 'interested' as const,
    score: 'hot' as const,
    tags: ['texas', 'commercial'],
    createdAt: '2024-01-13T09:15:00Z',
  },
]

interface LeadFilters {
  status: string[]
  leadSource: string[]
  propertyType: string[]
  state: string[]
  score: string[]
  tags: string[]
}

export function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showAddLeadDialog, setShowAddLeadDialog] = useState(false)
  const [showEditLeadDialog, setShowEditLeadDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showMessageDialog, setShowMessageDialog] = useState(false)
  const [selectedLeadForMessage, setSelectedLeadForMessage] = useState<any>(null)
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState<LeadFilters>({
    status: [],
    leadSource: [],
    propertyType: [],
    state: [],
    score: [],
    tags: []
  })

  // API hooks
  const leadsQuery = useLeads({
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    ...filters
  })
  
  const bulkUpdateMutation = useBulkUpdateLeads()
  const deleteMutation = useDeleteLead()
  const createLeadMutation = useCreateLead()
  const updateLeadMutation = useUpdateLead()
  const sendMessageMutation = useSendMessage()
  const { data: liveLeadUpdates } = useLeadWebSocket()

  // Use real data when available, fallback to mock data
  const leadsFromApi = normalizeLeadData(leadsQuery.data)
  const hasLiveData = leadsFromApi.length > 0

  
  const leads = hasLiveData ? leadsFromApi : mockLeads
  const totalLeads =
    leadsQuery.data?.pagination?.total ??
    leadsQuery.data?.total ??
    (hasLiveData ? leadsFromApi.length : mockLeads.length)
  const isLoading = leadsQuery.isLoading

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800'
      case 'interested':
        return 'bg-green-100 text-green-800'
      case 'not_interested':
        return 'bg-red-100 text-red-800'
      case 'do_not_contact':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
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

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    )
  }

  const handleSelectAll = () => {
    setSelectedLeads(
      selectedLeads.length === leads.length 
        ? [] 
        : leads.map(lead => String(lead.id))
    )
  }

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedLeads.length === 0) return
    
    try {
      await bulkUpdateMutation.mutateAsync({
        leadIds: selectedLeads,
        updates: { status }
      })
      setSelectedLeads([])
    } catch (error) {
      console.error('Bulk update failed:', error)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0) return
    
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedLeads.length} leads? This action cannot be undone.`)
    if (!confirmed) return

    try {
      await Promise.all(selectedLeads.map(id => deleteMutation.mutateAsync(id)))
      setSelectedLeads([])
    } catch (error) {
      console.error('Bulk delete failed:', error)
    }
  }

  const handleSendMessage = (lead: any) => {
    setSelectedLeadForMessage(lead)
    setShowMessageDialog(true)
  }

  const handleEditLead = (lead: any) => {
    setSelectedLeadForEdit(lead)
    setShowEditLeadDialog(true)
  }

  const updateFilter = (filterType: keyof LeadFilters, value: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: checked
        ? [...prev[filterType], value]
        : prev[filterType].filter(v => v !== value)
    }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const clearFilters = () => {
    setFilters({
      status: [],
      leadSource: [],
      propertyType: [],
      state: [],
      score: [],
      tags: []
    })
  }

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const searchDigitsOnly = searchTerm.replace(/\D/g, '')
        
        const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.toLowerCase()
        const primaryPhone = lead.primaryPhone?.replace(/\D/g, '') || ''
        const secondaryPhone = lead.secondaryPhone?.replace(/\D/g, '') || ''
        const alternatePhone = lead.alternatePhone?.replace(/\D/g, '') || ''
        const email = lead.email?.toLowerCase() || ''
        const city = lead.address?.city?.toLowerCase() || ''
        
        const matchesName = fullName.includes(searchLower)
        const matchesPhone = searchDigitsOnly.length > 0 && (
                           primaryPhone.includes(searchDigitsOnly) || 
                           secondaryPhone.includes(searchDigitsOnly) || 
                           alternatePhone.includes(searchDigitsOnly)
                         )
        const matchesEmail = email.includes(searchLower)
        const matchesCity = city.includes(searchLower)
        
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesCity) {
          return false
        }
      }

      // Apply status filter
      if (filters.status.length > 0 && !filters.status.includes(lead.status)) {
        return false
      }

      // Apply lead source filter
      if (filters.leadSource.length > 0 && !filters.leadSource.includes(lead.leadSource)) {
        return false
      }

      // Apply property type filter
      if (filters.propertyType.length > 0 && !filters.propertyType.includes(lead.property?.propertyType || '')) {
        return false
      }

      // Apply state filter
      if (filters.state.length > 0 && !filters.state.includes(lead.address?.state || '')) {
        return false
      }

      // Apply score filter
      if (filters.score.length > 0 && !filters.score.includes(lead.score)) {
        return false
      }

      // Apply tags filter
      if (filters.tags.length > 0) {
        const leadTags = lead.tags || []
        if (!filters.tags.some(tag => leadTags.includes(tag))) {
          return false
        }
      }

      return true
    })
  }, [leads, searchTerm, filters])

  const handleExport = () => {
    setShowExportDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">
            Manage your lead database and track prospects
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowAddLeadDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, phone, email, city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {Object.values(filters).some(arr => arr.length > 0) && (
                  <Badge variant="secondary" className="ml-2">
                    {Object.values(filters).reduce((acc, arr) => acc + arr.length, 0)}
                  </Badge>
                )}
              </Button>
            </div>
            {selectedLeads.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {selectedLeads.length} selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('contacted')}>
                      Mark as Contacted
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('interested')}>
                      Mark as Interested
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('not_interested')}>
                      Mark as Not Interested
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleBulkDelete} 
                      className="text-red-600 focus:text-red-600"
                    >
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardHeader>
        
        <Collapsible open={showFilters}>
          <CollapsibleContent>
            <CardContent className="border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 py-4">
                {/* Status Filter */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Status</h4>
                  <div className="space-y-2">
                    {['new', 'contacted', 'interested', 'not_interested', 'do_not_contact'].map(status => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={filters.status.includes(status)}
                          onCheckedChange={(checked) => updateFilter('status', status, !!checked)}
                        />
                        <label 
                          htmlFor={`status-${status}`} 
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {status.replace('_', ' ')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lead Source Filter */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Lead Source</h4>
                  <div className="space-y-2">
                    {['Website Form', 'Cold Call', 'Referral', 'Direct Mail', 'Social Media'].map(source => (
                      <div key={source} className="flex items-center space-x-2">
                        <Checkbox
                          id={`source-${source}`}
                          checked={filters.leadSource.includes(source)}
                          onCheckedChange={(checked) => updateFilter('leadSource', source, !!checked)}
                        />
                        <label 
                          htmlFor={`source-${source}`} 
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {source}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Property Type Filter */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Property Type</h4>
                  <div className="space-y-2">
                    {['Vacant Land', 'Residential', 'Commercial', 'Agricultural', 'Industrial'].map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={filters.propertyType.includes(type)}
                          onCheckedChange={(checked) => updateFilter('propertyType', type, !!checked)}
                        />
                        <label 
                          htmlFor={`type-${type}`} 
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* State Filter */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">State</h4>
                  <div className="space-y-2">
                    {['TX', 'FL', 'CA', 'AZ', 'NV'].map(state => (
                      <div key={state} className="flex items-center space-x-2">
                        <Checkbox
                          id={`state-${state}`}
                          checked={filters.state.includes(state)}
                          onCheckedChange={(checked) => updateFilter('state', state, !!checked)}
                        />
                        <label 
                          htmlFor={`state-${state}`} 
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {state}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lead Score Filter */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Lead Score</h4>
                  <div className="space-y-2">
                    {['hot', 'warm', 'cold'].map(score => (
                      <div key={score} className="flex items-center space-x-2">
                        <Checkbox
                          id={`score-${score}`}
                          checked={filters.score.includes(score)}
                          onCheckedChange={(checked) => updateFilter('score', score, !!checked)}
                        />
                        <label 
                          htmlFor={`score-${score}`} 
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {score}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags Filter */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Tags</h4>
                  <TagFilter
                    availableTags={extractAllTags(leads)}
                    selectedTags={filters.tags}
                    onTagsChange={(tags) => setFilters(prev => ({ ...prev, tags }))}
                    leadCounts={getLeadCountByTag(leads)}
                    showSearch={false}
                    multiple={true}
                    placeholder="Filter by tags..."
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {Object.values(filters).reduce((acc, arr) => acc + arr.length, 0)} filters applied
                </div>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {searchTerm || Object.values(filters).some(arr => arr.length > 0) ? (
                <>Filtered Leads ({filteredLeads.length} of {totalLeads})</>
              ) : (
                <>All Leads ({totalLeads})</>
              )}
            </CardTitle>
            {isLoading && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Loading...
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 w-8">
                    <Checkbox
                      checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left p-2 font-medium">Name</th>
                  <th className="text-left p-2 font-medium">Contact</th>
                  <th className="text-left p-2 font-medium">Property Address</th>
                  <th className="text-left p-2 font-medium">Property & Source</th>
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium">Score</th>
                  <th className="text-left p-2 font-medium">Added</th>
                  <th className="text-left p-2 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <Checkbox
                          checked={selectedLeads.includes(String(lead.id))}
                          onCheckedChange={() => handleSelectLead(String(lead.id))}
                        />
                      </td>
                      <td className="p-2">
                        <div className="font-medium text-gray-900">
                          {lead.firstName && lead.lastName 
                            ? `${lead.firstName} ${lead.lastName}`
                            : lead.fullName || 'Name not provided'
                          }
                        </div>
                        {lead.tags && lead.tags.length > 0 && (
                          <div className="flex space-x-1 mt-1">
                            {lead.tags.slice(0, 2).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {lead.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{lead.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          ID: {lead.id}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {lead.primaryPhone 
                              ? formatPhoneNumber(lead.primaryPhone)
                              : 'Phone not provided'
                            }
                          </div>
                          {lead.secondaryPhone && (
                            <div className="text-xs text-gray-500">{formatPhoneNumber(lead.secondaryPhone)}</div>
                          )}
                          {lead.alternatePhone && (
                            <div className="text-xs text-gray-500">{formatPhoneNumber(lead.alternatePhone)}</div>
                          )}
                          <div className="text-xs text-gray-600 mt-1">
                            {lead.email || 'Email not provided'}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="text-sm font-medium">
                          {lead.address?.street || 'Address not provided'}
                        </div>
                        <div className="text-xs text-gray-600">
                          {lead.address?.city && lead.address?.state 
                            ? `${lead.address.city}, ${lead.address.state}${lead.address?.zip ? ' ' + lead.address.zip : ''}`
                            : 'Location not available'
                          }
                        </div>
                        {lead.address?.county && (
                          <div className="text-xs text-gray-500">
                            {lead.address.county} County
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="text-sm font-medium">{lead.property?.propertyType || 'Property Type N/A'}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {lead.property?.estimatedValue > 0 
                            ? `$${lead.property.estimatedValue.toLocaleString()}`
                            : 'Value not estimated'
                          }
                        </div>
                        {lead.property?.acreage && (
                          <div className="text-xs text-gray-500">
                            {lead.property.acreage} acres
                          </div>
                        )}
                        <div className="text-xs text-blue-600 mt-1">
                          {lead.leadSource || 'Unknown Source'}
                        </div>
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                          {lead.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(lead.score)}`}>
                          {lead.score}
                        </span>
                      </td>
                      <td className="p-2 text-sm text-gray-600">
                        {formatDate(lead.created_at || lead.createdAt)}
                      </td>
                      <td className="p-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditLead(lead)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Lead
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendMessage(lead)}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Phone className="h-4 w-4 mr-2" />
                              Call Lead
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={async () => {
                                const confirmed = window.confirm(`Are you sure you want to delete ${lead.fullName || lead.owner_name || 'this lead'}? This action cannot be undone.`)
                                if (!confirmed) return

                                try {
                                  await deleteMutation.mutateAsync(lead.id)
                                } catch (error) {
                                  console.error('Delete failed:', error)
                                }
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Lead
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-500">
                      {isLoading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          <span>Loading leads...</span>
                        </div>
                      ) : searchTerm || Object.values(filters).some(arr => arr.length > 0) ? (
                        <div>
                          <p className="text-lg mb-2">No leads found</p>
                          <p className="text-sm">Try adjusting your search or filters</p>
                          <Button variant="outline" size="sm" className="mt-4" onClick={() => {
                            setSearchTerm('')
                            clearFilters()
                          }}>
                            Clear all filters
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-lg mb-2">No leads yet</p>
                          <p className="text-sm mb-4">Get started by adding your first lead or importing from CSV</p>
                          <div className="flex justify-center space-x-2">
                            <Button size="sm" onClick={() => setShowAddLeadDialog(true)}>
                              Add Lead
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
                              Import CSV
                            </Button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredLeads.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Show</span>
                <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span>entries</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {Math.ceil(totalLeads / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage >= Math.ceil(totalLeads / pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <ImportLeadsDialog 
        open={showImportDialog} 
        onOpenChange={setShowImportDialog} 
      />

      {/* Add Lead Dialog */}
      <AddLeadDialog 
        open={showAddLeadDialog} 
        onOpenChange={setShowAddLeadDialog}
        onAddLead={async (newLead) => {
          try {
            await createLeadMutation.mutateAsync(toBackendLeadPayload(newLead))
            console.log('Lead created successfully:', newLead)
          } catch (error) {
            console.error('Failed to create lead:', error)
          }
        }}
      />

      {/* Edit Lead Dialog */}
      <EditLeadDialog 
        open={showEditLeadDialog} 
        onOpenChange={setShowEditLeadDialog}
        lead={selectedLeadForEdit}
        onUpdateLead={async (leadId, updatedLead) => {
          try {
            await updateLeadMutation.mutateAsync({ id: leadId, data: toBackendLeadPayload(updatedLead) })
            console.log('Lead updated successfully:', leadId, updatedLead)
          } catch (error) {
            console.error('Failed to update lead:', error)
            alert('Failed to update lead: ' + (error instanceof Error ? error.message : 'Unknown error'))
          }
        }}
      />

      {/* Export Leads Dialog */}
      <ExportLeadsDialog 
        open={showExportDialog} 
        onOpenChange={setShowExportDialog}
        selectedLeadsCount={selectedLeads.length}
        filteredLeadsCount={filteredLeads.length}
        totalLeadsCount={totalLeads}
        onExport={async (exportOptions: ExportOptions) => {
          try {
            console.log('Exporting leads with options:', exportOptions)
            
            // Determine which leads to export based on filter type
            let leadsToExport = leads
            
              switch (exportOptions.filterType) {
              case 'selected':
                leadsToExport = leads.filter(lead => selectedLeads.includes(String(lead.id)))
                break
              case 'filtered':
                leadsToExport = filteredLeads
                break
              case 'all':
              default:
                leadsToExport = leads
                break
            }

            if (leadsToExport.length === 0) {
              alert('No leads to export!')
              return
            }

            // Export based on format
            if (exportOptions.format === 'csv') {
              exportLeadsToCSV(leadsToExport as any, exportOptions)
            } else {
              await exportLeadsToExcel(leadsToExport as any, exportOptions)
            }

            console.log(`Successfully exported ${leadsToExport.length} leads as ${exportOptions.format.toUpperCase()}`)
          } catch (error) {
            console.error('Export failed:', error)
            alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
          }
        }}
      />

      {/* Send Message Dialog */}
      {showMessageDialog && selectedLeadForMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  Send Message to {selectedLeadForMessage.firstName} {selectedLeadForMessage.lastName}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowMessageDialog(false)
                    setSelectedLeadForMessage(null)
                  }}
                >
                  ✕
                </Button>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm">
                  <strong>Sending to:</strong> {formatPhoneNumber(selectedLeadForMessage.primaryPhone || selectedLeadForMessage.phone)}
                </div>
              </div>
              
              <MessageComposer
                recipientType="conversation"
                showTemplateOptions={true}
                onSendMessage={async (message) => {
                  try {
                    const phoneNumber = selectedLeadForMessage.primaryPhone || selectedLeadForMessage.phone
                    if (!phoneNumber) {
                      throw new Error('No phone number available for this lead')
                    }
                    
                    const content = typeof message === 'string' ? message : message.content
                    console.log(`Sending message to ${selectedLeadForMessage.firstName} at ${phoneNumber}: ${content}`)
                    
                    // Use the new sendMessageToLead API function
                    await messagesApi.sendMessageToLead(phoneNumber, content, selectedLeadForMessage.id)
                    
                    setShowMessageDialog(false)
                    setSelectedLeadForMessage(null)
                  } catch (error) {
                    console.error('Error sending message to lead:', error)
                    alert('Failed to send message: ' + (error instanceof Error ? error.message : 'Unknown error'))
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
