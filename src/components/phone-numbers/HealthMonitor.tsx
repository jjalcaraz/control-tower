import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  WifiOff,
  Clock,
  MessageSquare,
  BarChart3
} from 'lucide-react'
import { usePhoneNumbers, usePhoneNumberHealth } from '@/hooks/use-api'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface HealthMetric {
  id: string
  phoneId: string
  phoneNumber: string
  healthScore: number
  status: 'healthy' | 'warning' | 'critical' | 'offline'
  lastCheck: string
  metrics: {
    deliveryRate: number
    responseRate: number
    spamScore: number
    carrierReputation: number
    dailyVolume: number
    volumeUtilization: number
  }
  issues: Array<{
    type: 'warning' | 'error' | 'info'
    message: string
    timestamp: string
  }>
  trend: {
    direction: 'up' | 'down' | 'stable'
    change: number
  }
}

export function HealthMonitor() {
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<string>('24h')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { data: phoneNumbersData } = usePhoneNumbers()

  const phoneNumbers = (phoneNumbersData?.data || []) as any[]

  // Get health data for each phone number
  const phoneIds = selectedPhoneId === 'all'
    ? phoneNumbers.map(p => p.id)
    : [selectedPhoneId]

  // Use individual health queries for each phone number
  const healthQueries = phoneIds.map(phoneId => {
    const phoneIdValue = typeof phoneId === 'string' ? phoneId : phoneId.toString()
    return {
      phoneId: phoneIdValue,
      ...usePhoneNumberHealth(parseInt(phoneIdValue, 10), {
      enabled: !!phoneId,
      refetchInterval: 30000 // Refetch every 30 seconds for real-time updates
      })
    }
  })

  const allHealthData = healthQueries.map(q => q.data).filter(Boolean)

  // Transform API data to our component format
  const healthMetrics: HealthMetric[] = phoneNumbers
    .filter(phone => selectedPhoneId === 'all' || phone.id === selectedPhoneId)
    .map(phone => {
      const phoneIdValue = phone.id?.toString()
      const healthData = allHealthData.find(h => h.phoneId === phoneIdValue)

      return {
        id: `health-${phone.id}`,
        phoneId: phoneIdValue,
        phoneNumber: phone.number || phone.phone_number,
        healthScore: healthData?.healthScore || phone.health_score || 0,
        status: healthData?.status || (
          (phone.health_score || 0) > 80 ? 'healthy' :
          (phone.health_score || 0) > 60 ? 'warning' : 'critical'
        ),
        lastCheck: healthData?.lastCheck || new Date().toISOString(),
        metrics: {
          deliveryRate: healthData?.metrics?.deliveryRate || 95,
          responseRate: healthData?.metrics?.responseRate || 20,
          spamScore: healthData?.metrics?.spamScore || 1,
          carrierReputation: healthData?.metrics?.carrierReputation || 90,
          dailyVolume: healthData?.metrics?.dailyVolume || phone.messages_sent_today || 0,
          volumeUtilization: healthData?.metrics?.volumeUtilization ||
            ((phone.messages_sent_today || 0) / Math.max(1, phone.daily_limit || 1000)) * 100
        },
        issues: healthData?.issues || phone.issues || [],
        trend: healthData?.trend || {
          direction: 'stable',
          change: 0
        }
      }
    })

  const filteredMetrics = healthMetrics

  const getStatusColor = (status: string) => {
    const colors = {
      healthy: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      critical: 'bg-red-100 text-red-800 border-red-200',
      offline: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[status as keyof typeof colors] || colors.offline
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <WifiOff className="h-4 w-4 text-gray-600" />
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTrendIcon = (trend: { direction: string; change: number }) => {
    if (trend.direction === 'up') {
      return <TrendingUp className="h-3 w-3 text-green-600" />
    } else if (trend.direction === 'down') {
      return <TrendingDown className="h-3 w-3 text-red-600" />
    }
    return <Activity className="h-3 w-3 text-gray-600" />
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Refetch all health queries
    await Promise.all(healthQueries.map(q => q.refetch()))
    setIsRefreshing(false)
  }

  const averageHealthScore = healthMetrics.length > 0
    ? healthMetrics.reduce((sum, m) => sum + m.healthScore, 0) / healthMetrics.length
    : 0
  const criticalCount = healthMetrics.filter(m => m.status === 'critical').length
  const warningCount = healthMetrics.filter(m => m.status === 'warning').length
  const healthyCount = healthMetrics.filter(m => m.status === 'healthy').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Phone Number Health Monitor
          </h3>
          <p className="text-sm text-muted-foreground">
            Real-time health monitoring and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPhoneId} onValueChange={setSelectedPhoneId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Phone Numbers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phone Numbers</SelectItem>
              {phoneNumbers.map(phone => (
                <SelectItem key={phone.id} value={phone.id?.toString()}>
                  {phone.number || phone.phone_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Health Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", getHealthScoreColor(averageHealthScore))}>
              {Math.round(averageHealthScore)}/100
            </div>
            <p className="text-xs text-muted-foreground">Overall system health</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Numbers</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{healthyCount}</div>
            <p className="text-xs text-muted-foreground">Operating normally</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warning Status</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            <p className="text-xs text-muted-foreground">Immediate action required</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Metrics List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Phone Number Health Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {filteredMetrics.map(metric => (
                <Card key={metric.id} className="border-l-4 border-l-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Badge className={cn("flex items-center gap-1", getStatusColor(metric.status))}>
                          {getStatusIcon(metric.status)}
                          {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
                        </Badge>
                        <div>
                          <p className="font-mono font-medium">{metric.phoneNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            Last check: {format(new Date(metric.lastCheck), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {getTrendIcon(metric.trend)}
                          <span className={cn("text-sm font-medium", getHealthScoreColor(metric.healthScore))}>
                            {metric.healthScore}/100
                          </span>
                        </div>
                        <Progress value={metric.healthScore} className="w-16 h-2" />
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Delivery Rate</div>
                        <div className="flex items-center gap-1">
                          <div className="font-medium">{metric.metrics.deliveryRate.toFixed(1)}%</div>
                          {metric.metrics.deliveryRate > 90 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                        </div>
                        <Progress value={metric.metrics.deliveryRate} className="h-1 mt-1" />
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">Response Rate</div>
                        <div className="flex items-center gap-1">
                          <div className="font-medium">{metric.metrics.responseRate.toFixed(1)}%</div>
                          {metric.metrics.responseRate > 20 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <Activity className="h-3 w-3 text-gray-600" />
                          )}
                        </div>
                        <Progress value={metric.metrics.responseRate * 5} className="h-1 mt-1" />
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">Carrier Reputation</div>
                        <div className="flex items-center gap-1">
                          <div className="font-medium">{metric.metrics.carrierReputation.toFixed(0)}/100</div>
                          {metric.metrics.carrierReputation > 85 ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 text-yellow-600" />
                          )}
                        </div>
                        <Progress value={metric.metrics.carrierReputation} className="h-1 mt-1" />
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">Volume Utilization</div>
                        <div className="flex items-center gap-1">
                          <div className="font-medium">{metric.metrics.volumeUtilization.toFixed(0)}%</div>
                          <MessageSquare className="h-3 w-3 text-blue-600" />
                        </div>
                        <Progress value={metric.metrics.volumeUtilization} className="h-1 mt-1" />
                      </div>
                    </div>

                    {/* Issues */}
                    {metric.issues.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Recent Issues</div>
                        <div className="space-y-1">
                          {metric.issues.slice(0, 3).map((issue, index) => (
                            <div
                              key={index}
                              className={cn(
                                "flex items-center gap-2 text-xs px-2 py-1 rounded",
                                issue.type === 'error' && "bg-red-100 text-red-800",
                                issue.type === 'warning' && "bg-yellow-100 text-yellow-800",
                                issue.type === 'info' && "bg-blue-100 text-blue-800"
                              )}
                            >
                              <Clock className="h-3 w-3" />
                              <span>{issue.message}</span>
                              <span className="text-xs opacity-75 ml-auto">
                                {format(new Date(issue.timestamp), 'h:mm a')}
                              </span>
                            </div>
                          ))}
                          {metric.issues.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{metric.issues.length - 3} more issues
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {filteredMetrics.length === 0 && (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No health data available</h3>
                  <p className="text-muted-foreground">
                    Select a phone number to view health metrics
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
