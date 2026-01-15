import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useCreateWebhook, useTestWebhook, useTestWebhookByUrl } from '@/hooks/use-api'
import { toast } from 'sonner'

const webhookFormSchema = z.object({
  name: z.string().min(1, 'Webhook name is required'),
  url: z.string().url('Please enter a valid URL'),
  events: z.array(z.string()).min(1, 'Please select at least one event'),
  secretKey: z.string().optional(),
  active: z.boolean(),
  retryConfig: z.object({
    maxRetries: z.number().min(0).max(10),
    retryDelay: z.number().min(1),
  }),
  headers: z.record(z.string()).optional(),
})

type WebhookFormValues = z.infer<typeof webhookFormSchema>

interface WebhookWizardProps {
  onComplete?: () => void
  onCancel?: () => void
}

const availableEvents = [
  { id: 'lead.created', category: 'Leads', description: 'When a new lead is created' },
  { id: 'lead.updated', category: 'Leads', description: 'When a lead is updated' },
  { id: 'lead.deleted', category: 'Leads', description: 'When a lead is deleted' },
  { id: 'campaign.started', category: 'Campaigns', description: 'When a campaign starts' },
  { id: 'campaign.paused', category: 'Campaigns', description: 'When a campaign is paused' },
  { id: 'campaign.completed', category: 'Campaigns', description: 'When a campaign completes' },
  { id: 'message.received', category: 'Messages', description: 'When a message is received' },
  { id: 'message.sent', category: 'Messages', description: 'When a message is sent' },
  { id: 'message.failed', category: 'Messages', description: 'When a message fails to send' },
  { id: 'opt_out.created', category: 'Compliance', description: 'When a new opt-out is created' },
  { id: 'compliance.violation', category: 'Compliance', description: 'When a compliance violation occurs' },
]

export function WebhookWizard({ onComplete, onCancel }: WebhookWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showSecret, setShowSecret] = useState(false)
  const [generatedSecret, setGeneratedSecret] = useState('')
  const [testing, setTesting] = useState(false)

  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: {
      name: '',
      url: '',
      events: [],
      secretKey: '',
      active: true,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 5,
      },
      headers: {},
    },
  })

  const createWebhookMutation = useCreateWebhook({
    onSuccess: () => {
      toast.success('Webhook created successfully!')
      onComplete?.()
    },
    onError: (error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error))
      toast.error(err.message || 'Failed to create webhook')
    },
  })

  const testWebhookMutation = useTestWebhook({
    onSuccess: () => {
      toast.success('Test webhook sent successfully!')
    },
    onError: (error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error))
      toast.error(err.message || 'Failed to test webhook')
      setTesting(false)
    },
  })

  const testWebhookByUrlMutation = useTestWebhookByUrl({
    onSuccess: () => {
      toast.success('Test webhook sent successfully!')
    },
    onError: (error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error))
      toast.error(err.message || 'Failed to test webhook')
      setTesting(false)
    },
  })

  const steps = [
    { title: 'Basic Info', description: 'Configure webhook basics' },
    { title: 'Events', description: 'Select events to trigger' },
    { title: 'Security', description: 'Set up authentication' },
    { title: 'Review', description: 'Review and create webhook' },
  ]

  const generateSecretKey = () => {
    const secret = `wh_${btoa(Math.random().toString(36).substring(2, 15)).replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`
    setGeneratedSecret(secret)
    form.setValue('secretKey', secret)
  }

  const handleTestWebhook = async () => {
    const webhookUrl = form.getValues('url')

    if (!webhookUrl) {
      toast.error('Please enter a webhook URL first')
      return
    }

    setTesting(true)

    // Test webhook by URL (pre-creation testing)
    ;(testWebhookByUrlMutation as any).mutate(webhookUrl)
  }

  const handleCreate = () => {
    const formData = form.getValues()
    ;(createWebhookMutation as any).mutate(formData)
  }

  const copySecret = () => {
    if (generatedSecret) {
      navigator.clipboard.writeText(generatedSecret)
      toast.success('Secret key copied to clipboard')
    }
  }

  const renderBasicInfoStep = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="name">Webhook Name</Label>
        <Input
          id="name"
          placeholder="e.g., CRM Sync, Analytics Integration"
          {...form.register('name')}
          className="mt-1"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="url">Endpoint URL</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://your-domain.com/webhook"
          {...form.register('url')}
          className="mt-1"
        />
        {form.formState.errors.url && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.url.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="webhookDescription">Description (Optional)</Label>
        <Textarea
          id="webhookDescription"
          placeholder="Describe what this webhook does..."
          rows={3}
          className="mt-1"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="active"
          checked={form.watch('active')}
          onCheckedChange={(checked) => form.setValue('active', checked as boolean)}
        />
        <Label htmlFor="active">Enable webhook immediately</Label>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => setCurrentStep(1)}
          className="flex-1"
        >
          Next
        </Button>
      </div>
    </div>
  )

  const renderEventsStep = () => (
    <div className="space-y-6">
      <div>
        <Label>Select Events</Label>
        <p className="text-sm text-gray-600 mt-1">Choose which events should trigger this webhook</p>
      </div>

      <div className="space-y-4">
        {Array.from(new Set(availableEvents.map(e => e.category))).map(category => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-base">{category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableEvents
                .filter(event => event.category === category)
                .map(event => (
                  <div key={event.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={event.id}
                      checked={form.watch('events').includes(event.id)}
                      onCheckedChange={(checked) => {
                        const currentEvents = form.getValues('events')
                        if (checked) {
                          form.setValue('events', [...currentEvents, event.id])
                        } else {
                          form.setValue('events', currentEvents.filter(e => e !== event.id))
                        }
                      }}
                    />
                    <div className="flex-1">
                      <Label htmlFor={event.id} className="font-medium">
                        {(() => {
                          const parts = event.id.split('.')
                          const last = parts[parts.length - 1]
                          if (!last) return event.id
                          return last.charAt(0).toUpperCase() + last.slice(1)
                        })()}
                      </Label>
                      <p className="text-sm text-gray-600">{event.description}</p>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {form.watch('events').length > 0 && (
        <Alert>
          <AlertDescription>
            Selected {form.watch('events').length} events
            <div className="mt-2 flex flex-wrap gap-1">
              {form.watch('events').map(eventId => {
                const event = availableEvents.find(e => e.id === eventId)
                return (
                  <Badge key={eventId} variant="secondary" className="text-xs">
                    {event?.category}: {(() => {
                      const parts = event?.id.split('.') || []
                      return parts[parts.length - 1] || eventId
                    })()}
                  </Badge>
                )
              })}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep(0)}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={() => setCurrentStep(2)}
          disabled={form.watch('events').length === 0}
          className="flex-1"
        >
          Next
        </Button>
      </div>
    </div>
  )

  const renderSecurityStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Secret Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="secretKey">Webhook Secret</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateSecretKey}
                >
                  Generate
                </Button>
                {generatedSecret && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copySecret}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="relative">
              <Input
                id="secretKey"
                type={showSecret ? 'text' : 'password'}
                placeholder="Optional secret key for HMAC signature"
                {...form.register('secretKey')}
                className="mt-1 pr-10"
                value={form.watch('secretKey')}
                readOnly={!!generatedSecret}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Used to verify webhook authenticity. Store this securely.
            </p>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Security Best Practices:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Always use HTTPS URLs</li>
                <li>Store secret keys in environment variables</li>
                <li>Verify webhook signatures when receiving payloads</li>
                <li>Implement replay attack protection</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Retry Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="maxRetries">Maximum Retries</Label>
            <Input
              id="maxRetries"
              type="number"
              min="0"
              max="10"
              {...form.register('retryConfig.maxRetries', { valueAsNumber: true })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="retryDelay">Retry Delay (seconds)</Label>
            <Input
              id="retryDelay"
              type="number"
              min="1"
              {...form.register('retryConfig.retryDelay', { valueAsNumber: true })}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep(1)}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={() => setCurrentStep(3)}
          className="flex-1"
        >
          Review
        </Button>
      </div>
    </div>
  )

  const renderReviewStep = () => (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          Please review your webhook configuration before creating it.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-600">Name</Label>
              <p className="font-medium">{form.getValues('name')}</p>
            </div>
            <div>
              <Label className="text-gray-600">URL</Label>
              <p className="font-medium text-sm truncate">{form.getValues('url')}</p>
            </div>
            <div>
              <Label className="text-gray-600">Status</Label>
              <p className="font-medium">{form.getValues('active') ? 'Active' : 'Inactive'}</p>
            </div>
            <div>
              <Label className="text-gray-600">Secret Key</Label>
              <p className="font-medium">
                {form.getValues('secretKey') ? 'Configured' : 'Not configured'}
              </p>
            </div>
          </div>

          <div>
            <Label className="text-gray-600">Events ({form.watch('events').length})</Label>
            <div className="mt-2 flex flex-wrap gap-1">
              {form.watch('events').map(eventId => {
                const event = availableEvents.find(e => e.id === eventId)
                return (
                  <Badge key={eventId} variant="outline">
                    {event?.category}: {(() => {
                      const parts = event?.id.split('.') || []
                      return parts[parts.length - 1] || eventId
                    })()}
                  </Badge>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep(2)}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleTestWebhook}
          disabled={testing || testWebhookMutation.isLoading || testWebhookByUrlMutation.isLoading}
          className="flex-1"
        >
          {testing || testWebhookMutation.isLoading || testWebhookByUrlMutation.isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Test Webhook
        </Button>
        <Button
          type="button"
          onClick={handleCreate}
          disabled={createWebhookMutation.isLoading}
          className="flex-1"
        >
          {createWebhookMutation.isLoading ? 'Creating...' : 'Create Webhook'}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Create Webhook</h2>

        <Progress value={(currentStep + 1) / steps.length * 100} className="mb-4" />

        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex flex-col items-center ${
                index <= currentStep ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                {index + 1}
              </div>
              <span className="text-xs mt-1 text-center">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].description}</CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && renderBasicInfoStep()}
          {currentStep === 1 && renderEventsStep()}
          {currentStep === 2 && renderSecurityStep()}
          {currentStep === 3 && renderReviewStep()}
        </CardContent>
      </Card>
    </div>
  )
}