import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/ui/currency-input'
import { TagInput } from '@/components/ui/tag-input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'
import { generateLeadTags, LeadData, TaggingOptions, validateAndCleanTags } from '@/lib/leadTagging'

const addLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  primaryPhone: z.string().min(10, 'Primary phone number is required'),
  secondaryPhone: z.string().optional().refine((val) => !val || val.length >= 10, {
    message: 'Secondary phone must be valid if provided'
  }),
  alternatePhone: z.string().optional().refine((val) => !val || val.length >= 10, {
    message: 'Alternate phone must be valid if provided'
  }),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zip: z.string().min(5, 'ZIP code is required'),
  county: z.string().optional(),
  parcelId: z.string().optional(),
  propertyType: z.string().min(1, 'Property type is required'),
  acreage: z.number().min(0.01, 'Acreage must be greater than 0').optional(),
  estimatedValue: z.number().min(1, 'Estimated value is required'),
  leadSource: z.string().min(1, 'Lead source is required'),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

type AddLeadForm = z.infer<typeof addLeadSchema>

interface AddLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddLead?: (lead: AddLeadForm) => void
}

export function AddLeadDialog({ open, onOpenChange, onAddLead }: AddLeadDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [manualTags, setManualTags] = useState<string[]>([])
  const [autoTaggingEnabled, setAutoTaggingEnabled] = useState(true)
  const [previewTags, setPreviewTags] = useState<string[]>([])

  const form = useForm<AddLeadForm>({
    resolver: zodResolver(addLeadSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      primaryPhone: '',
      secondaryPhone: '',
      alternatePhone: '',
      email: '',
      street: '',
      city: '',
      state: '',
      zip: '',
      county: '',
      parcelId: '',
      propertyType: '',
      acreage: undefined,
      estimatedValue: 0,
      leadSource: '',
      notes: '',
      tags: [],
    },
  })

  // Generate preview tags when form data changes
  const generatePreviewTags = () => {
    const formData = form.getValues()
    if (!formData.state) return []

    const leadData: LeadData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      address: {
        state: formData.state,
        county: formData.county,
        city: formData.city,
        street: formData.street,
        zip: formData.zip
      },
      property: {
        acreage: formData.acreage,
        propertyType: formData.propertyType,
        estimatedValue: formData.estimatedValue
      }
    }

    if (autoTaggingEnabled) {
      const autoTags = generateLeadTags(leadData, {
        includeTimeTag: true,
        includeGeographicTag: true,
        includePropertyTag: true,
        customUploadDate: new Date()
      })
      return validateAndCleanTags([...autoTags, ...manualTags])
    }
    
    return validateAndCleanTags(manualTags)
  }

  // Update preview tags when relevant fields change
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (['state', 'county', 'acreage'].includes(name || '')) {
        setPreviewTags(generatePreviewTags())
      }
    })
    return () => subscription.unsubscribe()
  }, [form, manualTags, autoTaggingEnabled])

  const onSubmit = async (data: AddLeadForm) => {
    setIsSubmitting(true)
    try {
      // Format phone numbers
      const formatPhone = (phone: string | undefined) => {
        if (!phone) return undefined
        const formattedPhone = phone.replace(/\D/g, '')
        return formattedPhone.startsWith('1') 
          ? `+${formattedPhone}` 
          : `+1${formattedPhone}`
      }

      // Generate final tags
      const finalTags = generatePreviewTags()

      const newLead = {
        ...data,
        primaryPhone: formatPhone(data.primaryPhone)!,
        secondaryPhone: formatPhone(data.secondaryPhone),
        alternatePhone: formatPhone(data.alternatePhone),
        estimatedValue: Number(data.estimatedValue),
        acreage: data.acreage ? Number(data.acreage) : undefined,
        tags: finalTags,
      }

      await onAddLead?.(newLead)
      
      // Reset form and close dialog
      form.reset()
      setManualTags([])
      setPreviewTags([])
      onOpenChange(false)
      
    } catch (error) {
      console.error('Error adding lead:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Enter the lead's information to add them to your database.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...form.register('firstName')}
                  placeholder="John"
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...form.register('lastName')}
                  placeholder="Smith"
                />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="john@example.com"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Phone Numbers Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact Numbers</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="primaryPhone">Primary Phone *</Label>
                <Input
                  id="primaryPhone"
                  {...form.register('primaryPhone')}
                  placeholder="(555) 123-4567"
                />
                {form.formState.errors.primaryPhone && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.primaryPhone.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                <Input
                  id="secondaryPhone"
                  {...form.register('secondaryPhone')}
                  placeholder="(555) 987-6543"
                />
                {form.formState.errors.secondaryPhone && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.secondaryPhone.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="alternatePhone">Alternate Phone</Label>
                <Input
                  id="alternatePhone"
                  {...form.register('alternatePhone')}
                  placeholder="(555) 456-7890"
                />
                {form.formState.errors.alternatePhone && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.alternatePhone.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Address</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  {...form.register('street')}
                  placeholder="123 Main St"
                />
                {form.formState.errors.street && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.street.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    {...form.register('city')}
                    placeholder="Austin"
                  />
                  {form.formState.errors.city && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.city.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    {...form.register('state')}
                    placeholder="TX"
                    maxLength={2}
                  />
                  {form.formState.errors.state && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.state.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    {...form.register('zip')}
                    placeholder="78701"
                  />
                  {form.formState.errors.zip && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.zip.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    {...form.register('county')}
                    placeholder="Travis"
                  />
                </div>

                <div>
                  <Label htmlFor="parcelId">Parcel ID / APN</Label>
                  <Input
                    id="parcelId"
                    {...form.register('parcelId')}
                    placeholder="123-456-789-000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Assessor's Parcel Number for property identification
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Property Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Property Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="propertyType">Property Type</Label>
                <Select onValueChange={(value) => form.setValue('propertyType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vacant Land">Vacant Land</SelectItem>
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Agricultural">Agricultural</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                    <SelectItem value="Mixed Use">Mixed Use</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.propertyType && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.propertyType.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="acreage">Acreage (Optional)</Label>
                <Input
                  id="acreage"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('acreage', { valueAsNumber: true })}
                  placeholder="5.0"
                />
                {form.formState.errors.acreage && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.acreage.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
                <CurrencyInput
                  id="estimatedValue"
                  value={form.watch('estimatedValue') || 0}
                  onChange={(value) => form.setValue('estimatedValue', value)}
                  placeholder="50,000"
                />
                {form.formState.errors.estimatedValue && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.estimatedValue.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="leadSource">Lead Source</Label>
                <Select onValueChange={(value) => form.setValue('leadSource', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="Website Form">Website Form</SelectItem>
                    <SelectItem value="Cold Call">Cold Call</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Direct Mail">Direct Mail</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Trade Show">Trade Show</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.leadSource && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.leadSource.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              placeholder="Any additional notes about this lead..."
              rows={3}
            />
          </div>

          {/* Lead Tagging Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium">Lead Tags</h3>
            </div>
            
            {/* Automatic Tagging Toggle */}
            <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
              <Checkbox
                id="autoTagging"
                checked={autoTaggingEnabled}
                onCheckedChange={setAutoTaggingEnabled}
              />
              <div className="flex-1">
                <Label htmlFor="autoTagging" className="font-medium">
                  Enable automatic tag generation
                </Label>
                <p className="text-sm text-gray-600">
                  Automatically generate time, geographic, and property tags based on lead data
                </p>
              </div>
            </div>

            {/* Preview Tags */}
            {(previewTags.length > 0 || manualTags.length > 0) && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tags that will be applied:</Label>
                <div className="flex flex-wrap gap-2">
                  {previewTags.map((tag, index) => (
                    <Badge key={`preview-${index}`} variant="secondary" className="text-xs">
                      {tag}
                      {autoTaggingEnabled && ['SEP25', 'OCT25', 'NOV25', 'DEC25'].some(timeTag => tag.includes(timeTag.slice(0, 3))) && (
                        <span className="ml-1 text-blue-600" title="Time tag">🕒</span>
                      )}
                      {tag.includes('-') && tag.length <= 6 && (
                        <span className="ml-1 text-green-600" title="Geographic tag">📍</span>
                      )}
                      {tag.includes('AC') && (
                        <span className="ml-1 text-orange-600" title="Property tag">🏞️</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Tags Input */}
            <div className="space-y-2">
              <Label htmlFor="manualTags">Additional Tags (Optional)</Label>
              <TagInput
                value={manualTags}
                onChange={setManualTags}
                placeholder="Add custom tags..."
                maxTags={5}
                autoValidate={true}
              />
              <p className="text-xs text-gray-500">
                Add custom tags for campaign targeting or lead organization
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding Lead...' : 'Add Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}