import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Download,
  Upload,
  FileText,
  Ban,
  Eye,
  Calendar,
  BarChart3,
  Users,
  Activity,
  Shield,
  Database,
  RefreshCw,
  Plus
} from 'lucide-react'
import { useComplianceDashboard, useOptOuts, useAuditTrail, useComplianceReports, useAddOptOut, useGenerateComplianceReport, useDownloadComplianceReport } from '@/hooks/use-api'
import { useComplianceWebSocket } from '@/hooks/use-websocket'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { BulkOptOutDialog } from '@/components/compliance/BulkOptOutDialog'
import { toast } from 'sonner'

interface ComplianceOverview {
  tcpaCompliance: {
    status: 'compliant' | 'warning' | 'violation'
    score: number
    issues: number
    lastReview: string
  }
  optOuts: {
    total: number
    thisMonth: number
    processed: number
    pending: number
  }
  consent: {
    valid: number
    expired: number
    missing: number
    percentage: number
  }
  campaigns: {
    compliant: number
    nonCompliant: number
    pending: number
  }
}

interface OptOut {
  id: string
  phoneNumber: string
  method: 'stop_keyword' | 'manual' | 'complaint' | 'api'
  timestamp: string
  campaignId?: string
  campaignName?: string
  status: 'processed' | 'pending' | 'error'
  source: string
  reason?: string
  phone_number?: string
  opt_out_date?: string
  campaign_name?: string
}

interface AuditEntry {
  id: string
  timestamp: string
  event: string
  actor: string
  resource: string
  details: string | { description?: string }
  ipAddress?: string
  userAgent?: string
  outcome: 'success' | 'failure' | 'warning'
  metadata?: Record<string, any>
  action?: string
  user_email?: string
  resource_type?: string
  resource_id?: string | number
  ip_address?: string
}

interface ComplianceReport {
  id: string
  name: string
  type: 'tcpa' | 'opt_out' | 'consent' | 'campaign'
  period: string
  generatedAt: string
  status: 'ready' | 'generating' | 'failed'
  downloadUrl?: string
}

export function CompliancePage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDateRange, setSelectedDateRange] = useState('30d')
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' })
  const [filterType, setFilterType] = useState<string>('all')
  const [showOptOutModal, setShowOptOutModal] = useState(false)
  const [showBulkOptOutModal, setShowBulkOptOutModal] = useState(false)
  const [optOutPhoneNumber, setOptOutPhoneNumber] = useState('')
  const [optOutReason, setOptOutReason] = useState('')

  // Calculate date range for reports
  const getReportDateRange = () => {
    if (dateRange.startDate && dateRange.endDate) {
      return { startDate: dateRange.startDate, endDate: dateRange.endDate }
    }

    // Default to last 30 days if no custom range selected
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }

  const reportDateParams = getReportDateRange()

  // API hooks
  const { data: complianceData } = useComplianceDashboard()
  const { data: optOutsData, refetch: refetchOptOuts } = useOptOuts()
  const { data: auditTrailData } = useAuditTrail()
  const { data: reportsData, refetch: refetchReports } = useComplianceReports()
  const generateReportMutation = useGenerateComplianceReport({
    onSuccess: () => {
      toast.success('Report generation started')
      refetchReports()
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to generate report'
      toast.error(message)
    },
  })

  const downloadReportMutation = useDownloadComplianceReport({
    onSuccess: (blobOrResponse: Blob | any, reportId: string) => {
      // Find the report to get its name for the filename
      const report = reports.find(r => r.id === reportId)
      const filename = report?.name || `compliance-report-${reportId}`

      // Create download link and trigger download
      const payload = blobOrResponse?.content
        ? new Blob([blobOrResponse.content], { type: 'text/csv' })
        : blobOrResponse
      const url = window.URL.createObjectURL(payload)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}.csv` // You might want to determine the extension based on report type
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Report downloaded successfully')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to download report'
      toast.error(message)
    },
  })

  // WebSocket for real-time compliance updates
  const { isConnected: isComplianceWsConnected } = useComplianceWebSocket()

  const addOptOutMutation = useAddOptOut({
    onSuccess: () => {
      toast.success('Opt-out processed successfully')
      setOptOutPhoneNumber('')
      setOptOutReason('')
      setShowOptOutModal(false)
      refetchOptOuts()
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to process opt-out'
      toast.error(message)
    },
  })

  const complianceOverview = (complianceData?.data || complianceData || {}) as ComplianceOverview
  const optOuts = (optOutsData?.data || []) as OptOut[]
  const auditEntries = (auditTrailData?.data || []) as AuditEntry[]
  const reports = (reportsData?.data || []) as ComplianceReport[]

  // Filter audit entries
  const filteredAuditEntries = auditEntries.filter(entry => {
    const matchesSearch = (entry.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (entry.user_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (entry.resource_type || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || (entry.action || '').toLowerCase().includes(filterType.toLowerCase())

    return matchesSearch && matchesType
  })

  const getComplianceStatusColor = (status: string) => {
    const colors = {
      compliant: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      violation: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.warning
  }

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <ShieldCheck className="h-5 w-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'violation':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Shield className="h-5 w-5 text-gray-600" />
    }
  }

  const getOptOutStatusColor = (status: string) => {
    const colors = {
      processed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  const getAuditOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const handleManualOptOut = () => {
    setShowOptOutModal(true)
  }

  const handleBulkOptOut = () => {
    setShowBulkOptOutModal(true)
  }

  const handleProcessManualOptOut = () => {
    if (!optOutPhoneNumber.trim()) {
      toast.error('Please enter a phone number')
      return
    }

    addOptOutMutation.mutate({
      phoneNumber: optOutPhoneNumber.trim(),
      reason: optOutReason.trim() || undefined,
    })
  }

  const handleExportReport = (reportId: string) => {
    // Use the download mutation to download the report file
    downloadReportMutation.mutate(reportId)
  }

  const handleGenerateReport = (type: string) => {
    const params = {
      type,
      startDate: reportDateParams.startDate,
      endDate: reportDateParams.endDate,
      format: 'csv', // or 'pdf' if preferred
    }

    generateReportMutation.mutate(params)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance</h1>
          <p className="text-muted-foreground">
            TCPA compliance management and audit trails
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 mr-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isComplianceWsConnected ? "bg-green-500" : "bg-gray-400"
            )} />
            <span className="text-xs text-muted-foreground">
              {isComplianceWsConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" onClick={handleBulkOptOut}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Opt-Out
          </Button>
          <Button onClick={handleManualOptOut}>
            <Ban className="h-4 w-4 mr-2" />
            Manual Opt-Out
          </Button>
        </div>
      </div>

      {/* Compliance Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TCPA Compliance</CardTitle>
            {getComplianceIcon(complianceOverview.tcpaCompliance?.status || 'warning')}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {complianceOverview.tcpaCompliance?.score || 0}%
                </div>
                <Badge className={getComplianceStatusColor(complianceOverview.tcpaCompliance?.status || 'warning')}>
                  {complianceOverview.tcpaCompliance?.status || 'Unknown'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opt-Outs</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complianceOverview.optOuts?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +{complianceOverview.optOuts?.thisMonth || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consent Records</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complianceOverview.consent?.valid || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {complianceOverview.consent?.percentage || 0}% valid consent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliant Campaigns</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complianceOverview.campaigns?.compliant || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {(complianceOverview.campaigns?.compliant || 0) + (complianceOverview.campaigns?.nonCompliant || 0)} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="opt-outs">Opt-Outs</TabsTrigger>
            <TabsTrigger value="audit-trail">Audit Trail</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {(activeTab === 'opt-outs' || activeTab === 'audit-trail') && (
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              {activeTab === 'audit-trail' && (
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="opt-out">Opt-Out</SelectItem>
                    <SelectItem value="consent">Consent</SelectItem>
                    <SelectItem value="campaign">Campaign</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Compliance Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
                  Recent Compliance Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <div>
                        <div className="font-medium text-sm">Missing consent for campaign #123</div>
                        <div className="text-xs text-muted-foreground">2 hours ago</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <div>
                        <div className="font-medium text-sm">High opt-out rate detected</div>
                        <div className="text-xs text-muted-foreground">5 hours ago</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <div>
                        <div className="font-medium text-sm">Expired phone number approvals</div>
                        <div className="text-xs text-muted-foreground">1 day ago</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Compliance Audit
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Generate TCPA Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Consent Records
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleBulkOptOut}>
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Process Opt-Outs
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Metrics (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Consent Coverage</span>
                    <span className="text-sm font-semibold">94.2%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '94.2%' }}></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Opt-Out Processing</span>
                    <span className="text-sm font-semibold">99.1%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '99.1%' }}></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Campaign Approval</span>
                    <span className="text-sm font-semibold">87.5%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '87.5%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opt-outs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Opt-Out Management ({optOuts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {optOuts.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {optOuts.map(optOut => (
                      <div key={optOut.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="font-mono font-semibold">{optOut.phone_number}</span>
                            <Badge className={getOptOutStatusColor('active')}>
                              active
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              via {(optOut.source || '').replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {optOut.opt_out_date || optOut.timestamp
                              ? format(new Date(optOut.opt_out_date || optOut.timestamp), 'MMM d, HH:mm')
                              : 'N/A'}
                          </span>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          {optOut.campaign_name && (
                            <>Campaign: {optOut.campaign_name} • </>
                          )}
                          Source: {optOut.source}
                          {optOut.reason && (
                            <> • Reason: {optOut.reason}</>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12">
                  <Ban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No opt-outs found</h3>
                  <p className="text-muted-foreground">
                    All opt-out requests will appear here for tracking and compliance.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-trail" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Audit Trail ({filteredAuditEntries.length})</CardTitle>
                <div className="flex items-center space-x-2">
                  <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Event Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="export">Export</SelectItem>
                      <SelectItem value="opt_out">Opt Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAuditEntries.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {filteredAuditEntries.map(entry => (
                      <div key={entry.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            {getAuditOutcomeIcon(entry.action || 'unknown')}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium">{entry.action}</span>
                                <span className="text-sm text-muted-foreground">
                                  by {entry.user_email}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground mb-2">
                                Resource: {entry.resource_type} #{entry.resource_id}
                              </div>
                              <div className="text-sm">
                                {typeof entry.details === 'string'
                                  ? entry.details
                                  : entry.details?.description || 'No details available'}
                              </div>
                              {entry.ip_address && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  IP: {entry.ip_address}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(entry.timestamp), 'MMM d, HH:mm:ss')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchTerm || filterType !== 'all' ? 'No audit entries found' : 'No audit entries yet'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm || filterType !== 'all'
                      ? 'Try adjusting your search or filter criteria'
                      : 'Compliance audit entries will appear here'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Compliance Reports</h3>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-auto"
                />
                <span className="text-sm">to</span>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-auto"
                />
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => handleGenerateReport('tcpa')} disabled={generateReportMutation.isLoading}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate TCPA Report
                </Button>
                <Button variant="outline" onClick={() => handleGenerateReport('opt-out')} disabled={generateReportMutation.isLoading}>
                  <Ban className="h-4 w-4 mr-2" />
                  Generate Opt-Out Report
                </Button>
              </div>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Available Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {reports.length > 0 ? (
                <div className="space-y-3">
                  {reports.map(report => (
                    <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{report.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {report.type.toUpperCase()} • {report.period} • Generated {format(new Date(report.generatedAt), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={report.status === 'ready' ? 'default' : report.status === 'generating' ? 'secondary' : 'destructive'}>
                          {report.status}
                        </Badge>
                        {report.status === 'ready' && (
                          <Button size="sm" onClick={() => handleExportReport(report.id)}>
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No reports available</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate your first compliance report to get started
                  </p>
                  <Button onClick={() => handleGenerateReport('tcpa')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manual Opt-Out Modal */}
      {showOptOutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Manual Opt-Out</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOptOutModal(false)}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  placeholder="Enter phone number (e.g., +12125551234)"
                  value={optOutPhoneNumber}
                  onChange={(e) => setOptOutPhoneNumber(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Reason</label>
                <Textarea
                  placeholder="Optional: Reason for opt-out"
                  value={optOutReason}
                  onChange={(e) => setOptOutReason(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowOptOutModal(false)}
                disabled={addOptOutMutation.isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProcessManualOptOut}
                disabled={addOptOutMutation.isLoading}
              >
                {addOptOutMutation.isLoading ? 'Processing...' : 'Process Opt-Out'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Opt-Out Dialog */}
      <BulkOptOutDialog
        open={showBulkOptOutModal}
        onOpenChange={setShowBulkOptOutModal}
        onComplete={() => {
          refetchOptOuts()
        }}
      />
    </div>
  )
}
