import { useState, useEffect } from 'react'
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

const editLeadSchema = z.object({
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
  zipCode: z.string().min(5, 'ZIP code is required'),
  parcelId: z.string().optional(),
  propertyType: z.string().min(1, 'Property type is required'),
  propertyValue: z.coerce.number().min(0, 'Property value must be positive'),
  leadSource: z.string().min(1, 'Lead source is required'),
  status: z.string().min(1, 'Status is required'),
  notes: z.string().optional()
})

type EditLeadForm = z.infer<typeof editLeadSchema>

interface EditLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead?: any
  onUpdateLead?: (leadId: number, lead: EditLeadForm) => void
}

export function EditLeadDialog({ open, onOpenChange, lead, onUpdateLead }: EditLeadDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<EditLeadForm>({
    resolver: zodResolver(editLeadSchema),
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
      zipCode: '',
      parcelId: '',
      propertyType: '',
      propertyValue: 0,
      leadSource: '',
      status: '',
      notes: ''
    }
  })

  // Update form values when lead changes
  useEffect(() => {
    if (lead) {
      form.reset({
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        primaryPhone: lead.primaryPhone || '',
        secondaryPhone: lead.secondaryPhone || '',
        alternatePhone: lead.alternatePhone || '',
        email: lead.email || '',
        street: lead.address?.street || '',
        city: lead.address?.city || '',
        state: lead.address?.state || '',
        zipCode: lead.address?.zip || '',
        parcelId: lead.property?.parcelId || '',
        propertyType: lead.property?.propertyType || '',
        propertyValue: lead.property?.estimatedValue || 0,
        leadSource: lead.leadSource || 'Website Form',
        status: lead.status || 'new',
        notes: lead.notes || ''
      })
    }
  }, [lead, form])

  const onSubmit = async (data: EditLeadForm) => {
    if (!lead?.id) return
    
    setIsSubmitting(true)
    try {
      await onUpdateLead?.(lead.id, data)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update lead:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
          <DialogDescription>
            Update the lead information below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  {...form.register('firstName')}
                  placeholder="Enter first name"
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  {...form.register('lastName')}
                  placeholder="Enter last name"
                />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                placeholder="Enter email address"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          </div>

          {/* Phone Numbers */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Phone Numbers</h3>
            
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
                  placeholder="(555) 123-4567"
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
                  placeholder="(555) 123-4567"
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
            <h3 className="text-lg font-medium border-b pb-2">Address Information</h3>
            
            <div>
              <Label htmlFor="street">Street Address *</Label>
              <Input
                id="street"
                {...form.register('street')}
                placeholder="Enter street address"
              />
              {form.formState.errors.street && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.street.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...form.register('city')}
                  placeholder="Enter city"
                />
                {form.formState.errors.city && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.city.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="state">State *</Label>
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
                <Label htmlFor="zipCode">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  {...form.register('zipCode')}
                  placeholder="12345"
                />
                {form.formState.errors.zipCode && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.zipCode.message}
                  </p>
                )}
              </div>
            </div>

            {/* Parcel ID */}
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

          {/* Property & Lead Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Property & Lead Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="propertyType">Property Type *</Label>
                <Select value={form.watch('propertyType')} onValueChange={(value) => form.setValue('propertyType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vacant Land">Vacant Land</SelectItem>
                    <SelectItem value="Single Family">Single Family</SelectItem>
                    <SelectItem value="Condo">Condo</SelectItem>
                    <SelectItem value="Townhouse">Townhouse</SelectItem>
                    <SelectItem value="Multi Family">Multi Family</SelectItem>
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
                <Label htmlFor="propertyValue">Property Value ($) *</Label>
                <CurrencyInput
                  id="propertyValue"
                  value={form.watch('propertyValue') || 0}
                  onChange={(value) => form.setValue('propertyValue', value)}
                  placeholder="250,000"
                />
                {form.formState.errors.propertyValue && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.propertyValue.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Lead Status *</Label>
                <Select value={form.watch('status')} onValueChange={(value) => form.setValue('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="appointment">Appointment</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.status && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.status.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="leadSource">Lead Source *</Label>
                <Select value={form.watch('leadSource')} onValueChange={(value) => form.setValue('leadSource', value)}>
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
              {isSubmitting ? 'Updating Lead...' : 'Update Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}