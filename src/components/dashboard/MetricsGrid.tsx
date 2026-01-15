import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Send,
  MessageSquare,
  TrendingUp,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Metric {
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  subtitle?: string
  icon: any
  status?: 'success' | 'warning' | 'error' | 'neutral'
}

interface MetricsGridProps {
  metrics: Metric[]
  isLoading?: boolean
}

const formatMetricValue = (value: string | number): string => {
  if (typeof value === 'number') {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toLocaleString()
  }
  return value
}

const getChangeIcon = (changeType?: string) => {
  switch (changeType) {
    case 'increase':
      return ArrowUpIcon
    case 'decrease':
      return ArrowDownIcon
    default:
      return MinusIcon
  }
}

const getChangeColor = (changeType?: string) => {
  switch (changeType) {
    case 'increase':
      return 'text-green-600'
    case 'decrease':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'success':
      return 'border-l-green-500'
    case 'warning':
      return 'border-l-yellow-500'
    case 'error':
      return 'border-l-red-500'
    default:
      return 'border-l-blue-500'
  }
}

export function MetricsGrid({ metrics, isLoading }: MetricsGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon
        const ChangeIcon = getChangeIcon(metric.changeType)
        
        return (
          <Card 
            key={metric.title} 
            className={cn(
              "border-l-4 transition-all hover:shadow-md",
              getStatusColor(metric.status)
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
              <Icon className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatMetricValue(metric.value)}
              </div>
              
              {metric.subtitle && (
                <p className="text-xs text-gray-500 mb-2">
                  {metric.subtitle}
                </p>
              )}
              
              {metric.change && (
                <div className={cn(
                  "flex items-center text-sm",
                  getChangeColor(metric.changeType)
                )}>
                  <ChangeIcon className="h-4 w-4 mr-1" />
                  <span className="font-medium">{metric.change}</span>
                  <span className="text-gray-500 ml-1">from last period</span>
                </div>
              )}
              
              {metric.status && metric.status !== 'neutral' && (
                <Badge 
                  variant={
                    metric.status === 'success' ? 'default' :
                    metric.status === 'warning' ? 'secondary' : 'destructive'
                  }
                  className="mt-2 text-xs"
                >
                  {metric.status}
                </Badge>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// Default metrics for fallback/loading states
export const defaultMetrics: Metric[] = [
  {
    title: 'Total Leads',
    value: 0,
    change: '+0%',
    changeType: 'neutral',
    subtitle: 'All time',
    icon: Users,
    status: 'neutral'
  },
  {
    title: 'Active Campaigns',
    value: 0,
    change: '+0%',
    changeType: 'neutral',
    subtitle: 'Currently running',
    icon: Send,
    status: 'neutral'
  },
  {
    title: 'Messages Today',
    value: 0,
    change: '+0%',
    changeType: 'neutral',
    subtitle: 'Sent today',
    icon: MessageSquare,
    status: 'neutral'
  },
  {
    title: 'Delivery Rate',
    value: '0%',
    change: '+0%',
    changeType: 'neutral',
    subtitle: 'Last 24 hours',
    icon: TrendingUp,
    status: 'neutral'
  }
]