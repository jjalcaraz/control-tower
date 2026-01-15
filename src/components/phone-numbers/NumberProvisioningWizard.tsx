import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { usePurchasePhoneNumber } from '@/hooks/use-api'
import { toast } from 'sonner'

const purchaseFormSchema = z.object({
  areaCode: z.string().min(3, 'Area code must be at least 3 characters'),
  numberType: z.enum(['local', 'tollfree']),
  mps: z.number().min(1).max(10),
  dailyCap: z.number().min(1),
  quietHours: z.boolean(),
  quietStart: z.string().optional(),
  quietEnd: z.string().optional(),
  timezone: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, 'You must accept the terms and conditions'),
})

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>

interface NumberProvisioningWizardProps {
  onComplete: () => void
  onCancel: () => void
}

export function NumberProvisioningWizard({ onComplete, onCancel }: NumberProvisioningWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      areaCode: '',
      numberType: 'local',
      mps: 1,
      dailyCap: 1000,
      quietHours: false,
      timezone: 'UTC',
      acceptTerms: false,
    },
  })

  const purchaseMutation = usePurchasePhoneNumber({
    onSuccess: () => {
      toast.success('Phone number purchased successfully!')
      onComplete()
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to purchase phone number'
      toast.error(message)
    },
  })

  const steps = [
    { title: 'Area Code', description: 'Select your preferred area code' },
    { title: 'Number Selection', description: 'Choose a phone number' },
    { title: 'Configuration', description: 'Set up number settings' },
    { title: 'Review & Purchase', description: 'Review and complete purchase' },
  ]

  const searchNumbers = async (areaCode: string) => {
    setIsSearching(true)
    try {
      // Mock search results - in production, call real API
      const mockResults = Array.from({ length: 10 }, () => ({
        phoneNumber: `+1${areaCode}${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
        capabilities: ['SMS', 'Voice'],
        monthlyFee: 1.15,
        setupFee: 1.00,
        provider: 'Twilio',
      }))
      setSearchResults(mockResults)
    } catch (error) {
      toast.error('Failed to search for numbers')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAreaCodeNext = async () => {
    const areaCode = form.getValues('areaCode')
    if (areaCode) {
      await searchNumbers(areaCode)
      setCurrentStep(1)
    }
  }

  const handlePurchase = () => {
    if (!selectedNumber) return

    const formData = form.getValues()
    purchaseMutation.mutate({
      phone_number: selectedNumber,
      area_code: formData.areaCode,
      number_type: formData.numberType,
      settings: {
        mps: formData.mps,
        daily_cap: formData.dailyCap,
        quiet_hours: formData.quietHours,
        quiet_start: formData.quietStart,
        quiet_end: formData.quietEnd,
        timezone: formData.timezone,
      },
    })
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="areaCode">Area Code</Label>
              <Input
                id="areaCode"
                placeholder="e.g., 212, 415, 310"
                {...form.register('areaCode')}
                className="mt-1"
              />
              {form.formState.errors.areaCode && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.areaCode.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="numberType">Number Type</Label>
              <Select value={form.watch('numberType')} onValueChange={(value) => form.setValue('numberType', value as 'local' | 'tollfree')}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local Number</SelectItem>
                  <SelectItem value="tollfree">Toll-Free Number</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAreaCodeNext}
              disabled={!form.watch('areaCode') || isSearching}
              className="w-full"
            >
              {isSearching ? 'Searching...' : 'Search Numbers'}
            </Button>
          </div>
        )

      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {searchResults.map((result, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-colors ${
                    selectedNumber === result.phoneNumber ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedNumber(result.phoneNumber)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-lg">{result.phoneNumber}</p>
                        <div className="flex gap-2 mt-2">
                          {result.capabilities.map((cap: string) => (
                            <Badge key={cap} variant="secondary">
                              {cap}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">${result.monthlyFee}/month</p>
                        <p className="text-xs text-gray-500">${result.setupFee} setup</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(0)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!selectedNumber}
                className="flex-1"
              >
                Next
              </Button>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label>Messages Per Second (MPS)</Label>
              <div className="mt-2">
                <Slider
                  value={[form.watch('mps')]}
                  onValueChange={([value]) => form.setValue('mps', value)}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>1</span>
                  <span className="font-medium">{form.watch('mps')} MPS</span>
                  <span>10</span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="dailyCap">Daily Message Cap</Label>
              <Input
                id="dailyCap"
                type="number"
                {...form.register('dailyCap', { valueAsNumber: true })}
                className="mt-1"
              />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="quietHours"
                  checked={form.watch('quietHours')}
                  onCheckedChange={(checked) => form.setValue('quietHours', checked as boolean)}
                />
                <Label htmlFor="quietHours">Enable Quiet Hours</Label>
              </div>
            </div>

            {form.watch('quietHours') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quietStart">Start Time</Label>
                  <Input
                    id="quietStart"
                    type="time"
                    {...form.register('quietStart')}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="quietEnd">End Time</Label>
                  <Input
                    id="quietEnd"
                    type="time"
                    {...form.register('quietEnd')}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={form.watch('timezone')} onValueChange={(value) => form.setValue('timezone', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                className="flex-1"
              >
                Review
              </Button>
            </div>
          </div>
        )

      case 3:
        const formData = form.getValues()
        const selectedNumberData = searchResults.find(n => n.phoneNumber === selectedNumber)

        return (
          <div className="space-y-6">
            <Alert>
              <AlertDescription>
                Please review your selection and configuration before purchasing.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Number Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone Number:</span>
                  <span className="font-medium">{selectedNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Capabilities:</span>
                  <div className="flex gap-1">
                    {selectedNumberData?.capabilities.map((cap: string) => (
                      <Badge key={cap} variant="secondary">{cap}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Fee:</span>
                  <span className="font-medium">${selectedNumberData?.monthlyFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Setup Fee:</span>
                  <span className="font-medium">${selectedNumberData?.setupFee}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">MPS Limit:</span>
                  <span className="font-medium">{formData.mps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Daily Cap:</span>
                  <span className="font-medium">{formData.dailyCap}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quiet Hours:</span>
                  <span className="font-medium">
                    {formData.quietHours ? `${formData.quietStart} - ${formData.quietEnd}` : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Timezone:</span>
                  <span className="font-medium">{formData.timezone}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="acceptTerms"
                checked={form.watch('acceptTerms')}
                onCheckedChange={(checked) => form.setValue('acceptTerms', checked as boolean)}
              />
              <Label htmlFor="acceptTerms">
                I accept the terms and conditions for this phone number purchase
              </Label>
            </div>

            {form.formState.errors.acceptTerms && (
              <p className="text-sm text-red-600">{form.formState.errors.acceptTerms.message}</p>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="flex-1"
                disabled={purchaseMutation.isLoading}
              >
                Back
              </Button>
              <Button
                onClick={handlePurchase}
                disabled={!form.watch('acceptTerms') || purchaseMutation.isLoading}
                className="flex-1"
              >
                {purchaseMutation.isLoading ? 'Purchasing...' : 'Complete Purchase'}
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Purchase Phone Number</h2>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <Progress value={(currentStep + 1) / (steps.length) * 100} className="mb-4" />

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
          {renderStep()}
        </CardContent>
      </Card>
    </div>
  )
}
