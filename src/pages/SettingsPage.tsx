import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast.ts'
import api from '@/lib/api'
import { Phone, MessageSquare, Shield, Settings2, Save, Plus, Trash2, Edit, RefreshCw, Loader2 } from 'lucide-react'

export function SettingsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('phone-numbers')
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  
  // Twilio configuration state
  const [twilioConfig, setTwilioConfig] = useState({
    account_sid: '',
    auth_token: '',
    messaging_service: '',
    client_initialized: false,
    twilio_configured: false,
    account_info: null as any,
    account_info_error: null as any
  })

  const [templates] = useState([
    { id: 1, name: 'Welcome Message', content: 'Hi {{name}}, welcome to our SMS service! Reply STOP to opt out.' },
    { id: 2, name: 'Appointment Reminder', content: 'Hi {{name}}, your appointment is tomorrow at {{time}}. Reply STOP to opt out.' }
  ])
  
  const [autoReplies, setAutoReplies] = useState({
    stopEnabled: true,
    helpEnabled: true,
    stopMessage: 'You have been unsubscribed from our SMS messages. Reply START to opt back in.',
    helpMessage: 'This is an automated SMS service. Reply STOP to unsubscribe or contact support at help@example.com'
  })

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    deliveryFailures: true,
    systemIssues: true,
    weeklyReports: false
  })

  // Load Twilio configuration on component mount
  useEffect(() => {
    loadTwilioConfig()
  }, [])

  const loadTwilioConfig = async () => {
    setIsLoading(true)
    try {
      const response = await api.get('/messages/test-config')
      if (response.data.success) {
        setTwilioConfig(response.data.data)
      }
    } catch (error: any) {
      // 400 is expected when Twilio is not configured, only log unexpected errors
      if (error.response?.status !== 400) {
        console.error('Failed to load Twilio config:', error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const testTwilioConfig = async () => {
    setIsTesting(true)
    try {
      // Just test the configuration without sending a message
      const response = await api.get('/messages/test-config')
      
      if (response.data.success) {
        toast({
          title: 'Test Successful',
          description: response.data.message,
        })
      } else {
        toast({
          title: 'Test Failed',
          description: response.data.message || 'Unknown error',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      toast({
        title: 'Test Failed',
        description: error.response?.data?.detail || 'Network error',
        variant: 'destructive'
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Configure your SMS system and preferences</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="phone-numbers" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Phone Numbers
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="phone-numbers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Phone Number Management
              </CardTitle>
              <CardDescription>
                Manage your Twilio phone numbers and SMS configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertDescription>
                  <strong>Twilio Status:</strong> 
                  {isLoading ? (
                    <Badge variant="secondary" className="ml-2">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Loading...
                    </Badge>
                  ) : twilioConfig.twilio_configured ? (
                    <Badge variant="default" className="ml-2">✅ Connected</Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-2">Mock Mode</Badge>
                  )}
                  <span className="text-sm text-gray-600 ml-2">
                    {twilioConfig.twilio_configured 
                      ? 'Twilio is configured and ready to send SMS'
                      : 'Configure real Twilio credentials in backend/.env to enable SMS sending'
                    }
                  </span>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="twilio-status">Twilio Configuration</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Loading configuration...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Account SID:</span>
                          <span className={`ml-2 ${twilioConfig.account_sid === '❌ Placeholder' ? 'text-red-600' : 'text-green-600'}`}>
                            {twilioConfig.account_sid}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Auth Token:</span>
                          <span className={`ml-2 ${twilioConfig.auth_token === '❌ Placeholder' ? 'text-red-600' : 'text-green-600'}`}>
                            {twilioConfig.auth_token}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Client Status:</span>
                          <span className={`ml-2 ${twilioConfig.client_initialized ? 'text-green-600' : 'text-red-600'}`}>
                            {twilioConfig.client_initialized ? '✅ Initialized' : '❌ Not Initialized'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Messaging Service:</span>
                          <span className="text-gray-600 ml-2">
                            {twilioConfig.messaging_service || 'Not set'}
                          </span>
                        </div>
                        {twilioConfig.account_info && (
                          <>
                            <div>
                              <span className="font-medium">Account Name:</span>
                              <span className="text-gray-600 ml-2">
                                {twilioConfig.account_info.friendly_name}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Account Status:</span>
                              <span className="text-gray-600 ml-2">
                                {twilioConfig.account_info.status}
                              </span>
                            </div>
                          </>
                        )}
                        {twilioConfig.account_info_error && (
                          <div className="col-span-2">
                            <span className="font-medium text-red-600">Error:</span>
                            <span className="text-red-600 ml-2 text-xs">
                              {twilioConfig.account_info_error}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Configuration Instructions</Label>
                  <div className="p-4 border rounded-lg bg-blue-50 text-sm">
                    <p className="font-medium mb-2">To enable SMS functionality:</p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-700">
                      <li>Update backend/.env with your Twilio credentials</li>
                      <li>Set TWILIO_ACCOUNT_SID=your_actual_account_sid</li>
                      <li>Set TWILIO_AUTH_TOKEN=your_actual_auth_token</li>
                      <li>Restart the backend server</li>
                      <li>Use the sync button below to import your numbers</li>
                    </ol>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button disabled={!twilioConfig.twilio_configured}>
                    <Plus className="h-4 w-4 mr-2" />
                    Purchase Number
                  </Button>
                  <Button 
                    variant="outline" 
                    disabled={!twilioConfig.twilio_configured}
                    onClick={loadTwilioConfig}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Refreshing...' : 'Refresh Status'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={testTwilioConfig}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Phone className="h-4 w-4 mr-2" />
                    )}
                    {isTesting ? 'Testing...' : 'Test Configuration'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Message Templates
                  </CardTitle>
                  <CardDescription>
                    Create and manage reusable message templates
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{template.name}</h3>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {template.content}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 border rounded-lg bg-blue-50">
                <h4 className="font-medium mb-2">Template Variables</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Use these variables in your templates:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{'{{name}}'}</Badge>
                  <Badge variant="secondary">{'{{phone}}'}</Badge>
                  <Badge variant="secondary">{'{{email}}'}</Badge>
                  <Badge variant="secondary">{'{{company}}'}</Badge>
                  <Badge variant="secondary">{'{{time}}'}</Badge>
                  <Badge variant="secondary">{'{{date}}'}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Auto-Reply & Compliance
              </CardTitle>
              <CardDescription>
                Configure required auto-responses for compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertDescription>
                  <strong>Required:</strong> STOP and HELP responses are legally required by carriers and TCPA regulations.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="stop-enabled">STOP Auto-Reply</Label>
                    <p className="text-sm text-gray-600">Automatically unsubscribe users who text STOP</p>
                  </div>
                  <Switch
                    id="stop-enabled"
                    checked={autoReplies.stopEnabled}
                    onCheckedChange={(checked) =>
                      setAutoReplies(prev => ({ ...prev, stopEnabled: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stop-message">STOP Response Message</Label>
                  <Textarea
                    id="stop-message"
                    value={autoReplies.stopMessage}
                    onChange={(e) =>
                      setAutoReplies(prev => ({ ...prev, stopMessage: e.target.value }))
                    }
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="help-enabled">HELP Auto-Reply</Label>
                    <p className="text-sm text-gray-600">Provide support information for HELP keyword</p>
                  </div>
                  <Switch
                    id="help-enabled"
                    checked={autoReplies.helpEnabled}
                    onCheckedChange={(checked) =>
                      setAutoReplies(prev => ({ ...prev, helpEnabled: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="help-message">HELP Response Message</Label>
                  <Textarea
                    id="help-message"
                    value={autoReplies.helpMessage}
                    onChange={(e) =>
                      setAutoReplies(prev => ({ ...prev, helpMessage: e.target.value }))
                    }
                    rows={2}
                  />
                </div>

                <div className="p-4 border rounded-lg bg-amber-50">
                  <h4 className="font-medium mb-2">Recognized Keywords</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Opt-out Keywords:</p>
                      <p className="text-gray-600">STOP, END, CANCEL, UNSUBSCRIBE, QUIT</p>
                    </div>
                    <div>
                      <p className="font-medium">Help Keywords:</p>
                      <p className="text-gray-600">HELP, INFO, SUPPORT</p>
                    </div>
                  </div>
                </div>
              </div>

              <Button>
                <Save className="h-4 w-4 mr-2" />
                Save Compliance Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose when to receive email notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Alerts</Label>
                    <p className="text-sm text-gray-600">Receive general system notifications</p>
                  </div>
                  <Switch
                    checked={notifications.emailAlerts}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, emailAlerts: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Delivery Failures</Label>
                    <p className="text-sm text-gray-600">Alert when messages fail to deliver</p>
                  </div>
                  <Switch
                    checked={notifications.deliveryFailures}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, deliveryFailures: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>System Issues</Label>
                    <p className="text-sm text-gray-600">Notify about system downtime or errors</p>
                  </div>
                  <Switch
                    checked={notifications.systemIssues}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, systemIssues: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Weekly Reports</Label>
                    <p className="text-sm text-gray-600">Receive usage summaries every week</p>
                  </div>
                  <Switch
                    checked={notifications.weeklyReports}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, weeklyReports: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dashboard Settings</CardTitle>
                <CardDescription>
                  Customize your main dashboard view
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="default-view">Default View</Label>
                    <select
                      id="default-view"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="overview">Overview</option>
                      <option value="campaigns">Campaigns</option>
                      <option value="messages">Messages</option>
                      <option value="leads">Leads</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="items-per-page">Items Per Page</Label>
                    <select
                      id="items-per-page"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data & Export</CardTitle>
                <CardDescription>
                  Manage your data and create backups
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline">
                    Export Contacts
                  </Button>
                  <Button variant="outline">
                    Export Messages
                  </Button>
                  <Button variant="outline">
                    Export Reports
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Export your data in CSV format for backup or migration purposes.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Save All Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}