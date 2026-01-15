import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Send, MessageSquare, TrendingUp, Phone, AlertTriangle } from 'lucide-react'
import { MetricsGrid, defaultMetrics } from '@/components/dashboard/MetricsGrid'
import { ActivityFeed, defaultActivities } from '@/components/dashboard/ActivityFeed'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { useDashboardMetrics, useActiveCampaigns } from '@/hooks/use-api'
import { useDashboardWebSocket } from '@/hooks/use-websocket'

const toChangeType = (value?: string) => {
  if (!value) return 'neutral' as const
  return value.startsWith('+') ? 'increase' as const : value.startsWith('-') ? 'decrease' as const : 'neutral' as const
}

const toStatus = (value: 'success' | 'warning' | 'error' | 'neutral') => value

// Transform API data to metrics format
const transformMetricsData = (data: any) => {
  if (!data) return defaultMetrics

  // Handle both snake_case (from WebSocket) and camelCase (from API) fields
  const totalLeads = data.totalLeads || data.total_leads
  const activeCampaigns = data.activeCampaigns || data.active_campaigns
  const messagesToday = data.messagesToday || data.messages_today
  const deliveryRate = data.deliveryRate || data.delivery_rate
  const replyRate = data.replyRate || data.reply_rate
  const phoneHealth = data.phoneHealth || data.phone_health
  const leadsChange = data.leadsChange || data.leads_change
  const campaignsChange = data.campaignsChange || data.campaigns_change
  const messagesChange = data.messagesChange || data.messages_change
  const deliveryChange = data.deliveryChange || data.delivery_change
  const replyChange = data.replyChange || data.reply_change
  const phoneHealthChange = data.phoneHealthChange || data.phone_health_change

  return [
    {
      title: 'Total Leads',
      value: totalLeads || 12847,
      change: leadsChange || '+12%',
      changeType: toChangeType(leadsChange),
      subtitle: 'All time',
      icon: Users,
      status: toStatus('success')
    },
    {
      title: 'Active Campaigns',
      value: activeCampaigns || 3,
      change: campaignsChange || '+1',
      changeType: 'increase' as const,
      subtitle: 'Currently running',
      icon: Send,
      status: toStatus('success')
    },
    {
      title: 'Messages Today',
      value: messagesToday || 2156,
      change: messagesChange || '+23%',
      changeType: toChangeType(messagesChange),
      subtitle: 'Sent today',
      icon: MessageSquare,
      status: toStatus(messagesChange?.startsWith('-') ? 'warning' : 'success')
    },
    {
      title: 'Delivery Rate',
      value: `${deliveryRate || 94.2}%`,
      change: deliveryChange || '-2%',
      changeType: toChangeType(deliveryChange),
      subtitle: 'Last 24 hours',
      icon: TrendingUp,
      status: toStatus((deliveryRate || 94.2) < 90 ? 'warning' : 'success')
    },
    {
      title: 'Reply Rate',
      value: `${replyRate || 18.5}%`,
      change: replyChange || '+1.2%',
      changeType: 'increase' as const,
      subtitle: 'Last 7 days',
      icon: MessageSquare,
      status: toStatus('success')
    },
    {
      title: 'Phone Health',
      value: `${phoneHealth || 98}%`,
      change: phoneHealthChange || '+0%',
      changeType: 'neutral' as const,
      subtitle: 'Average score',
      icon: Phone,
      status: toStatus((phoneHealth || 98) < 85 ? 'error' : 'success')
    }
  ]
}

export function DashboardPage() {
  // Fetch data with React Query hooks
  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useDashboardMetrics()
  const { data: activeCampaigns, isLoading: campaignsLoading } = useActiveCampaigns()
  
  // Real-time WebSocket connection
  const { data: liveData, isConnected } = useDashboardWebSocket()
  
  // Transform metrics data
  const metrics = transformMetricsData(liveData || metricsData)
  
  // Show loading state on first load
  if (metricsLoading && !metricsData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Loading your SMS marketing performance...
          </p>
        </div>
        <MetricsGrid metrics={defaultMetrics} isLoading={true} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your SMS marketing performance
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {isConnected && (
            <div className="flex items-center text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Live
            </div>
          )}
          {Boolean(metricsError) && (
            <div className="flex items-center text-sm text-red-600">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Connection Error
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Metrics Grid */}
      <MetricsGrid 
        metrics={metrics} 
        isLoading={metricsLoading && !metricsData} 
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Active Campaigns</CardTitle>
            <CardDescription>
              Recent campaign performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {campaignsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : activeCampaigns && activeCampaigns.length > 0 ? (
              <div className="space-y-4">
                {activeCampaigns.slice(0, 5).map((campaign: any) => (
                  <div key={campaign.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {campaign.stats?.messages_sent || 0} sent • {campaign.stats?.messages_delivered || 0} delivered • {campaign.stats?.replies_received || 0} replies
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      campaign.status === 'running'
                        ? 'bg-green-100 text-green-800'
                        : campaign.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No active campaigns</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <ActivityFeed 
          activities={liveData?.activities || defaultActivities}
          isLoading={false}
        />

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </div>
  )
}
