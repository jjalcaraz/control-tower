import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  MessageSquare, 
  UserPlus, 
  Send, 
  AlertCircle, 
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ActivityItem {
  id: string
  type: 'message' | 'lead' | 'campaign' | 'error' | 'success'
  title: string
  description: string
  timestamp: Date
  data?: any
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  isLoading?: boolean
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'message':
      return MessageSquare
    case 'lead':
      return UserPlus
    case 'campaign':
      return Send
    case 'error':
      return AlertCircle
    case 'success':
      return CheckCircle
    default:
      return Clock
  }
}

const getActivityColor = (type: string) => {
  switch (type) {
    case 'message':
      return 'text-blue-600 bg-blue-100'
    case 'lead':
      return 'text-green-600 bg-green-100'
    case 'campaign':
      return 'text-purple-600 bg-purple-100'
    case 'error':
      return 'text-red-600 bg-red-100'
    case 'success':
      return 'text-emerald-600 bg-emerald-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

const getActivityBadgeVariant = (type: string) => {
  switch (type) {
    case 'error':
      return 'destructive' as const
    case 'success':
      return 'default' as const
    case 'message':
      return 'secondary' as const
    default:
      return 'outline' as const
  }
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Real-time system updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Real-time system updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No recent activity</p>
            <p className="text-sm text-gray-400 mt-2">
              Activity will appear here as your system processes leads and campaigns
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Recent Activity
          <Badge variant="outline" className="text-xs">
            Live
          </Badge>
        </CardTitle>
        <CardDescription>Real-time system updates</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type)
              const iconColorClass = getActivityColor(activity.type)
              
              return (
                <div key={activity.id} className="flex items-start space-x-3 group">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconColorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <Badge variant={getActivityBadgeVariant(activity.type)} className="text-xs ml-2">
                        {activity.type}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      {activity.description}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </p>
                      
                      {activity.data && (
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-600 hover:text-blue-800 flex items-center">
                          View details
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// Default activities for fallback/demo
export const defaultActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'lead',
    title: 'New lead imported',
    description: 'Sarah Johnson added from CSV import - Austin, TX property',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
  },
  {
    id: '2',
    type: 'campaign',
    title: 'Campaign started',
    description: 'Land Acquisition Q4 campaign began sending to 1,247 leads',
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
  },
  {
    id: '3',
    type: 'message',
    title: 'Reply received',
    description: 'Mike Wilson replied to initial outreach message',
    timestamp: new Date(Date.now() - 32 * 60 * 1000), // 32 minutes ago
  },
  {
    id: '4',
    type: 'success',
    title: 'Delivery milestone',
    description: '1,000 messages successfully delivered today',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
  },
  {
    id: '5',
    type: 'lead',
    title: 'Lead status updated',
    description: 'John Smith marked as "Interested" - follow-up scheduled',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  }
]