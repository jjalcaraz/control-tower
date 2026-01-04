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
  Plus,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Key,
  Webhook,
  Database,
  Globe,
  Code,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Trash2,
  Edit3,
  ExternalLink,
  Activity,
  Clock,
  Users,
  Zap,
  Mail,
  Phone,
  Calendar,
  FileText,
  BarChart3,
  Shield,
  Link
} from 'lucide-react'
import { useIntegrations, useWebhooks, useAPIKeys, useCreateWebhook, useTestWebhook, useCreateAPIKey } from '@/hooks/use-api'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { WebhookWizard } from '@/components/integrations/WebhookWizard'
import { APIKeyWizard } from '@/components/integrations/APIKeyWizard'
import { toast } from 'sonner'

interface Integration {
  id: string
  name: string
  type: 'crm' | 'webhook' | 'analytics' | 'email' | 'phone' | 'automation'
  provider: string
  status: 'connected' | 'disconnected' | 'error' | 'pending'
  description: string
  icon: string
  lastSync?: string
  recordsSynced?: number
  errorMessage?: string
  features: string[]
  configurable: boolean
  popular?: boolean
}

interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  status: 'active' | 'inactive' | 'error'
  secret?: string
  lastTriggered?: string
  successCount: number
  errorCount: number
  createdAt: string
}

interface APIKey {
  id: string
  name: string
  key: string
  permissions: string[]
  status: 'active' | 'inactive' | 'expired'
  lastUsed?: string
  createdAt: string
  expiresAt?: string
}

const availableIntegrations: Integration[] = [
  {
    id: 'salesforce',
    name: 'Salesforce',
    type: 'crm',
    provider: 'Salesforce',
    status: 'connected',
    description: 'Sync leads and contacts with Salesforce CRM',
    icon: '🏢',
    lastSync: '2024-01-15T10:30:00Z',
    recordsSynced: 1250,
    features: ['Lead sync', 'Contact management', 'Opportunity tracking'],
    configurable: true,
    popular: true
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    type: 'crm',
    provider: 'HubSpot',
    status: 'disconnected',
    description: 'Connect with HubSpot CRM for lead management',
    icon: '🟠',
    features: ['Contact sync', 'Deal tracking', 'Marketing automation'],
    configurable: true,
    popular: true
  },
  {
    id: 'zapier',
    name: 'Zapier',
    type: 'automation',
    provider: 'Zapier',
    status: 'connected',
    description: 'Automate workflows with 5000+ apps',
    icon: '⚡',
    lastSync: '2024-01-15T09:15:00Z',
    recordsSynced: 500,
    features: ['Workflow automation', 'Data sync', 'Event triggers'],
    configurable: true,
    popular: true
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    type: 'email',
    provider: 'Mailchimp',
    status: 'pending',
    description: 'Email marketing and automation platform',
    icon: '📧',
    features: ['Email campaigns', 'List management', 'Automation'],
    configurable: true
  },
  {
    id: 'twilio',
    name: 'Twilio',
    type: 'phone',
    provider: 'Twilio',
    status: 'connected',
    description: 'SMS and voice communication platform',
    icon: '📱',
    lastSync: '2024-01-15T11:00:00Z',
    recordsSynced: 25000,
    features: ['SMS sending', 'Voice calls', 'Phone verification'],
    configurable: true,
    popular: true
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    type: 'analytics',
    provider: 'Google',
    status: 'error',
    description: 'Track website and campaign performance',
    icon: '📊',
    errorMessage: 'Authentication token expired',
    features: ['Event tracking', 'Conversion analytics', 'Custom reports'],
    configurable: true
  }
]

const webhookEvents = [
  'lead.created',
  'lead.updated',
  'campaign.started',
  'campaign.completed',
  'message.sent',
  'message.delivered',
  'message.failed',
  'opt_out.received'
]

export function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [showAPIKey, setShowAPIKey] = useState<string | null>(null)
  const [showWebhookModal, setShowWebhookModal] = useState(false)
  const [showAPIKeyModal, setShowAPIKeyModal] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)

  // API hooks
  const { data: integrationsData, isLoading } = useIntegrations()
  const { data: webhooksData, refetch: refetchWebhooks } = useWebhooks()
  const { data: apiKeysData, refetch: refetchAPIKeys } = useAPIKeys()

  const createWebhookMutation = useCreateWebhook({
    onSuccess: () => {
      toast.success('Webhook created successfully')
      refetchWebhooks()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create webhook')
    },
  })

  const createAPIKeyMutation = useCreateAPIKey({
    onSuccess: () => {
      toast.success('API key created successfully')
      refetchAPIKeys()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create API key')
    },
  })

  const integrations = Array.isArray(integrationsData) ? integrationsData : (integrationsData?.results || availableIntegrations)
  const webhooks = Array.isArray(webhooksData) ? webhooksData : (webhooksData?.results || [])
  const apiKeys = Array.isArray(apiKeysData) ? apiKeysData : (apiKeysData?.results || [])

  const connectedIntegrations = integrations.filter(i => i.status === 'connected')
  const disconnectedIntegrations = integrations.filter(i => i.status === 'disconnected')

  const getStatusColor = (status: string) => {
    const colors = {
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.disconnected
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <XCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'crm':
        return <Database className="h-5 w-5" />
      case 'webhook':
        return <Webhook className="h-5 w-5" />
      case 'analytics':
        return <BarChart3 className="h-5 w-5" />
      case 'email':
        return <Mail className="h-5 w-5" />
      case 'phone':
        return <Phone className="h-5 w-5" />
      case 'automation':
        return <Zap className="h-5 w-5" />
      default:
        return <Globe className="h-5 w-5" />
    }
  }

  const handleConnect = (integration: Integration) => {
    console.log('Connecting to:', integration.name)
    setSelectedIntegration(integration)
  }

  const handleDisconnect = (integrationId: string) => {
    if (window.confirm('Are you sure you want to disconnect this integration?')) {
      console.log('Disconnecting:', integrationId)
    }
  }

  const handleCopyAPIKey = (key: string) => {
    navigator.clipboard.writeText(key)
  }

  const handleToggleAPIKeyVisibility = (keyId: string) => {
    setShowAPIKey(showAPIKey === keyId ? null : keyId)
  }

  const handleCreateWebhook = () => {
    setShowWebhookModal(true)
  }

  const handleCreateAPIKey = () => {
    setShowAPIKeyModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">
            Manage external service connections and API integrations
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleCreateWebhook}>
            <Webhook className="h-4 w-4 mr-2" />
            New Webhook
          </Button>
          <Button onClick={handleCreateAPIKey}>
            <Key className="h-4 w-4 mr-2" />
            Generate API Key
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Services</CardTitle>
            <Link className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedIntegrations.length}</div>
            <p className="text-xs text-muted-foreground">
              of {integrations.length} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Webhooks</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {webhooks.filter(w => w.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apiKeys.filter(k => k.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Active keys</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Records Synced</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connectedIntegrations.reduce((sum, i) => sum + (i.recordsSynced || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Connected Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Connected Services ({connectedIntegrations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {connectedIntegrations.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {connectedIntegrations.map(integration => (
                    <div key={integration.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{integration.icon}</div>
                        <div>
                          <div className="font-medium flex items-center space-x-2">
                            {integration.name}
                            <Badge className={getStatusColor(integration.status)}>
                              {integration.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {integration.recordsSynced && (
                              <>{integration.recordsSynced.toLocaleString()} records synced • </>
                            )}
                            {integration.lastSync && (
                              <>Last sync: {format(new Date(integration.lastSync), 'MMM d, HH:mm')}</>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4 mr-1" />
                          Configure
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Link className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No connected services</h3>
                  <p className="text-muted-foreground">
                    Connect your first integration to sync data and automate workflows.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Popular Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {integrations.filter(i => i.popular).map(integration => (
                    <div key={integration.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-xl">{integration.icon}</div>
                        <div>
                          <div className="font-medium">{integration.name}</div>
                          <div className="text-sm text-muted-foreground">{integration.description}</div>
                        </div>
                      </div>
                      {integration.status === 'connected' ? (
                        <Badge className={getStatusColor(integration.status)}>
                          Connected
                        </Badge>
                      ) : (
                        <Button size="sm" onClick={() => handleConnect(integration)}>
                          Connect
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div className="flex-1">
                      <div className="text-sm">Salesforce sync completed</div>
                      <div className="text-xs text-muted-foreground">250 leads synced • 2 hours ago</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-2">
                    <Webhook className="h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <div className="text-sm">Webhook triggered</div>
                      <div className="text-xs text-muted-foreground">lead.created event • 3 hours ago</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-2">
                    <Key className="h-4 w-4 text-purple-600" />
                    <div className="flex-1">
                      <div className="text-sm">New API key created</div>
                      <div className="text-xs text-muted-foreground">Mobile app integration • 1 day ago</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <div className="flex-1">
                      <div className="text-sm">Google Analytics connection failed</div>
                      <div className="text-xs text-muted-foreground">Token expired • 2 days ago</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map(integration => (
              <Card key={integration.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{integration.icon}</div>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getStatusColor(integration.status)}>
                            {integration.status}
                          </Badge>
                          {integration.popular && (
                            <Badge variant="outline" className="text-xs">
                              Popular
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {getTypeIcon(integration.type)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {integration.description}
                  </p>
                  
                  {integration.features.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-medium mb-2">Features:</div>
                      <div className="flex flex-wrap gap-1">
                        {integration.features.slice(0, 3).map(feature => (
                          <Badge key={feature} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {integration.features.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{integration.features.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {integration.status === 'connected' && integration.lastSync && (
                    <div className="text-xs text-muted-foreground mb-4">
                      Last sync: {format(new Date(integration.lastSync), 'MMM d, HH:mm')}
                      {integration.recordsSynced && (
                        <> • {integration.recordsSynced.toLocaleString()} records</>
                      )}
                    </div>
                  )}

                  {integration.status === 'error' && integration.errorMessage && (
                    <div className="text-xs text-red-600 mb-4">
                      Error: {integration.errorMessage}
                    </div>
                  )}

                  <div className="flex space-x-2">
                    {integration.status === 'connected' ? (
                      <>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Settings className="h-4 w-4 mr-1" />
                          Configure
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDisconnect(integration.id)}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleConnect(integration)}
                        disabled={integration.status === 'pending'}
                      >
                        {integration.status === 'pending' ? 'Connecting...' : 'Connect'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Webhooks ({webhooks.length})</CardTitle>
                <Button onClick={handleCreateWebhook}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Webhook
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {webhooks.length > 0 ? (
                <div className="space-y-3">
                  {webhooks.map(webhook => (
                    <div key={webhook.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold">{webhook.name}</h4>
                            <Badge className={getStatusColor(webhook.status)}>
                              {webhook.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {webhook.url}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm">
                        <div>
                          <span className="text-muted-foreground">Events: </span>
                          <span className="font-semibold">{webhook.events.length}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Success: </span>
                          <span className="font-semibold text-green-600">{webhook.successCount}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Errors: </span>
                          <span className="font-semibold text-red-600">{webhook.errorCount}</span>
                        </div>
                        {webhook.lastTriggered && (
                          <div>
                            <span className="text-muted-foreground">Last: </span>
                            <span className="font-semibold">
                              {format(new Date(webhook.lastTriggered), 'MMM d, HH:mm')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No webhooks configured</h3>
                  <p className="text-muted-foreground mb-4">
                    Create webhooks to receive real-time notifications about events.
                  </p>
                  <Button onClick={handleCreateWebhook}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Webhook
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>API Keys ({apiKeys.length})</CardTitle>
                <Button onClick={handleCreateAPIKey}>
                  <Key className="h-4 w-4 mr-2" />
                  Generate API Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {apiKeys.length > 0 ? (
                <div className="space-y-3">
                  {apiKeys.map(apiKey => (
                    <div key={apiKey.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold">{apiKey.name}</h4>
                            <Badge className={getStatusColor(apiKey.status)}>
                              {apiKey.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-mono bg-muted px-2 py-1 rounded">
                              {showAPIKey === apiKey.id 
                                ? apiKey.key 
                                : apiKey.key.substring(0, 8) + '...' + apiKey.key.slice(-4)
                              }
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleToggleAPIKeyVisibility(apiKey.id)}
                            >
                              {showAPIKey === apiKey.id ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleCopyAPIKey(apiKey.key)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm">
                        <div>
                          <span className="text-muted-foreground">Permissions: </span>
                          <span className="font-semibold">{apiKey.permissions.length}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created: </span>
                          <span className="font-semibold">
                            {format(new Date(apiKey.createdAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {apiKey.lastUsed && (
                          <div>
                            <span className="text-muted-foreground">Last used: </span>
                            <span className="font-semibold">
                              {format(new Date(apiKey.lastUsed), 'MMM d, HH:mm')}
                            </span>
                          </div>
                        )}
                        {apiKey.expiresAt && (
                          <div>
                            <span className="text-muted-foreground">Expires: </span>
                            <span className="font-semibold">
                              {format(new Date(apiKey.expiresAt), 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No API keys generated</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate API keys to programmatically access your SMS platform.
                  </p>
                  <Button onClick={handleCreateAPIKey}>
                    <Key className="h-4 w-4 mr-2" />
                    Generate Your First API Key
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white min-h-full w-full max-w-4xl mx-4">
            <WebhookWizard
              onComplete={() => {
                setShowWebhookModal(false)
                refetchWebhooks()
              }}
              onCancel={() => setShowWebhookModal(false)}
            />
          </div>
        </div>
      )}

      {/* Create API Key Modal */}
      {showAPIKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white min-h-full w-full max-w-4xl mx-4">
            <APIKeyWizard
              onComplete={() => {
                setShowAPIKeyModal(false)
                refetchAPIKeys()
              }}
              onCancel={() => setShowAPIKeyModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}