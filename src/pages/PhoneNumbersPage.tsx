import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Plus,
  Search,
  Filter,
  Phone,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Settings,
  BarChart3,
  Zap,
  Globe,
  Clock,
  Users,
  MessageSquare,
  Wifi,
  WifiOff,
  RefreshCw,
  Archive,
  Star
} from 'lucide-react'
import { usePhoneNumbers, usePhoneNumberStats, useSyncTwilioNumbers, useTwilioStatus } from '@/hooks/use-api'
import { cn, formatDate } from '@/lib/utils'
import { format } from 'date-fns'
import { NumberProvisioningWizard } from '@/components/phone-numbers/NumberProvisioningWizard'
import { HealthMonitor } from '@/components/phone-numbers/HealthMonitor'
import { ComplianceManagement } from '@/components/phone-numbers/ComplianceManagement'
import { PhoneNumberAnalytics } from '@/components/phone-numbers/PhoneNumberAnalytics'

interface PhoneNumber {
  id: string
  number: string
  carrier: string
  type: 'local' | 'toll_free' | 'short_code'
  status: 'active' | 'inactive' | 'suspended' | 'quarantined'
  healthScore: number
  region: string
  capabilities: string[]
  purchaseDate: string
  lastUsed: string
  totalSent: number
  totalDelivered: number
  deliveryRate: number
  responseRate: number
  spamReports: number
  optOuts: number
  monthlyLimit: number
  monthlyUsed: number
  dailyLimit: number
  dailyUsed: number
  compliance: {
    tcpaCompliant: boolean
    carrierApproved: boolean
    brandRegistered: boolean
    campaignRegistered: boolean
  }
  issues: Array<{
    type: 'warning' | 'error' | 'info'
    message: string
    timestamp: string
  }>
}

const carriers = [
  'Verizon',
  'AT&T',
  'T-Mobile',
  'Sprint',
  'US Cellular',
  'Other'
]

const regions = [
  'US-East',
  'US-Central',
  'US-West',
  'Canada',
  'International'
]

export function PhoneNumbersPage() {
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCarrier, setFilterCarrier] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('overview')
  const [showProvisionModal, setShowProvisionModal] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // API hooks
  const { data: phoneNumbersData, isLoading, refetch: refetchPhoneNumbers } = usePhoneNumbers()
  const { data: statsData } = usePhoneNumberStats()
  const { data: twilioStatus } = useTwilioStatus()

  // Normalize phone number data to handle both snake_case and camelCase fields
  const phoneNumbersSource = Array.isArray(phoneNumbersData)
    ? phoneNumbersData
    : (phoneNumbersData?.results || phoneNumbersData?.data || [])

  const phoneNumbers = phoneNumbersSource.map(number => ({
    ...number,
    // Normalize field names to consistent camelCase
    healthScore: number.healthScore || number.health_score || 0,
    carrier: number.carrier || number.provider || 'Unknown',
    phoneNumber: number.phoneNumber || number.phone_number || number.number || '',
    monthlyUsed: number.monthlyUsed || number.monthly_used || 0,
    monthlyLimit: number.monthlyLimit || number.monthly_limit || 0,
    dailyUsed: number.dailyUsed || number.daily_used || 0,
    dailyLimit: number.dailyLimit || number.daily_limit || 0,
    totalSent: number.totalSent || number.total_sent || 0,
    totalDelivered: number.totalDelivered || number.total_delivered || 0,
    deliveryRate: number.deliveryRate || number.delivery_rate || 0,
    responseRate: number.responseRate || number.response_rate || 0,
    spamReports: number.spamReports || number.spam_reports || 0,
    optOuts: number.optOuts || number.opt_outs || 0,
    purchaseDate: number.purchaseDate || number.purchase_date || '',
    lastUsed: number.lastUsed || number.last_used || ''
  }))
  const stats = statsData || {}

  const syncTwilioNumbersMutation = useSyncTwilioNumbers({
    onSuccess: () => {
      refetchPhoneNumbers()
    },
    onError: (error) => {
      console.error('Error syncing Twilio numbers:', error)
    }
  })

  const syncTwilioNumbers = async () => {
    // Check if Twilio is configured from the API response
    const isConfigured = twilioStatus?.configured || twilioStatus?.twilio_configured || false

    if (!isConfigured) {
      console.log('Twilio not configured')
      // Optionally show an error message to the user
      alert('Twilio is not configured. Please configure your Twilio settings first.')
      return
    }

    try {
      syncTwilioNumbersMutation.mutate()
    } catch (error) {
      console.error('Error syncing Twilio numbers:', error)
      alert('Failed to sync Twilio numbers. Please check your configuration.')
    }
  }

  // Filter phone numbers
  const filteredNumbers = phoneNumbers.filter(number => {
    const matchesSearch = number.phoneNumber.includes(searchTerm) ||
                         number.carrier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (number.region || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || number.status === filterStatus
    const matchesCarrier = filterCarrier === 'all' || number.carrier === filterCarrier

    return matchesSearch && matchesStatus && matchesCarrier
  })

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      quarantined: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.inactive
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      local: 'Local',
      toll_free: 'Toll-Free',
      short_code: 'Short Code'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getComplianceIcon = (compliance: PhoneNumber['compliance']) => {
    const issues = []
    if (!compliance.tcpaCompliant) issues.push('TCPA')
    if (!compliance.carrierApproved) issues.push('Carrier')
    if (!compliance.brandRegistered) issues.push('Brand')
    if (!compliance.campaignRegistered) issues.push('Campaign')

    if (issues.length === 0) {
      return <ShieldCheck className="h-4 w-4 text-green-600" />
    } else {
      return <AlertTriangle className="h-4 w-4 text-red-600" />
    }
  }

  const handleSelectNumber = (numberId: string) => {
    setSelectedNumbers(prev => 
      prev.includes(numberId) 
        ? prev.filter(id => id !== numberId)
        : [...prev, numberId]
    )
  }

  const handleSelectAll = () => {
    if (selectedNumbers.length === filteredNumbers.length) {
      setSelectedNumbers([])
    } else {
      setSelectedNumbers(filteredNumbers.map(n => n.id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Phone Numbers</h1>
          <p className="text-muted-foreground">
            Manage your SMS phone number pool and monitor health scores
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={syncTwilioNumbers}
            disabled={!(twilioStatus?.configured || twilioStatus?.twilio_configured) || syncTwilioNumbersMutation.isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncTwilioNumbersMutation.isLoading ? 'animate-spin' : ''}`} />
            {syncTwilioNumbersMutation.isLoading ? 'Syncing...' : 'Sync from Twilio'}
          </Button>
          <Button onClick={() => setShowProvisionModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Provision Number
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Numbers</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{phoneNumbers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Numbers</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {phoneNumbers.filter(n => n.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Health Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {phoneNumbers.length > 0
                ? Math.round(phoneNumbers.reduce((sum, n) => sum + n.healthScore, 0) / phoneNumbers.length)
                : 0
              }
            </div>
            <p className="text-xs text-muted-foreground">Out of 100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {phoneNumbers.filter(n => 
                !n.compliance?.tcpaCompliant || 
                !n.compliance?.carrierApproved ||
                !n.compliance?.brandRegistered ||
                !n.compliance?.campaignRegistered
              ).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Usage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {phoneNumbers.reduce((sum, n) => sum + n.monthlyUsed, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Messages sent</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="health">Health Monitor</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {activeTab === 'overview' && (
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search numbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="quarantined">Quarantined</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCarrier} onValueChange={setFilterCarrier}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Carrier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Carriers</SelectItem>
                  {carriers.map(carrier => (
                    <SelectItem key={carrier} value={carrier}>
                      {carrier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <TabsContent value="overview" className="space-y-4">
          {/* Bulk Actions */}
          {selectedNumbers.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium">
                      {selectedNumbers.length} number{selectedNumbers.length !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4 mr-1" />
                        Configure
                      </Button>
                      <Button size="sm" variant="outline">
                        <Archive className="h-4 w-4 mr-1" />
                        Archive
                      </Button>
                      <Button size="sm" variant="outline">
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Health Check
                      </Button>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedNumbers([])}>
                    Clear Selection
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Phone Numbers Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Phone Numbers ({filteredNumbers.length})</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAll}
                >
                  {selectedNumbers.length === filteredNumbers.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : filteredNumbers.length > 0 ? (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {filteredNumbers.map(number => (
                      <div
                        key={number.id}
                        className={cn(
                          "border rounded-lg p-4 hover:bg-muted/50 transition-colors",
                          selectedNumbers.includes(number.id) && "border-blue-500 bg-blue-50"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <input
                              type="checkbox"
                              checked={selectedNumbers.includes(number.id)}
                              onChange={() => handleSelectNumber(number.id)}
                              className="mt-1"
                            />
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="font-mono text-lg font-semibold">
                                  {number.number}
                                </span>
                                <Badge className={getStatusColor(number.status)}>
                                  {number.status}
                                </Badge>
                                <Badge variant="outline">
                                  {getTypeLabel(number.type)}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {number.carrier}
                                </span>
                                {getComplianceIcon(number.compliance)}
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <div className="text-muted-foreground">Health Score</div>
                                  <div className={cn("font-semibold", getHealthScoreColor(number.health_score || number.healthScore || 0))}>
                                    {number.health_score || number.healthScore || 0}/100
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Messages Today</div>
                                  <div className="font-semibold">{number.messages_sent_today || 0}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Messages Remaining</div>
                                  <div className="font-semibold">
                                    {(number.messages_remaining || 0).toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Last Activity</div>
                                  <div className="font-semibold">
                                    {number.last_activity ? formatDate(number.last_activity) : 'Never'}
                                  </div>
                                </div>
                              </div>

                              {number.issues && number.issues.length > 0 && (
                                <div className="mt-3 space-y-1">
                                  {number.issues.slice(0, 2).map((issue, index) => (
                                    <div
                                      key={index}
                                      className={cn(
                                        "flex items-center space-x-2 text-xs px-2 py-1 rounded",
                                        issue.type === 'error' && "bg-red-100 text-red-800",
                                        issue.type === 'warning' && "bg-yellow-100 text-yellow-800",
                                        issue.type === 'info' && "bg-blue-100 text-blue-800"
                                      )}
                                    >
                                      <span>{issue.message}</span>
                                    </div>
                                  ))}
                                  {number.issues.length > 2 && (
                                    <div className="text-xs text-muted-foreground">
                                      +{number.issues.length - 2} more issues
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Settings className="h-4 w-4 mr-2" />
                                Configure
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Activity className="h-4 w-4 mr-2" />
                                Health Check
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <BarChart3 className="h-4 w-4 mr-2" />
                                View Analytics
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12">
                  <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchTerm || filterStatus !== 'all' || filterCarrier !== 'all' 
                      ? 'No phone numbers found' 
                      : 'No phone numbers yet'
                    }
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || filterStatus !== 'all' || filterCarrier !== 'all'
                      ? 'Try adjusting your search or filter criteria'
                      : 'Provision your first phone number to get started'
                    }
                  </p>
                  {!searchTerm && filterStatus === 'all' && filterCarrier === 'all' && (
                    <Button onClick={() => setShowProvisionModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Provision Number
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <HealthMonitor />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <ComplianceManagement />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <PhoneNumberAnalytics />
        </TabsContent>
      </Tabs>

      {/* Provision Number Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white min-h-full w-full max-w-4xl mx-4">
            <NumberProvisioningWizard
              onComplete={() => {
                setShowProvisionModal(false)
                refetchPhoneNumbers()
              }}
              onCancel={() => setShowProvisionModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
