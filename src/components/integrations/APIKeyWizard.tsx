import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Copy, Eye, EyeOff, Download, AlertTriangle, Shield } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useCreateAPIKey } from '@/hooks/use-api'
import { toast } from 'sonner'

const apiKeyFormSchema = z.object({
  name: z.string().min(1, 'API key name is required'),
  permissions: z.array(z.string()).min(1, 'Please select at least one permission'),
  scopes: z.array(z.string()).min(1, 'Please select at least one scope'),
  expiresInDays: z.number().optional(),
  rateLimitPerHour: z.number().min(1).optional(),
  description: z.string().optional(),
})

type APIKeyFormValues = z.infer<typeof apiKeyFormSchema>

interface APIKeyWizardProps {
  onComplete?: () => void
  onCancel?: () => void
}

const permissionOptions = [
  { id: 'read', label: 'Read', description: 'View resources and data' },
  { id: 'write', label: 'Write', description: 'Create and update resources' },
  { id: 'delete', label: 'Delete', description: 'Delete resources' },
]

const scopeOptions = [
  { id: 'all', label: 'All Resources', description: 'Full access to all resources' },
  { id: 'leads', label: 'Leads', description: 'Lead management access' },
  { id: 'campaigns', label: 'Campaigns', description: 'Campaign management access' },
  { id: 'messages', label: 'Messages', description: 'Message sending and receiving' },
  { id: 'templates', label: 'Templates', description: 'Template management' },
  { id: 'analytics', label: 'Analytics', description: 'Analytics and reporting' },
  { id: 'compliance', label: 'Compliance', description: 'Compliance management' },
  { id: 'phone_numbers', label: 'Phone Numbers', description: 'Phone number management' },
  { id: 'integrations', label: 'Integrations', description: 'Integration management' },
]

const expirationOptions = [
  { label: 'Never expires', value: null },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
  { label: '180 days', value: 180 },
  { label: '365 days', value: 365 },
]

const rateLimitOptions = [
  { label: 'No limit', value: null },
  { label: '100 requests/hour', value: 100 },
  { label: '1,000 requests/hour', value: 1000 },
  { label: '10,000 requests/hour', value: 10000 },
  { label: '100,000 requests/hour', value: 100000 },
]

export function APIKeyWizard({ onComplete, onCancel }: APIKeyWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [generatedKey, setGeneratedKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)

  const form = useForm<APIKeyFormValues>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      name: '',
      permissions: ['read'],
      scopes: ['all'],
      expiresInDays: null,
      rateLimitPerHour: null,
      description: '',
    },
  })

  const createAPIKeyMutation = useCreateAPIKey({
    onSuccess: (data) => {
      setGeneratedKey(data.api_key)
      setCurrentStep(2)
      toast.success('API key generated successfully!')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create API key')
    },
  })

  const steps = [
    { title: 'Basic Info', description: 'Configure API key basics' },
    { title: 'Permissions', description: 'Set permissions and scopes' },
    { title: 'Generated Key', description: 'Save your API key' },
  ]

  const handleCreate = () => {
    const formData = form.getValues()
    createAPIKeyMutation.mutate({
      name: formData.name,
      permissions: formData.permissions,
      scopes: formData.scopes,
      expires_in_days: formData.expiresInDays,
      rate_limit_per_hour: formData.rateLimitPerHour,
      description: formData.description,
    })
  }

  const copyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey)
      toast.success('API key copied to clipboard')
    }
  }

  const downloadKey = () => {
    if (generatedKey) {
      const blob = new Blob([
        `API Key Information\n`,
        `==================\n\n`,
        `Name: ${form.getValues('name')}\n`,
        `Key: ${generatedKey}\n`,
        `Permissions: ${form.getValues('permissions').join(', ')}\n`,
        `Scopes: ${form.getValues('scopes').join(', ')}\n`,
        `Expires: ${form.getValues('expiresInDays') ? `${form.getValues('expiresInDays')} days` : 'Never'}\n`,
        `Created: ${new Date().toISOString()}\n\n`,
        `Important: Store this key securely and never share it publicly.\n`
      ], { type: 'text/plain' })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `api-key-${form.getValues('name').toLowerCase().replace(/\s+/g, '-')}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('API key downloaded')
    }
  }

  const handleComplete = () => {
    if (!keySaved) {
      toast.error('Please confirm that you have saved the API key')
      return
    }
    onComplete?.()
  }

  const renderBasicInfoStep = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="name">API Key Name</Label>
        <Input
          id="name"
          placeholder="e.g., Production API, Mobile App, CRM Integration"
          {...form.register('name')}
          className="mt-1"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Input
          id="description"
          placeholder="Describe what this API key will be used for..."
          {...form.register('description')}
          className="mt-1"
        />
      </div>

      <div>
        <Label>Expiration</Label>
        <Select
          value={form.watch('expiresInDays')?.toString() || 'null'}
          onValueChange={(value) => form.setValue('expiresInDays', value === 'null' ? null : parseInt(value))}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {expirationOptions.map(option => (
              <SelectItem key={option.value || 'null'} value={option.value?.toString() || 'null'}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Rate Limit</Label>
        <Select
          value={form.watch('rateLimitPerHour')?.toString() || 'null'}
          onValueChange={(value) => form.setValue('rateLimitPerHour', value === 'null' ? null : parseInt(value))}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {rateLimitOptions.map(option => (
              <SelectItem key={option.value || 'null'} value={option.value?.toString() || 'null'}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          API keys provide full access to your account based on the permissions you assign.
          Only create keys when necessary and rotate them regularly.
        </AlertDescription>
      </Alert>

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

  const renderPermissionsStep = () => (
    <div className="space-y-6">
      <div>
        <Label>Permissions</Label>
        <p className="text-sm text-gray-600 mt-1">Select what actions this API key can perform</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permission Levels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {permissionOptions.map(permission => (
            <div key={permission.id} className="flex items-start space-x-3">
              <Checkbox
                id={permission.id}
                checked={form.watch('permissions').includes(permission.id)}
                onCheckedChange={(checked) => {
                  const currentPermissions = form.getValues('permissions')
                  if (checked) {
                    form.setValue('permissions', [...currentPermissions, permission.id])
                  } else {
                    form.setValue('permissions', currentPermissions.filter(p => p !== permission.id))
                  }
                }}
              />
              <div className="flex-1">
                <Label htmlFor={permission.id} className="font-medium">
                  {permission.label}
                </Label>
                <p className="text-sm text-gray-600">{permission.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div>
        <Label>Resource Scopes</Label>
        <p className="text-sm text-gray-600 mt-1">Select which resources this API key can access</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resource Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all-scopes"
              checked={form.watch('scopes').includes('all')}
              onCheckedChange={(checked) => {
                if (checked) {
                  form.setValue('scopes', ['all'])
                } else {
                  form.setValue('scopes', [])
                }
              }}
            />
            <Label htmlFor="select-all-scopes" className="font-medium">
              Select All Resources
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {scopeOptions.filter(scope => scope.id !== 'all').map(scope => (
              <div key={scope.id} className="flex items-start space-x-2">
                <Checkbox
                  id={scope.id}
                  checked={form.watch('scopes').includes(scope.id) || form.watch('scopes').includes('all')}
                  disabled={form.watch('scopes').includes('all')}
                  onCheckedChange={(checked) => {
                    const currentScopes = form.getValues('scopes')
                    if (checked) {
                      form.setValue('scopes', [...currentScopes.filter(s => s !== 'all'), scope.id])
                    } else {
                      form.setValue('scopes', currentScopes.filter(s => s !== scope.id))
                    }
                  }}
                />
                <div className="flex-1">
                  <Label htmlFor={scope.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {scope.label}
                  </Label>
                  <p className="text-xs text-gray-600">{scope.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
          onClick={handleCreate}
          disabled={form.watch('permissions').length === 0 || form.watch('scopes').length === 0 || createAPIKeyMutation.isLoading}
          className="flex-1"
        >
          {createAPIKeyMutation.isLoading ? 'Creating...' : 'Create API Key'}
        </Button>
      </div>
    </div>
  )

  const renderKeyGeneratedStep = () => (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> This API key will only be shown once. Please save it securely now.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your API Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>API Key</Label>
            <div className="relative mt-1">
              <Input
                type={showKey ? 'text' : 'password'}
                value={generatedKey}
                readOnly
                className="pr-20 font-mono text-sm"
              />
              <div className="absolute right-1 top-1 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKey(!showKey)}
                  className="h-8 w-8 p-0"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={copyKey}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-gray-600">Name</Label>
              <p className="font-medium">{form.getValues('name')}</p>
            </div>
            <div>
              <Label className="text-gray-600">Permissions</Label>
              <p className="font-medium">{form.getValues('permissions').join(', ')}</p>
            </div>
            <div>
              <Label className="text-gray-600">Scopes</Label>
              <p className="font-medium">{form.getValues('scopes').join(', ')}</p>
            </div>
            <div>
              <Label className="text-gray-600">Expires</Label>
              <p className="font-medium">
                {form.getValues('expiresInDays') ? `${form.getValues('expiresInDays')} days` : 'Never'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={downloadKey}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Key
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage Example</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">cURL Example</Label>
              <pre className="mt-1 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
{`curl -X GET "https://api.example.com/v1/leads" \\
  -H "Authorization: Bearer ${generatedKey}" \\
  -H "Content-Type: application/json"`}
              </pre>
            </div>
            <div>
              <Label className="text-sm font-medium">JavaScript Example</Label>
              <pre className="mt-1 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
{`const response = await fetch('https://api.example.com/v1/leads', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ${generatedKey}',
    'Content-Type': 'application/json'
  }
})`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="key-saved"
          checked={keySaved}
          onCheckedChange={(checked) => setKeySaved(checked)}
        />
        <Label htmlFor="key-saved">
          I have saved this API key in a secure location
        </Label>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep(1)}
          className="flex-1"
          disabled={createAPIKeyMutation.isLoading}
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleComplete}
          disabled={!keySaved}
          className="flex-1"
        >
          Complete
        </Button>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Create API Key</h2>

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
          {currentStep === 1 && renderPermissionsStep()}
          {currentStep === 2 && renderKeyGeneratedStep()}
        </CardContent>
      </Card>
    </div>
  )
}