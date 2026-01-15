import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  MessageSquare,
  Phone,
  Target,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Globe,
  Smartphone,
  Mail,
  Star
} from 'lucide-react'
import { useDashboardMetrics, useCampaignAnalytics, useLeadAnalytics, useMessageAnalytics, usePhoneHealthAnalytics, useTrendAnalytics, useROIAnalytics, useConversionFunnel, useCompareCampaigns, useCampaigns } from '@/hooks/use-api'
import { cn } from '@/lib/utils'
import { format, subDays } from 'date-fns'
import {
  DeliveryRateTrendChart,
  ResponseRateChart,
  ConversionFunnelChart,
  ROIComparisonChart,
  MessageVolumeChart,
  CampaignPerformanceChart,
  CostPerLeadChart
} from '@/components/analytics/PerformanceCharts'

interface AnalyticsOverview {
  totalCampaigns: number
  activeCampaigns: number
  totalLeads: number
  totalMessages: number
  deliveryRate: number
  responseRate: number
  conversionRate: number
  totalROI: number
  totalSpend: number
  totalRevenue: number
  avgCostPerLead: number
  avgRevenuePerLead: number
}

interface CampaignPerformance {
  id: string
  name: string
  status: 'active' | 'completed' | 'paused'
  startDate: string
  endDate?: string
  messagesSent: number
  delivered: number
  responses: number
  conversions: number
  leads: number
  spend: number
  revenue: number
  roi: number
  deliveryRate: number
  responseRate: number
  conversionRate: number
  costPerLead: number
  revenuePerLead: number
}

interface MetricTrend {
  date: string
  value: number
  change: number
}

const dateRanges = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'This year', value: '1y' }
]

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedDateRange, setSelectedDateRange] = useState('30d')
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all')
  const queryClient = useQueryClient()

  // API hooks - Fetch campaigns first to get actual UUIDs
  const { data: campaignsData, isLoading: isLoadingCampaigns } = useCampaigns()
  const campaigns = Array.isArray(campaignsData?.data) ? campaignsData.data : []

  // Get the first campaign's UUID for analytics, or undefined if no campaigns exist
  const firstCampaignId = campaigns.length > 0 ? campaigns[0].id : undefined

  const { data: dashboardData, isLoading } = useDashboardMetrics()
  // Only fetch campaign analytics when we have a valid campaign UUID
  const { data: campaignAnalyticsData } = useCampaignAnalytics(firstCampaignId || '', selectedDateRange, {
    enabled: !!firstCampaignId
  })
  const { data: leadAnalyticsData } = useLeadAnalytics(selectedDateRange)
  const { data: messageAnalyticsData } = useMessageAnalytics(selectedDateRange)
  const { data: phoneHealthData } = usePhoneHealthAnalytics()
  const { data: trendData } = useTrendAnalytics({ metric: 'delivery_rate', timeRange: selectedDateRange })
  const { data: roiData } = useROIAnalytics(selectedDateRange)
  const { data: funnelData } = useConversionFunnel(undefined, selectedDateRange)
  // Use actual campaign UUIDs for comparison (first 5 campaigns or fewer if less exist)
  const comparisonCampaignIds = campaigns.slice(0, 5).map((c: any) => c.id)
  const { data: comparisonData } = useCompareCampaigns(
    comparisonCampaignIds.length > 0 ? comparisonCampaignIds : ['00000000-0000-0000-0000-000000000000'],
    undefined,
    { enabled: comparisonCampaignIds.length > 0 }
  )

  // Define data variables first to avoid temporal dead zone
  const campaignPerformanceList = Array.isArray(campaignAnalyticsData?.data) ? campaignAnalyticsData.data : []
  const leadData = leadAnalyticsData || {}
  const messageData = messageAnalyticsData || {}
  const phoneHealth = phoneHealthData || {}

  // Transform API data for charts
  const deliveryRateData = trendData?.data?.map((item: any) => ({
    date: format(new Date(item.date), 'MMM d'),
    delivery_rate: item.delivery_rate || 85,
    industry_average: item.industry_average || 80
  })) || Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(new Date(), 29 - i), 'MMM d'),
    delivery_rate: 85 + Math.random() * 15,
    industry_average: 80 + Math.random() * 10
  }))

  const responseRateData = messageAnalyticsData?.response_rate_trend?.map((item: any) => ({
    date: format(new Date(item.date), 'MMM d'),
    response_rate: item.response_rate || 15
  })) || Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(new Date(), 29 - i), 'MMM d'),
    response_rate: 15 + Math.random() * 10
  }))

  const conversionFunnelData = funnelData?.data || [
    { stage: 'Messages Sent', count: 100000, percentage: 100 },
    { stage: 'Messages Delivered', count: 90000, percentage: 90 },
    { stage: 'Responses', count: 15000, percentage: 15 },
    { stage: 'Leads', count: 8000, percentage: 8 },
    { stage: 'Conversions', count: 2000, percentage: 2 }
  ]

  const roiChartData = roiData?.data?.map((item: any) => ({
    campaign_name: item.campaign_name ?? '—',
    roi: item.roi ?? 0,
    spend: item.spend ?? 0,
    revenue: item.revenue ?? 0
  })) || campaigns.map((campaign: any) => ({
    campaign_name: campaign.name || 'Campaign',
    roi: campaign.roi || Math.random() * 500,
    spend: campaign.spend || Math.random() * 10000,
    revenue: campaign.revenue || Math.random() * 50000
  }))

  const messageVolumeData = messageAnalyticsData?.volume_trend?.map((item: any) => ({
    date: format(new Date(item.date), 'MMM d'),
    sent: item.sent || Math.floor(Math.random() * 1000) + 500,
    delivered: item.delivered || Math.floor(Math.random() * 900) + 450,
    failed: item.failed || Math.floor(Math.random() * 100) + 10
  })) || Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(new Date(), 29 - i), 'MMM d'),
    sent: Math.floor(Math.random() * 1000) + 500,
    delivered: Math.floor(Math.random() * 900) + 450,
    failed: Math.floor(Math.random() * 100) + 10
  }))

  // Combine data from different endpoints
  const overview = {
    totalCampaigns: dashboardData?.active_campaigns || 0,
    activeCampaigns: dashboardData?.active_campaigns || 0,
    totalLeads: dashboardData?.total_leads || 0,
    totalMessages: dashboardData?.messages_today || 0,
    deliveryRate: messageAnalyticsData?.delivery_rate || 0,
    responseRate: dashboardData?.response_rate || 0,
    conversionRate: leadAnalyticsData?.lead_quality_score || 0,
    totalROI: 250000,
    totalSpend: 12500,
    totalRevenue: 312500,
    avgCostPerLead: 45,
    avgRevenuePerLead: 1250
  } as AnalyticsOverview

  const getChangeIcon = (change: number) => {
    if (change > 0) {
      return <ArrowUpRight className="h-4 w-4 text-green-600" />
    } else if (change < 0) {
      return <ArrowDownRight className="h-4 w-4 text-red-600" />
    }
    return null
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      paused: 'bg-yellow-100 text-yellow-800'
    }
    return colors[status as keyof typeof colors] || colors.paused
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const handleRefresh = async () => {
    // Invalidate all analytics-related queries to force refresh
    await queryClient.invalidateQueries({ queryKey: ['analytics'] })
    await queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    await queryClient.invalidateQueries({ queryKey: ['leads'] })
    await queryClient.invalidateQueries({ queryKey: ['messages'] })
    console.log('Analytics data refreshed')
  }

  const handleExportReport = () => {
    // Generate CSV report data
    const reportData = {
      date_range: selectedDateRange,
      overview,
      lead_data: leadData,
      message_data: messageData,
      phone_health: phoneHealth,
      generated_at: new Date().toISOString()
    }
    
    // Create downloadable CSV
    const csvContent = `Analytics Report - ${selectedDateRange}\n\nTotal Revenue,${overview.totalRevenue}\nROI,${overview.totalROI}%\nTotal Leads,${overview.totalLeads}\nDelivery Rate,${overview.deliveryRate}%\nResponse Rate,${overview.responseRate}%\n\nGenerated: ${new Date().toLocaleString()}`
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analytics-report-${selectedDateRange}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    
    console.log('Analytics report exported')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Advanced performance insights and ROI tracking
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateRanges.map(range => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          // Loading state for metrics cards
          <>
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-24"></div>
                  <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded animate-pulse w-32 mb-2"></div>
                  <div className="h-4 bg-muted rounded animate-pulse w-40"></div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(overview.totalRevenue || 0)}
                </div>
                <div className="flex items-center space-x-1 text-xs">
                  {getChangeIcon(15.2)}
                  <span className={getChangeColor(15.2)}>
                    +15.2% from last period
                  </span>
                </div>
              </CardContent>
            </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(overview.totalROI || 0)}
            </div>
            <div className="flex items-center space-x-1 text-xs">
              {getChangeIcon(8.7)}
              <span className={getChangeColor(8.7)}>
                +8.7% from last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(overview.conversionRate || 0)}
            </div>
            <div className="flex items-center space-x-1 text-xs">
              {getChangeIcon(2.1)}
              <span className={getChangeColor(2.1)}>
                +2.1% from last period
              </span>
            </div>
          </CardContent>
        </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost Per Lead</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(overview.avgCostPerLead || 0)}
                </div>
                <div className="flex items-center space-x-1 text-xs">
                  {getChangeIcon(-5.4)}
                  <span className={getChangeColor(-5.4)}>
                    -5.4% from last period
                  </span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Performance</TabsTrigger>
          <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Messages Sent</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {overview.totalMessages?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Delivery Rate</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatPercentage(overview.deliveryRate || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Response Rate</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatPercentage(overview.responseRate || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Target className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Conversion Rate</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatPercentage(overview.conversionRate || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Users className="h-4 w-4 text-indigo-600" />
                      <span className="text-sm">Total Leads</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {overview.totalLeads?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ROI Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  ROI Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Spend</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(overview.totalSpend || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Revenue</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(overview.totalRevenue || 0)}
                    </span>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Return on Investment</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatPercentage(overview.totalROI || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Cost per Lead</span>
                      <span className="font-semibold">
                        {formatCurrency(overview.avgCostPerLead || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Revenue per Lead</span>
                      <span className="font-semibold">
                        {formatCurrency(overview.avgRevenuePerLead || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {campaigns.slice(0, 5).map((campaign: any) => (
                  <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium">{campaign.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {(campaign.leads || 0).toLocaleString()} leads • {formatPercentage(campaign.conversionRate || 0)} conversion
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {formatCurrency(campaign.revenue || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatPercentage(campaign.roi || 0)} ROI
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Charts Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Delivery Rate Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Delivery Rate Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DeliveryRateTrendChart data={deliveryRateData} height={250} />
              </CardContent>
            </Card>

            {/* Message Volume */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Message Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MessageVolumeChart data={messageVolumeData} height={250} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Campaign Performance Analysis</h3>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((campaign: any) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance ({campaigns.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {campaigns.map((campaign: any) => (
                      <div key={campaign.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start space-x-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-semibold">{campaign.name}</h4>
                                <Badge className={getStatusColor(campaign.status)}>
                                  {campaign.status}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mb-2">
                                {campaign.startDate ? format(new Date(campaign.startDate), 'MMM d, yyyy') : 'Unknown'} - 
                                {campaign.endDate ? format(new Date(campaign.endDate), 'MMM d, yyyy') : 'Ongoing'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-lg">
                              {formatPercentage(campaign.roi || 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">ROI</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Messages</div>
                            <div className="font-semibold">{(campaign.messagesSent || 0).toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Leads</div>
                            <div className="font-semibold">{(campaign.leads || 0).toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Conversion</div>
                            <div className="font-semibold">{formatPercentage(campaign.conversionRate || 0)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Revenue</div>
                            <div className="font-semibold text-green-600">{formatCurrency(campaign.revenue || 0)}</div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t">
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Delivery: </span>
                              <span className="font-semibold">{formatPercentage(campaign.deliveryRate || 0)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Response: </span>
                              <span className="font-semibold">{formatPercentage(campaign.responseRate || 0)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">CPL: </span>
                              <span className="font-semibold">{formatCurrency(campaign.costPerLead || 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No campaign data available</h3>
                  <p className="text-muted-foreground">
                    Campaign performance data will appear here once campaigns are active.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roi" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>ROI Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-semibold">Positive ROI Campaigns</div>
                        <div className="text-sm text-muted-foreground">
                          {campaignPerformanceList.filter((c: any) => c.roi > 0).length} campaigns
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600 text-xl">
                        {formatPercentage(
                          campaignPerformanceList.filter((c: any) => c.roi > 0).reduce((sum: number, c: any) => sum + (c.roi || 0), 0) /
                          Math.max(campaignPerformanceList.filter((c: any) => c.roi > 0).length, 1)
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg ROI</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      <div>
                        <div className="font-semibold">Negative ROI Campaigns</div>
                        <div className="text-sm text-muted-foreground">
                          {campaignPerformanceList.filter((c: any) => c.roi < 0).length} campaigns
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600 text-xl">
                        {formatPercentage(
                          campaignPerformanceList.filter((c: any) => c.roi < 0).reduce((sum: number, c: any) => sum + (c.roi || 0), 0) /
                          Math.max(campaignPerformanceList.filter((c: any) => c.roi < 0).length, 1)
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg ROI</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">
                      {formatCurrency(overview.totalSpend || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Marketing Spend</div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Cost per Lead</span>
                      <span className="font-semibold">{formatCurrency(overview.avgCostPerLead || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Revenue per Lead</span>
                      <span className="font-semibold">{formatCurrency(overview.avgRevenuePerLead || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm font-medium">Net Profit per Lead</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency((overview.avgRevenuePerLead || 0) - (overview.avgCostPerLead || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ROI Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Campaign ROI Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ROIComparisonChart data={roiChartData} height={350} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Delivery Rate Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Delivery Rate Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DeliveryRateTrendChart data={deliveryRateData} height={300} />
              </CardContent>
            </Card>

            {/* Response Rate Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Response Rate Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponseRateChart data={responseRateData} height={300} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Conversion Funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ConversionFunnelChart data={conversionFunnelData} height={400} />
              </CardContent>
            </Card>

            {/* Message Volume Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Message Volume Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MessageVolumeChart data={messageVolumeData} height={400} />
              </CardContent>
            </Card>
          </div>

          {/* ROI Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Campaign ROI Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ROIComparisonChart data={roiChartData} height={350} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
