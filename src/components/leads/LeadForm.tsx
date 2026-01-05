import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Lead } from '@/types/lead'

const leadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  primaryPhone: z.string().min(10, 'Primary phone number must be at least 10 digits'),
  secondaryPhone: z.string().optional().or(z.literal('')),
  alternatePhone: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required'),
    zip: z.string().min(5, 'ZIP code is required'),
    county: z.string().min(1, 'County is required'),
  }),
  property: z.object({
    parcelId: z.string().optional(),
    acreage: z.number().optional(),
    estimatedValue: z.number().optional(),
    propertyType: z.string().min(1, 'Property type is required'),
  }),
  leadSource: z.string().min(1, 'Lead source is required'),
  status: z.enum(['new', 'contacted', 'interested', 'not_interested', 'do_not_contact']),
  score: z.enum(['cold', 'warm', 'hot']),
  tags: z.array(z.string()).default([]),
})

type LeadFormData = z.infer<typeof leadSchema>

interface LeadFormProps {
  lead?: Partial<Lead>
  onSubmit: (data: LeadFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

export function LeadForm({ lead, onSubmit, onCancel, isLoading }: LeadFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      firstName: lead?.firstName || '',
      lastName: lead?.lastName || '',
      primaryPhone: lead?.primaryPhone || (lead as any)?.phone || '',
      secondaryPhone: lead?.secondaryPhone || '',
      alternatePhone: lead?.alternatePhone || '',
      email: lead?.email || '',
      address: {
        street: lead?.address?.street || '',
        city: lead?.address?.city || '',
        state: lead?.address?.state || '',
        zip: lead?.address?.zip || '',
        county: lead?.address?.county || '',
      },
      property: {
        parcelId: lead?.property?.parcelId || '',
        acreage: lead?.property?.acreage || undefined,
        estimatedValue: lead?.property?.estimatedValue || undefined,
        propertyType: lead?.property?.propertyType || '',
      },
      leadSource: lead?.leadSource || '',
      status: lead?.status || 'new',
      score: lead?.score || 'cold',
      tags: lead?.tags || [],
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium">
                First Name
              </label>
              <Input
                id="firstName"
                {...register('firstName')}
                className={errors.firstName ? 'border-destructive' : ''}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium">
                Last Name
              </label>
              <Input
                id="lastName"
                {...register('lastName')}
                className={errors.lastName ? 'border-destructive' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="primaryPhone" className="text-sm font-medium">
                Primary Phone
              </label>
              <Input
                id="primaryPhone"
                type="tel"
                {...register('primaryPhone')}
                className={errors.primaryPhone ? 'border-destructive' : ''}
              />
              {errors.primaryPhone && (
                <p className="text-sm text-destructive">{errors.primaryPhone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email (Optional)
              </label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="secondaryPhone" className="text-sm font-medium">
                Secondary Phone (Optional)
              </label>
              <Input
                id="secondaryPhone"
                type="tel"
                {...register('secondaryPhone')}
                className={errors.secondaryPhone ? 'border-destructive' : ''}
              />
              {errors.secondaryPhone && (
                <p className="text-sm text-destructive">{errors.secondaryPhone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="alternatePhone" className="text-sm font-medium">
                Alternate Phone (Optional)
              </label>
              <Input
                id="alternatePhone"
                type="tel"
                {...register('alternatePhone')}
                className={errors.alternatePhone ? 'border-destructive' : ''}
              />
              {errors.alternatePhone && (
                <p className="text-sm text-destructive">{errors.alternatePhone.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle>Address Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="street" className="text-sm font-medium">
              Street Address
            </label>
            <Input
              id="street"
              {...register('address.street')}
              className={errors.address?.street ? 'border-destructive' : ''}
            />
            {errors.address?.street && (
              <p className="text-sm text-destructive">{errors.address.street.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="city" className="text-sm font-medium">
                City
              </label>
              <Input
                id="city"
                {...register('address.city')}
                className={errors.address?.city ? 'border-destructive' : ''}
              />
              {errors.address?.city && (
                <p className="text-sm text-destructive">{errors.address.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="state" className="text-sm font-medium">
                State
              </label>
              <Input
                id="state"
                {...register('address.state')}
                className={errors.address?.state ? 'border-destructive' : ''}
              />
              {errors.address?.state && (
                <p className="text-sm text-destructive">{errors.address.state.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="zip" className="text-sm font-medium">
                ZIP Code
              </label>
              <Input
                id="zip"
                {...register('address.zip')}
                className={errors.address?.zip ? 'border-destructive' : ''}
              />
              {errors.address?.zip && (
                <p className="text-sm text-destructive">{errors.address.zip.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="county" className="text-sm font-medium">
              County
            </label>
            <Input
              id="county"
              {...register('address.county')}
              className={errors.address?.county ? 'border-destructive' : ''}
            />
            {errors.address?.county && (
              <p className="text-sm text-destructive">{errors.address.county.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Property Information */}
      <Card>
        <CardHeader>
          <CardTitle>Property Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="propertyType" className="text-sm font-medium">
                Property Type
              </label>
              <Select onValueChange={(value) => setValue('property.propertyType', value)}>
                <SelectTrigger className={errors.property?.propertyType ? 'border-destructive' : ''}>
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
              {errors.property?.propertyType && (
                <p className="text-sm text-destructive">{errors.property.propertyType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="parcelId" className="text-sm font-medium">
                Parcel ID (Optional)
              </label>
              <Input
                id="parcelId"
                {...register('property.parcelId')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="acreage" className="text-sm font-medium">
                Acreage (Optional)
              </label>
              <Input
                id="acreage"
                type="number"
                step="0.01"
                {...register('property.acreage', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="estimatedValue" className="text-sm font-medium">
                Estimated Value (Optional)
              </label>
              <CurrencyInput
                id="estimatedValue"
                onChange={(value) => setValue('property.estimatedValue', value)}
                placeholder="250,000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Details */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="leadSource" className="text-sm font-medium">
                Lead Source
              </label>
              <Select onValueChange={(value) => setValue('leadSource', value)}>
                <SelectTrigger className={errors.leadSource ? 'border-destructive' : ''}>
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
              {errors.leadSource && (
                <p className="text-sm text-destructive">{errors.leadSource.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <select
                id="status"
                {...register('status')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="interested">Interested</option>
                <option value="not_interested">Not Interested</option>
                <option value="do_not_contact">Do Not Contact</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="score" className="text-sm font-medium">
                Lead Score
              </label>
              <select
                id="score"
                {...register('score')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="cold">Cold</option>
                <option value="warm">Warm</option>
                <option value="hot">Hot</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : lead ? 'Update Lead' : 'Create Lead'}
        </Button>
      </div>
    </form>
  )
}
