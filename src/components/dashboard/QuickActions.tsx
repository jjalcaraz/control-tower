import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  UserPlus, 
  Send, 
  Upload, 
  MessageSquare,
  BarChart3,
  Plus
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface QuickAction {
  title: string
  description: string
  icon: any
  action: () => void
  variant?: 'default' | 'secondary' | 'outline'
  disabled?: boolean
}

interface QuickActionsProps {
  onNewLead?: () => void
  onNewCampaign?: () => void
  onImportLeads?: () => void
  onViewMessages?: () => void
  onViewAnalytics?: () => void
}

export function QuickActions({ 
  onNewLead,
  onNewCampaign, 
  onImportLeads,
  onViewMessages,
  onViewAnalytics
}: QuickActionsProps) {
  const navigate = useNavigate()

  const quickActions: QuickAction[] = [
    {
      title: 'Add New Lead',
      description: 'Manually add a new lead to your database',
      icon: UserPlus,
      action: onNewLead || (() => navigate('/leads?action=new')),
      variant: 'default'
    },
    {
      title: 'Create Campaign',
      description: 'Start a new SMS marketing campaign',
      icon: Send,
      action: onNewCampaign || (() => navigate('/campaigns?action=new')),
      variant: 'default'
    },
    {
      title: 'Import Leads',
      description: 'Upload leads from CSV or Excel file',
      icon: Upload,
      action: onImportLeads || (() => navigate('/leads?action=import')),
      variant: 'secondary'
    },
    {
      title: 'View Messages',
      description: 'Check recent conversations and replies',
      icon: MessageSquare,
      action: onViewMessages || (() => navigate('/messages')),
      variant: 'outline'
    },
    {
      title: 'Analytics',
      description: 'Review performance metrics and reports',
      icon: BarChart3,
      action: onViewAnalytics || (() => navigate('/analytics')),
      variant: 'outline'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Common tasks to get you started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            
            return (
              <Button
                key={action.title}
                variant={action.variant}
                className="h-auto p-4 flex items-start justify-start"
                onClick={action.action}
                disabled={action.disabled}
              >
                <Icon className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-sm">
                    {action.title}
                  </div>
                  <div className="text-xs opacity-70 mt-1">
                    {action.description}
                  </div>
                </div>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}