import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  FileText, 
  Target,
  TrendingUp,
  Users,
  MessageSquare,
  DollarSign
} from 'lucide-react'
import { analyticsService } from '@/lib/analytics-service'
import { Campaign, Lead } from '@/types'

interface ReportConfig {
  title: string
  description: string
  timeframe: string
  campaigns: string[]
  metrics: string[]
  groupBy: string
  format: 'pdf' | 'csv' | 'excel' | 'json'
  includeCharts: boolean
  includeRawData: boolean
  includeTrends: boolean
  includeInsights: boolean
  scheduled: boolean
  scheduleFrequency?: string
  recipients?: string[]
}

const AVAILABLE_METRICS = [
  { id: 'messages_sent', label: 'Messages Sent', icon: MessageSquare },
  { id: 'response_rate', label: 'Response Rate', icon: TrendingUp },
  { id: 'conversion_rate', label: 'Conversion Rate', icon: Target },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
  { id: 'cost_per_lead', label: 'Cost Per Lead', icon: DollarSign },
  { id: 'roi', label: 'Return on Investment', icon: TrendingUp },
  { id: 'lead_volume', label: 'Lead Volume', icon: Users },
  { id: 'compliance_score', label: 'Compliance Score', icon: Target },
  { id: 'sentiment_analysis', label: 'Sentiment Analysis', icon: MessageSquare },
  { id: 'opt_out_rate', label: 'Opt-out Rate', icon: Users }
]

const REPORT_TEMPLATES = [
  {
    id: 'executive_summary',
    name: 'Executive Summary',
    description: 'High-level KPIs and performance overview',
    defaultMetrics: ['revenue', 'roi', 'conversion_rate', 'compliance_score'],
    includeCharts: true,
    includeInsights: true
  },
  {
    id: 'campaign_performance',
    name: 'Campaign Performance',
    description: 'Detailed analysis of individual campaign performance',
    defaultMetrics: ['messages_sent', 'response_rate', 'conversion_rate', 'cost_per_lead'],
    includeCharts: true,
    includeTrends: true
  },
  {
    id: 'compliance_report',
    name: 'Compliance Report',
    description: 'TCPA compliance metrics and audit trail',
    defaultMetrics: ['compliance_score', 'opt_out_rate', 'consent_tracking'],
    includeRawData: true,
    includeInsights: true
  },
  {
    id: 'roi_analysis',
    name: 'ROI Analysis',
    description: 'Revenue, cost, and profitability analysis',
    defaultMetrics: ['revenue', 'cost_per_lead', 'roi', 'lead_volume'],
    includeCharts: true,
    includeTrends: true
  }
]

export function AdvancedReporting() {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    title: '',
    description: '',
    timeframe: '30d',
    campaigns: [],
    metrics: [],
    groupBy: 'campaign',
    format: 'pdf',
    includeCharts: true,
    includeRawData: false,
    includeTrends: false,
    includeInsights: false,
    scheduled: false
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: () => fetch('/api/campaigns').then(res => res.json())
  })

  const { data: leads } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => fetch('/api/leads').then(res => res.json())
  })

  const applyTemplate = (templateId: string) => {
    const template = REPORT_TEMPLATES.find(t => t.id === templateId)
    if (!template) return

    setReportConfig(prev => ({
      ...prev,
      title: template.name,
      description: template.description,
      metrics: template.defaultMetrics,
      includeCharts: template.includeCharts || false,
      includeRawData: template.includeRawData || false,
      includeTrends: template.includeTrends || false,
      includeInsights: template.includeInsights || false
    }))
    setSelectedTemplate(templateId)
  }

  const generateReport = async () => {
    if (!campaigns || !leads || reportConfig.metrics.length === 0) return

    setIsGenerating(true)
    
    try {
      const endDate = new Date()
      const startDate = new Date()
      
      switch (reportConfig.timeframe) {
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

      const filteredCampaigns = reportConfig.campaigns.length > 0
        ? campaigns.filter(c => reportConfig.campaigns.includes(c.id))
        : campaigns

      const reportData: any = {
        metadata: {
          title: reportConfig.title,
          description: reportConfig.description,
          generatedAt: new Date().toISOString(),
          timeframe: reportConfig.timeframe,
          period: { startDate, endDate }
        }
      }

      if (reportConfig.metrics.includes('messages_sent') || 
          reportConfig.metrics.includes('response_rate') ||
          reportConfig.metrics.includes('conversion_rate')) {
        const overallMetrics = await analyticsService.getOverallMetrics(
          filteredCampaigns, leads, startDate, endDate
        )
        reportData.overallMetrics = overallMetrics
      }

      if (reportConfig.groupBy === 'campaign') {
        const campaignAnalytics = await Promise.all(
          filteredCampaigns.map(async (campaign) => {
            const campaignLeads = leads.filter(l => l.campaignId === campaign.id)
            const analytics = await analyticsService.getCampaignAnalytics(
              campaign, campaignLeads, startDate, endDate
            )
            return { campaign, analytics }
          })
        )
        reportData.campaignAnalytics = campaignAnalytics
      }

      if (reportConfig.includeTrends) {
        const trends = await analyticsService.getTrendAnalysis(
          filteredCampaigns, leads, startDate, endDate
        )
        reportData.trends = trends
      }

      if (reportConfig.includeInsights) {
        const insights = await analyticsService.generateInsights(
          filteredCampaigns, leads, startDate, endDate
        )
        reportData.insights = insights
      }

      if (reportConfig.includeRawData) {
        reportData.rawData = {
          campaigns: filteredCampaigns,
          leads: leads.filter(l =>
            reportConfig.campaigns.length === 0 ||
            (l.campaignId && reportConfig.campaigns.includes(l.campaignId))
          )
        }
      }

      await downloadReport(reportData)

      if (reportConfig.scheduled) {
        await scheduleReport(reportConfig)
      }
      
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadReport = async (data: any) => {
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `${reportConfig.title.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`

    switch (reportConfig.format) {
      case 'json':
        const jsonStr = JSON.stringify(data, null, 2)
        const jsonBlob = new Blob([jsonStr], { type: 'application/json' })
        downloadBlob(jsonBlob, `${filename}.json`)
        break

      case 'csv':
        const csvData = convertToCSV(data)
        const csvBlob = new Blob([csvData], { type: 'text/csv' })
        downloadBlob(csvBlob, `${filename}.csv`)
        break

      case 'excel':
        const excelBlob = await convertToExcel(data)
        downloadBlob(excelBlob, `${filename}.xlsx`)
        break

      case 'pdf':
        const pdfBlob = await convertToPDF(data)
        downloadBlob(pdfBlob, `${filename}.pdf`)
        break
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const convertToCSV = (data: any): string => {
    const rows: string[] = []
    
    if (data.campaignAnalytics) {
      rows.push('Campaign,Messages Sent,Response Rate,Conversion Rate,Revenue,ROI')
      data.campaignAnalytics.forEach((item: any) => {
        rows.push([
          item.campaign.name,
          item.analytics.messagesSent,
          (item.analytics.responseRate * 100).toFixed(2) + '%',
          (item.analytics.conversionRate * 100).toFixed(2) + '%',
          '$' + item.analytics.revenue.toFixed(2),
          (item.analytics.roi * 100).toFixed(2) + '%'
        ].join(','))
      })
    }

    if (data.trends?.dailyMetrics) {
      rows.push('\nDaily Trends')
      rows.push('Date,Messages,Responses,Conversions,Revenue')
      data.trends.dailyMetrics.forEach((item: any) => {
        rows.push([
          item.date,
          item.messagesSent || 0,
          item.responses || 0,
          item.conversions || 0,
          '$' + (item.revenue || 0).toFixed(2)
        ].join(','))
      })
    }

    return rows.join('\n')
  }

  const convertToExcel = async (data: any): Promise<Blob> => {
    const worksheets: any[] = []
    
    if (data.overallMetrics) {
      worksheets.push({
        name: 'Overview',
        data: [
          ['Metric', 'Value'],
          ['Total Campaigns', data.overallMetrics.totalCampaigns],
          ['Active Campaigns', data.overallMetrics.activeCampaigns],
          ['Messages Sent', data.overallMetrics.totalMessagesSent],
          ['Response Rate', (data.overallMetrics.avgResponseRate * 100).toFixed(2) + '%'],
          ['Conversion Rate', (data.overallMetrics.conversionRate * 100).toFixed(2) + '%'],
          ['Total Revenue', '$' + data.overallMetrics.totalRevenue.toFixed(2)],
          ['ROI', (data.overallMetrics.roi * 100).toFixed(2) + '%']
        ]
      })
    }

    if (data.campaignAnalytics) {
      worksheets.push({
        name: 'Campaign Details',
        data: [
          ['Campaign', 'Status', 'Messages', 'Response Rate', 'Conversions', 'Revenue', 'ROI'],
          ...data.campaignAnalytics.map((item: any) => [
            item.campaign.name,
            item.campaign.status,
            item.analytics.messagesSent,
            (item.analytics.responseRate * 100).toFixed(2) + '%',
            item.analytics.conversions,
            '$' + item.analytics.revenue.toFixed(2),
            (item.analytics.roi * 100).toFixed(2) + '%'
          ])
        ]
      })
    }

    return new Blob([JSON.stringify(worksheets)], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
  }

  const convertToPDF = async (data: any): Promise<Blob> => {
    const htmlContent = generateHTMLReport(data)
    
    const pdfContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; border-bottom: 2px solid #333; }
            h2 { color: #666; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
            th { background-color: #f5f5f5; }
            .metric { display: inline-block; margin: 10px; padding: 15px; background: #f9f9f9; border-radius: 5px; }
            .chart-placeholder { width: 100%; height: 200px; background: #f0f0f0; border: 1px dashed #ccc; margin: 20px 0; display: flex; align-items: center; justify-content: center; }
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `
    
    return new Blob([pdfContent], { type: 'text/html' })
  }

  const generateHTMLReport = (data: any): string => {
    let html = `<h1>${reportConfig.title}</h1>`
    
    if (reportConfig.description) {
      html += `<p><em>${reportConfig.description}</em></p>`
    }

    html += `<p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>`
    html += `<p><strong>Period:</strong> ${reportConfig.timeframe}</p>`

    if (data.overallMetrics) {
      html += '<h2>Key Metrics</h2>'
      html += '<div>'
      html += `<div class="metric"><strong>Revenue:</strong> $${data.overallMetrics.totalRevenue.toLocaleString()}</div>`
      html += `<div class="metric"><strong>ROI:</strong> ${(data.overallMetrics.roi * 100).toFixed(1)}%</div>`
      html += `<div class="metric"><strong>Response Rate:</strong> ${(data.overallMetrics.avgResponseRate * 100).toFixed(1)}%</div>`
      html += `<div class="metric"><strong>Conversion Rate:</strong> ${(data.overallMetrics.conversionRate * 100).toFixed(1)}%</div>`
      html += '</div>'
    }

    if (reportConfig.includeCharts) {
      html += '<h2>Performance Charts</h2>'
      html += '<div class="chart-placeholder">Campaign Performance Chart (would be rendered here)</div>'
      html += '<div class="chart-placeholder">Trend Analysis Chart (would be rendered here)</div>'
    }

    if (data.campaignAnalytics) {
      html += '<h2>Campaign Performance</h2>'
      html += '<table>'
      html += '<tr><th>Campaign</th><th>Messages</th><th>Response Rate</th><th>Revenue</th><th>ROI</th></tr>'
      data.campaignAnalytics.forEach((item: any) => {
        html += `<tr>
          <td>${item.campaign.name}</td>
          <td>${item.analytics.messagesSent.toLocaleString()}</td>
          <td>${(item.analytics.responseRate * 100).toFixed(1)}%</td>
          <td>$${item.analytics.revenue.toLocaleString()}</td>
          <td>${(item.analytics.roi * 100).toFixed(1)}%</td>
        </tr>`
      })
      html += '</table>'
    }

    if (data.insights && reportConfig.includeInsights) {
      html += '<h2>Key Insights</h2>'
      html += '<ul>'
      data.insights.forEach((insight: any) => {
        html += `<li><strong>${insight.category}:</strong> ${insight.description}</li>`
      })
      html += '</ul>'
    }

    return html
  }

  const scheduleReport = async (config: ReportConfig) => {
    try {
      await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
    } catch (error) {
      console.error('Error scheduling report:', error)
    }
  }

  const updateConfig = (field: keyof ReportConfig, value: any) => {
    setReportConfig(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Advanced Reporting</h2>
          <p className="text-muted-foreground">
            Create custom reports with detailed analytics and insights
          </p>
        </div>
        <Button 
          onClick={generateReport} 
          disabled={isGenerating || reportConfig.metrics.length === 0}
          size="lg"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Report Details</CardTitle>
                <CardDescription>Basic information about your report</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Report Title</Label>
                  <input
                    id="title"
                    type="text"
                    placeholder="Enter report title"
                    value={reportConfig.title}
                    onChange={(e) => updateConfig('title', e.target.value)}
                    className="w-full p-2 border rounded-md mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    placeholder="Brief description of the report"
                    value={reportConfig.description}
                    onChange={(e) => updateConfig('description', e.target.value)}
                    className="w-full p-2 border rounded-md mt-1 h-20 resize-none"
                  />
                </div>

                <div>
                  <Label>Time Frame</Label>
                  <Select value={reportConfig.timeframe} onValueChange={(value) => updateConfig('timeframe', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="1y">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Output Format</Label>
                  <Select value={reportConfig.format} onValueChange={(value: 'pdf' | 'csv' | 'excel' | 'json') => updateConfig('format', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                      <SelectItem value="csv">CSV File</SelectItem>
                      <SelectItem value="json">JSON Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Selection</CardTitle>
                <CardDescription>Choose campaigns and metrics to include</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Campaigns</Label>
                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="all-campaigns"
                        checked={reportConfig.campaigns.length === 0}
                        onCheckedChange={(checked: boolean) => {
                          updateConfig('campaigns', checked ? [] : campaigns?.map(c => c.id) || [])
                        }}
                      />
                      <Label htmlFor="all-campaigns" className="font-medium">All Campaigns</Label>
                    </div>
                    {campaigns?.map((campaign) => (
                      <div key={campaign.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`campaign-${campaign.id}`}
                          checked={reportConfig.campaigns.includes(campaign.id)}
                          onCheckedChange={(checked: boolean) => {
                            const updated = checked
                              ? [...reportConfig.campaigns, campaign.id]
                              : reportConfig.campaigns.filter(id => id !== campaign.id)
                            updateConfig('campaigns', updated)
                          }}
                        />
                        <Label htmlFor={`campaign-${campaign.id}`} className="text-sm">
                          {campaign.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Group By</Label>
                  <Select value={reportConfig.groupBy} onValueChange={(value) => updateConfig('groupBy', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="campaign">Campaign</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Metrics</CardTitle>
              <CardDescription>Select which metrics to include in the report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {AVAILABLE_METRICS.map((metric) => (
                  <div key={metric.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={metric.id}
                      checked={reportConfig.metrics.includes(metric.id)}
                      onCheckedChange={(checked: boolean) => {
                        const updated = checked
                          ? [...reportConfig.metrics, metric.id]
                          : reportConfig.metrics.filter(m => m !== metric.id)
                        updateConfig('metrics', updated)
                      }}
                    />
                    <Label htmlFor={metric.id} className="text-sm flex items-center">
                      <metric.icon className="h-3 w-3 mr-1" />
                      {metric.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report Options</CardTitle>
              <CardDescription>Additional content and formatting options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-charts"
                    checked={reportConfig.includeCharts}
                    onCheckedChange={(checked) => updateConfig('includeCharts', checked)}
                  />
                  <Label htmlFor="include-charts">Include charts and visualizations</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-trends"
                    checked={reportConfig.includeTrends}
                    onCheckedChange={(checked) => updateConfig('includeTrends', checked)}
                  />
                  <Label htmlFor="include-trends">Include trend analysis</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-insights"
                    checked={reportConfig.includeInsights}
                    onCheckedChange={(checked) => updateConfig('includeInsights', checked)}
                  />
                  <Label htmlFor="include-insights">Include AI-generated insights</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-raw-data"
                    checked={reportConfig.includeRawData}
                    onCheckedChange={(checked) => updateConfig('includeRawData', checked)}
                  />
                  <Label htmlFor="include-raw-data">Include raw data</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Templates</CardTitle>
              <CardDescription>Use pre-configured templates to quickly create reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REPORT_TEMPLATES.map((template) => (
                  <Card 
                    key={template.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedTemplate === template.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => applyTemplate(template.id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {template.defaultMetrics.map((metricId) => {
                          const metric = AVAILABLE_METRICS.find(m => m.id === metricId)
                          return (
                            <Badge key={metricId} variant="secondary" className="text-xs">
                              {metric?.label || metricId}
                            </Badge>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>Automate report generation and delivery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="schedule-report"
                  checked={reportConfig.scheduled}
                  onCheckedChange={(checked) => updateConfig('scheduled', checked)}
                />
                <Label htmlFor="schedule-report">Schedule this report</Label>
              </div>

              {reportConfig.scheduled && (
                <>
                  <div>
                    <Label>Frequency</Label>
                    <Select 
                      value={reportConfig.scheduleFrequency} 
                      onValueChange={(value) => updateConfig('scheduleFrequency', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="recipients">Email Recipients</Label>
                    <textarea
                      id="recipients"
                      placeholder="Enter email addresses, separated by commas"
                      value={reportConfig.recipients?.join(', ') || ''}
                      onChange={(e) => updateConfig('recipients', e.target.value.split(',').map(email => email.trim()))}
                      className="w-full p-2 border rounded-md mt-1 h-20 resize-none"
                    />
                  </div>
                </>
              )}

              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Active Scheduled Reports</h4>
                <div className="text-sm text-muted-foreground">
                  No scheduled reports configured yet. Create your first scheduled report above.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report History</CardTitle>
              <CardDescription>View and download previously generated reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No reports have been generated yet.</p>
                <p className="text-sm">Generated reports will appear here for easy access.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}