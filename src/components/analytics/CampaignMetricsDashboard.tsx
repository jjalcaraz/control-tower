import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  Target,
  MessageSquare,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Download
} from 'lucide-react'
import { analyticsService } from '@/lib/analytics-service'
import { Campaign, Lead } from '@/types'

interface MetricsOverview {
  totalCampaigns: number
  activeCampaigns: number
  totalMessagesSent: number
  totalResponses: number
  avgResponseRate: number
  totalLeadsGenerated: number
  conversionRate: number
  totalRevenue: number
  avgRevenuePerLead: number
  costPerLead: number
  roi: number
  complianceScore: number
}

interface CampaignAnalytics {
  campaignId: string
  name: string
  status: string
  messagesSent: number
  responses: number
  responseRate: number
  leadsGenerated: number
  conversions: number
  conversionRate: number
  revenue: number
  cost: number
  roi: number
  sentiment: number
  complianceIssues: number
  abTestWinner?: string
  predictedPerformance: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export function CampaignMetricsDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d')
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all')
  const [metricsData, setMetricsData] = useState<MetricsOverview | null>(null)
  const [campaignAnalytics, setCampaignAnalytics] = useState<CampaignAnalytics[]>([])
  const [trendData, setTrendData] = useState<any[]>([])
  const [anomalies, setAnomalies] = useState<any[]>([])

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: () => fetch('/api/campaigns').then(res => res.json())
  })

  const { data: leads } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => fetch('/api/leads').then(res => res.json())
  })

  useEffect(() => {
    if (campaigns && leads) {
      loadAnalytics()
    }
  }, [campaigns, leads, selectedTimeframe, selectedCampaign])

  const loadAnalytics = async () => {
    if (!campaigns || !leads) return

    const endDate = new Date()
    const startDate = new Date()
    
    switch (selectedTimeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
    }

    const filteredCampaigns = selectedCampaign === 'all' 
      ? campaigns 
      : campaigns.filter(c => c.id === selectedCampaign)

    const metrics = await analyticsService.getOverallMetrics(
      filteredCampaigns,
      leads,
      startDate,
      endDate
    )

    const analytics = await Promise.all(
      filteredCampaigns.map(async (campaign) => {
        const campaignLeads = leads.filter(l => l.campaignId === campaign.id)
        const analysis = await analyticsService.getCampaignAnalytics(
          campaign,
          campaignLeads,
          startDate,
          endDate
        )
        return {
          campaignId: campaign.id,
          name: campaign.name,
          status: campaign.status,
          ...analysis
        }
      })
    )

    const trends = await analyticsService.getTrendAnalysis(
      filteredCampaigns,
      leads,
      startDate,
      endDate
    )

    const detectedAnomalies = await analyticsService.detectAnomalies(
      filteredCampaigns,
      leads,
      startDate,
      endDate
    )

    setMetricsData(metrics)
    setCampaignAnalytics(analytics)
    setTrendData(trends.dailyMetrics)
    setAnomalies(detectedAnomalies)
  }

  const exportReport = () => {
    if (!metricsData || !campaignAnalytics.length) return

    const report = {
      timeframe: selectedTimeframe,
      generatedAt: new Date().toISOString(),
      overview: metricsData,
      campaigns: campaignAnalytics,
      trends: trendData,
      anomalies: anomalies
    }

    const dataStr = JSON.stringify(report, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `campaign-metrics-${selectedTimeframe}-${new Date().toISOString().split('T')[0]}.json`
    link.click()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'completed': return 'bg-blue-500'
      case 'draft': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getPerformanceColor = (value: number, threshold: number) => {
    if (value >= threshold * 1.2) return 'text-green-600'
    if (value >= threshold) return 'text-blue-600'
    if (value >= threshold * 0.8) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (!metricsData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaign Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive performance metrics and insights
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns?.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={exportReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metricsData.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              ROI: {(metricsData.roi * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metricsData.avgResponseRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metricsData.totalResponses} responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metricsData.conversionRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metricsData.totalLeadsGenerated} leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metricsData.complianceScore * 100).toFixed(0)}%
            </div>
            <Progress value={metricsData.complianceScore * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Anomaly Alerts */}
      {anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Anomaly Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {anomalies.map((anomaly, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div>
                    <p className="font-medium">{anomaly.metric}</p>
                    <p className="text-sm text-muted-foreground">{anomaly.description}</p>
                  </div>
                  <Badge variant={anomaly.severity === 'high' ? 'destructive' : 'secondary'}>
                    {anomaly.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="responseRate" 
                      stroke="#8884d8" 
                      name="Response Rate (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue ($)" />
                    <Bar dataKey="cost" fill="#82ca9d" name="Cost ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <ResponsiveContainer width={400} height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: metricsData.activeCampaigns },
                        { name: 'Inactive', value: metricsData.totalCampaigns - metricsData.activeCampaigns }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label
                    >
                      {[
                        { name: 'Active', value: metricsData.activeCampaigns },
                        { name: 'Inactive', value: metricsData.totalCampaigns - metricsData.activeCampaigns }
                      ].map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Metric Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="messagesSent" 
                    stroke="#8884d8" 
                    name="Messages Sent"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="responses" 
                    stroke="#82ca9d" 
                    name="Responses"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="conversions" 
                    stroke="#ffc658" 
                    name="Conversions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { stage: 'Messages Sent', value: metricsData.totalMessagesSent, percentage: 100 },
                    { stage: 'Responses', value: metricsData.totalResponses, percentage: (metricsData.totalResponses / metricsData.totalMessagesSent) * 100 },
                    { stage: 'Leads', value: metricsData.totalLeadsGenerated, percentage: (metricsData.totalLeadsGenerated / metricsData.totalMessagesSent) * 100 }
                  ]}
                  layout="horizontal"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="stage" type="category" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Individual Campaign Performance</CardTitle>
              <CardDescription>
                Detailed metrics for each campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaignAnalytics.map((campaign) => (
                  <div key={campaign.campaignId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(campaign.status)}`} />
                        <h3 className="font-semibold">{campaign.name}</h3>
                        <Badge variant="outline">{campaign.status}</Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        {campaign.abTestWinner && (
                          <Badge variant="secondary">A/B Winner: {campaign.abTestWinner}</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Messages</p>
                        <p className="text-lg font-semibold">{campaign.messagesSent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Response Rate</p>
                        <p className={`text-lg font-semibold ${getPerformanceColor(campaign.responseRate, 0.15)}`}>
                          {(campaign.responseRate * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Conversions</p>
                        <p className="text-lg font-semibold">{campaign.conversions}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                        <p className="text-lg font-semibold">${campaign.revenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">ROI</p>
                        <p className={`text-lg font-semibold ${getPerformanceColor(campaign.roi, 2)}`}>
                          {(campaign.roi * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Sentiment</p>
                        <p className="text-lg font-semibold">{(campaign.sentiment * 100).toFixed(0)}%</p>
                      </div>
                    </div>

                    {campaign.complianceIssues > 0 && (
                      <div className="mt-3 p-2 bg-red-50 rounded border-l-4 border-red-400">
                        <p className="text-sm text-red-700">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          {campaign.complianceIssues} compliance issue(s) detected
                        </p>
                      </div>
                    )}

                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Predicted Performance</span>
                        <span className="text-sm font-medium">
                          {(campaign.predictedPerformance * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={campaign.predictedPerformance * 100} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                  <h4 className="font-semibold text-green-800">Top Performing</h4>
                  <p className="text-sm text-green-700">
                    Campaign with highest ROI: {campaignAnalytics
                      .sort((a, b) => b.roi - a.roi)[0]?.name || 'N/A'}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <h4 className="font-semibold text-blue-800">Opportunity</h4>
                  <p className="text-sm text-blue-700">
                    Average cost per lead: ${metricsData.costPerLead.toFixed(2)}
                  </p>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                  <h4 className="font-semibold text-amber-800">Attention Needed</h4>
                  <p className="text-sm text-amber-700">
                    {campaignAnalytics.filter(c => c.complianceIssues > 0).length} campaign(s) 
                    have compliance issues
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Optimization Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {metricsData.avgResponseRate < 0.15 && (
                  <div className="p-3 bg-orange-50 rounded border">
                    <p className="text-sm font-medium">Improve Response Rates</p>
                    <p className="text-xs text-muted-foreground">
                      Consider A/B testing message content or send timing
                    </p>
                  </div>
                )}
                
                {metricsData.roi < 2 && (
                  <div className="p-3 bg-orange-50 rounded border">
                    <p className="text-sm font-medium">Optimize ROI</p>
                    <p className="text-xs text-muted-foreground">
                      Review high-cost campaigns and reduce spending on low performers
                    </p>
                  </div>
                )}

                {metricsData.complianceScore < 0.9 && (
                  <div className="p-3 bg-red-50 rounded border">
                    <p className="text-sm font-medium">Address Compliance</p>
                    <p className="text-xs text-muted-foreground">
                      Review and fix compliance issues to avoid penalties
                    </p>
                  </div>
                )}

                <div className="p-3 bg-green-50 rounded border">
                  <p className="text-sm font-medium">Best Practice</p>
                  <p className="text-xs text-muted-foreground">
                    Continue monitoring daily metrics for early anomaly detection
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}