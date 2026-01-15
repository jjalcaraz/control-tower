import { useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'

const exportSchema = z.object({
  format: z.enum(['csv', 'excel'], { required_error: 'Please select a format' }),
  filterType: z.enum(['all', 'selected', 'filtered'], { required_error: 'Please select which leads to export' }),
  includeFields: z.object({
    personalInfo: z.boolean().default(true),
    contactInfo: z.boolean().default(true),
    addressInfo: z.boolean().default(true),
    propertyInfo: z.boolean().default(true),
    leadInfo: z.boolean().default(true),
    notes: z.boolean().default(false)
  }),
  dateRange: z.string().optional()
})

type ExportForm = z.infer<typeof exportSchema>

interface ExportLeadsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLeadsCount?: number
  filteredLeadsCount?: number
  totalLeadsCount?: number
  onExport?: (options: ExportForm) => void
}

export function ExportLeadsDialog({ 
  open, 
  onOpenChange, 
  selectedLeadsCount = 0,
  filteredLeadsCount = 0,
  totalLeadsCount = 0,
  onExport 
}: ExportLeadsDialogProps) {
  const [isExporting, setIsExporting] = useState(false)

  const form = useForm<ExportForm>({
    resolver: zodResolver(exportSchema),
    defaultValues: {
      format: 'csv',
      filterType: 'all',
      includeFields: {
        personalInfo: true,
        contactInfo: true,
        addressInfo: true,
        propertyInfo: true,
        leadInfo: true,
        notes: false
      }
    }
  })

  const onSubmit = async (data: ExportForm) => {
    setIsExporting(true)
    try {
      await onExport?.(data)
      onOpenChange(false)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const watchFilterType = form.watch('filterType')
  const watchFormat = form.watch('format')
  const watchIncludeFields = form.watch('includeFields')

  const getLeadCount = () => {
    switch (watchFilterType) {
      case 'selected':
        return selectedLeadsCount
      case 'filtered':
        return filteredLeadsCount
      case 'all':
      default:
        return totalLeadsCount
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Leads
          </DialogTitle>
          <DialogDescription>
            Choose your export options and download your leads data.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Export Format */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <RadioGroup
              value={watchFormat}
              onValueChange={(value) => form.setValue('format', value as 'csv' | 'excel')}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  CSV
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Label>
              </div>
            </RadioGroup>
            {form.formState.errors.format && (
              <p className="text-sm text-red-600">
                {form.formState.errors.format.message}
              </p>
            )}
          </div>

          <Separator />

          {/* What to Export */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">What to Export</Label>
            <RadioGroup
              value={watchFilterType}
              onValueChange={(value) => form.setValue('filterType', value as 'all' | 'selected' | 'filtered')}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="cursor-pointer">All leads</Label>
                </div>
                <span className="text-sm text-gray-500">({totalLeadsCount} leads)</span>
              </div>
              
              {selectedLeadsCount > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="selected" id="selected" />
                    <Label htmlFor="selected" className="cursor-pointer">Selected leads only</Label>
                  </div>
                  <span className="text-sm text-gray-500">({selectedLeadsCount} leads)</span>
                </div>
              )}
              
              {filteredLeadsCount > 0 && filteredLeadsCount !== totalLeadsCount && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="filtered" id="filtered" />
                    <Label htmlFor="filtered" className="cursor-pointer">Current filtered results</Label>
                  </div>
                  <span className="text-sm text-gray-500">({filteredLeadsCount} leads)</span>
                </div>
              )}
            </RadioGroup>
            {form.formState.errors.filterType && (
              <p className="text-sm text-red-600">
                {form.formState.errors.filterType.message}
              </p>
            )}
          </div>

          <Separator />

          {/* Fields to Include */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Fields to Include</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="personalInfo"
                  checked={watchIncludeFields.personalInfo}
                  onCheckedChange={(checked) => 
                    form.setValue('includeFields.personalInfo', checked === true)
                  }
                />
                <Label htmlFor="personalInfo" className="text-sm cursor-pointer">
                  Personal Information (Name)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contactInfo"
                  checked={watchIncludeFields.contactInfo}
                  onCheckedChange={(checked) => 
                    form.setValue('includeFields.contactInfo', checked === true)
                  }
                />
                <Label htmlFor="contactInfo" className="text-sm cursor-pointer">
                  Contact Information (Phone, Email)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="addressInfo"
                  checked={watchIncludeFields.addressInfo}
                  onCheckedChange={(checked) => 
                    form.setValue('includeFields.addressInfo', checked === true)
                  }
                />
                <Label htmlFor="addressInfo" className="text-sm cursor-pointer">
                  Address Information
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="propertyInfo"
                  checked={watchIncludeFields.propertyInfo}
                  onCheckedChange={(checked) => 
                    form.setValue('includeFields.propertyInfo', checked === true)
                  }
                />
                <Label htmlFor="propertyInfo" className="text-sm cursor-pointer">
                  Property Information
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="leadInfo"
                  checked={watchIncludeFields.leadInfo}
                  onCheckedChange={(checked) => 
                    form.setValue('includeFields.leadInfo', checked === true)
                  }
                />
                <Label htmlFor="leadInfo" className="text-sm cursor-pointer">
                  Lead Information (Status, Source, Date)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notes"
                  checked={watchIncludeFields.notes}
                  onCheckedChange={(checked) => 
                    form.setValue('includeFields.notes', checked === true)
                  }
                />
                <Label htmlFor="notes" className="text-sm cursor-pointer">
                  Notes
                </Label>
              </div>
            </div>
          </div>

          {/* Export Preview */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm">
              <div className="font-medium mb-1">Export Preview</div>
              <div className="text-gray-600">
                Format: {watchFormat?.toUpperCase()}<br />
                Leads: {getLeadCount()} records<br />
                Fields: {Object.values(watchIncludeFields).filter(Boolean).length} field groups
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isExporting || getLeadCount() === 0}>
              {isExporting ? (
                <>Exporting...</>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {getLeadCount()} Leads
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}