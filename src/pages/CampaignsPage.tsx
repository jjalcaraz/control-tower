import { useState, useEffect } from 'react'
import { Plus, Play, Pause, BarChart3, MoreVertical, Edit, Copy, Trash2, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CampaignWizardNew } from '@/components/campaigns/CampaignWizardNew'
import { EditCampaignDialog } from '@/components/campaigns/EditCampaignDialog'
import { DripCampaignBuilder } from '@/components/campaigns/DripCampaignBuilder'
import { AdvancedReporting } from '@/components/analytics/AdvancedReporting'
import { TrendAnalysis } from '@/components/analytics/TrendAnalysis'
import { formatDate, formatNumber, calculateDeliveryRate, calculateResponseRate } from '@/lib/utils'
import { useCampaigns, useStartCampaign, usePauseCampaign, useCreateCampaign, useLeads, useTemplates } from '@/hooks/use-api'

const normalizeCampaignData = (rawData: any) => {
  if (!rawData) return []
  if (Array.isArray(rawData)) return rawData
  if (Array.isArray(rawData.data)) return rawData.data
  if (Array.isArray(rawData.items)) return rawData.items
  if (Array.isArray(rawData.results)) return rawData.results
  if (rawData.data && Array.isArray(rawData.data.data)) return rawData.data.data
  return []
}

const mockCampaigns = [
  {
    id: '1',
    name: 'Land Acquisition Q4',
    description: 'Outreach campaign for land acquisition prospects in Texas',
    type: 'broadcast',
    status: 'active',
    targetAudience: {
      leadCount: 1234,
    },
    metrics: {
      totalSent: 1234,
      delivered: 1156,
      failed: 78,
      replies: 87,
      optOuts: 12,
      conversions: 23,
    },
    schedule: {
      startDate: '2024-01-15T09:00:00Z',
    },
    createdAt: '2024-01-10T10:30:00Z',
  },
  {
    id: '2',
    name: 'Property Follow-up',
    description: 'Follow-up sequence for interested leads',
    type: 'drip',
    status: 'paused',
    targetAudience: {
      leadCount: 892,
    },
    metrics: {
      totalSent: 892,
      delivered: 847,
      failed: 45,
      replies: 23,
      optOuts: 8,
      conversions: 12,
    },
    schedule: {
      startDate: '2024-01-12T14:00:00Z',
    },
    createdAt: '2024-01-08T15:45:00Z',
  },
  {
    id: '3',
    name: 'New Leads Welcome',
    description: 'Welcome sequence for newly imported leads',
    type: 'trigger',
    status: 'active',
    targetAudience: {
      leadCount: 567,
    },
    metrics: {
      totalSent: 567,
      delivered: 534,
      failed: 33,
      replies: 45,
      optOuts: 5,
      conversions: 18,
    },
    schedule: {
      startDate: '2024-01-14T10:00:00Z',
    },
    createdAt: '2024-01-05T11:20:00Z',
  },
]

export function CampaignsPage() {
  const [showWizard, setShowWizard] = useState(false)
  const [campaigns, setCampaigns] = useState(mockCampaigns)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [editingCampaign, setEditingCampaign] = useState<any>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  
  // API hooks
  const { data: campaignsData, isLoading: campaignsLoading, refetch } = useCampaigns()
  const { data: leadsData, isLoading: leadsLoading } = useLeads({ page: 1, limit: 1000 })
  const { data: templatesData, isLoading: templatesLoading } = useTemplates()
  const startCampaignMutation = useStartCampaign()
  const pauseCampaignMutation = usePauseCampaign()
  const createCampaignMutation = useCreateCampaign()
  
  // Load campaigns from API if available, otherwise use mock data
  useEffect(() => {
    if (campaignsData === undefined) return
    const normalized = normalizeCampaignData(campaignsData)
    if (normalized.length > 0 || Array.isArray(campaignsData)) {
      setCampaigns(normalized)
    } else {
      setCampaigns([])
    }
  }, [campaignsData])
  
  const handleStartCampaign = async (campaignId: string) => {
    try {
      await startCampaignMutation.mutateAsync(campaignId)
      console.log('Campaign started successfully')
      // Update local state
      setCampaigns(prev => prev.map(c => 
        String(c.id) === String(campaignId) ? { ...c, status: 'active' } : c
      ))
    } catch (error) {
      console.error('Failed to start campaign:', error)
    }
  }
  
  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await pauseCampaignMutation.mutateAsync(campaignId)
      console.log('Campaign paused successfully')
      // Update local state
      setCampaigns(prev => prev.map(c => 
        String(c.id) === String(campaignId) ? { ...c, status: 'paused' } : c
      ))
    } catch (error) {
      console.error('Failed to pause campaign:', error)
    }
  }

  const handleEditCampaign = (campaignId: string) => {
    const campaign = campaigns.find(c => String(c.id) === String(campaignId))
    if (campaign) {
      setEditingCampaign(campaign)
      setShowEditDialog(true)
    }
  }

  const handleUpdateCampaign = (updatedCampaign: any) => {
    setCampaigns(prev => prev.map(c => 
      c.id === updatedCampaign.id ? updatedCampaign : c
    ))
    console.log('Campaign updated:', updatedCampaign.name)
  }

  const handleDuplicateCampaign = (campaignId: string) => {
    const campaign = campaigns.find(c => String(c.id) === String(campaignId))
    if (campaign) {
      const duplicatedCampaign = {
        ...campaign,
        id: String(Date.now() + Math.random()), // Generate new ID
        name: `${campaign.name} (Copy)`,
        status: 'draft',
        createdAt: new Date().toISOString(),
        metrics: {
          totalSent: 0,
          delivered: 0,
          failed: 0,
          replies: 0,
          optOuts: 0,
          conversions: 0,
        }
      }
      setCampaigns(prev => [duplicatedCampaign, ...prev])
      console.log('Campaign duplicated:', duplicatedCampaign.name)
    }
  }

  const handleDeleteCampaign = (campaignId: string) => {
    const campaign = campaigns.find(c => String(c.id) === String(campaignId))
    if (campaign && confirm(`Are you sure you want to delete "${campaign.name}"?`)) {
      setCampaigns(prev => prev.filter(c => String(c.id) !== String(campaignId)))
      console.log('Campaign deleted:', campaign.name)
    }
  }

  const handleArchiveCampaign = (campaignId: string) => {
    const campaign = campaigns.find(c => String(c.id) === String(campaignId))
    if (campaign) {
      setCampaigns(prev => prev.map(c => 
        String(c.id) === String(campaignId) ? { ...c, status: 'archived' } : c
      ))
      console.log('Campaign archived:', campaign.name)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'archived':
        return 'bg-gray-200 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'broadcast':
        return 'bg-purple-100 text-purple-800'
      case 'drip':
        return 'bg-blue-100 text-blue-800'
      case 'trigger':
        return 'bg-orange-100 text-orange-800'
      case 'followup':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter campaigns based on status
  const filteredCampaigns = campaigns.filter(campaign => {
    if (filterStatus === 'all') return true
    return campaign.status === filterStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Create, manage, and analyze your SMS marketing campaigns
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Campaign Overview</TabsTrigger>
          <TabsTrigger value="drip">Drip Builder</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">

      {/* Campaign Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter(c => c.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(campaigns.reduce((sum, c) => sum + (c.metrics?.totalSent || 0), 0))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Delivery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.length > 0 ? Math.round(campaigns.reduce((sum, c) => 
                sum + calculateDeliveryRate(c.metrics?.totalSent || 0, c.metrics?.delivered || 0), 0
              ) / campaigns.length) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Response Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.length > 0 ? Math.round(campaigns.reduce((sum, c) => 
                sum + calculateResponseRate(c.metrics?.totalSent || 0, c.metrics?.replies || 0), 0
              ) / campaigns.length) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <div className="grid gap-4">
        {(campaignsLoading || isLoading) && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading campaigns...</p>
          </div>
        )}
        {!campaignsLoading && !isLoading && filteredCampaigns.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <BarChart3 className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filterStatus === 'all' ? 'No campaigns yet' : `No ${filterStatus} campaigns`}
            </h3>
            <p className="text-gray-600 mb-4">
              {filterStatus === 'all' 
                ? 'Get started by creating your first SMS campaign'
                : `No campaigns found with status "${filterStatus}"`
              }
            </p>
            {filterStatus === 'all' && (
              <Button onClick={() => setShowWizard(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Campaign
              </Button>
            )}
          </div>
        )}
        {!campaignsLoading && !isLoading && filteredCampaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center space-x-2">
                    <span>{campaign.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(campaign.type)}`}>
                      {campaign.type}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {campaign.description}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Analytics
                  </Button>
                  {campaign.status === 'active' ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={pauseCampaignMutation.isPending}
                      onClick={() => handlePauseCampaign(campaign.id)}
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      {pauseCampaignMutation.isPending ? 'Pausing...' : 'Pause'}
                    </Button>
                  ) : campaign.status === 'archived' ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled
                      className="opacity-50"
                    >
                      <Archive className="h-4 w-4 mr-1" />
                      Archived
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={startCampaignMutation.isPending || campaign.status === 'completed'}
                      onClick={() => handleStartCampaign(campaign.id)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      {startCampaignMutation.isPending ? 'Starting...' : 
                       campaign.status === 'completed' ? 'Completed' : 'Start'}
                    </Button>
                  )}
                  
                  {/* Campaign Management Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => handleEditCampaign(campaign.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Campaign
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicateCampaign(campaign.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {campaign.status !== 'archived' && (
                        <DropdownMenuItem onClick={() => handleArchiveCampaign(String(campaign.id))}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => handleDeleteCampaign(String(campaign.id))}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatNumber(campaign.targetAudience?.leadCount || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Targeted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {formatNumber(campaign.metrics?.totalSent || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {calculateDeliveryRate(campaign.metrics?.totalSent || 0, campaign.metrics?.delivered || 0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Delivered</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {calculateResponseRate(campaign.metrics?.totalSent || 0, campaign.metrics?.replies || 0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Response</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatNumber(campaign.metrics?.conversions || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Conversions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {formatNumber(campaign.metrics?.optOuts || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Opt-outs</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Created: {formatDate(campaign.createdAt)}</span>
                  <span>Started: {formatDate(campaign.schedule?.startDate || campaign.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
        </TabsContent>

        <TabsContent value="drip">
          <DripCampaignBuilder />
        </TabsContent>

        <TabsContent value="analytics">
          <TrendAnalysis />
        </TabsContent>

        <TabsContent value="reports">
          <AdvancedReporting />
        </TabsContent>
      </Tabs>

      {/* Campaign Wizard */}
      <CampaignWizardNew 
        open={showWizard} 
        onOpenChange={setShowWizard}
        leads={((leadsData as any)?.data || []).map((lead: any) => ({
          ...lead,
          phone: lead.primaryPhone || lead.phone,
          tags: lead.tags && lead.tags.length > 0 ? lead.tags : 
               // Add some demo tags for testing based on location and property type
               [
                 ...(lead.address?.state === 'TX' ? ['texas'] : []),
                 ...(lead.address?.city ? [lead.address.city.toLowerCase()] : []),
                 ...(lead.property?.propertyType ? [lead.property.propertyType.toLowerCase().replace(' ', '-')] : [])
               ].filter(Boolean)
        }))}
        templates={(templatesData as any)?.data || []}
        onCreateCampaign={async (campaign) => {
          try {
            const response = await (createCampaignMutation as any).mutateAsync(campaign)
            console.log('Campaign created successfully:', response)
            
            // Add the new campaign to the local state immediately
            const newCampaign = {
              id: response.data.id,
              name: campaign.name,
              description: campaign.description || '',
              type: campaign.type,
              status: 'draft',
              targetAudience: {
                leadCount: campaign.targetAudience?.filters?.useIndividualSelection 
                  ? (campaign.targetAudience?.filters?.selectedLeadIds?.length || 0)
                  : (campaign.targetAudience?.tags?.length > 0 ? 100 : 500) // Estimated count
              },
              metrics: {
                totalSent: 0,
                delivered: 0,
                failed: 0,
                replies: 0,
                optOuts: 0,
                conversions: 0,
              },
              schedule: campaign.schedule,
              createdAt: new Date().toISOString(),
            }
            
            // Add to campaigns list
            setCampaigns(prev => [newCampaign, ...prev])
            setShowWizard(false)
          } catch (error) {
            console.error('Failed to create campaign:', error)
          }
        }}
      />

      {/* Edit Campaign Dialog */}
      <EditCampaignDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        campaign={editingCampaign}
        onUpdateCampaign={handleUpdateCampaign}
      />
    </div>
  )
}
