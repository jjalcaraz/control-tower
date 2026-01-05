import React, { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useMutation } from '@tanstack/react-query'
import { useBulkOptOut } from '@/hooks/use-api'
import { toast } from 'sonner'

const bulkOptOutSchema = z.object({
  source: z.enum(['manual', 'keyword', 'complaint']),
  reason: z.string().optional(),
  phoneNumbers: z.string().min(1, 'Please enter phone numbers'),
})

type BulkOptOutFormValues = z.infer<typeof bulkOptOutSchema>

interface BulkOptOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

export function BulkOptOutDialog({ open, onOpenChange, onComplete }: BulkOptOutDialogProps) {
  const [step, setStep] = useState<'input' | 'preview' | 'processing'>('input')
  const [phoneList, setPhoneList] = useState<string[]>([])
  const [invalidPhones, setInvalidPhones] = useState<string[]>([])
  const [processedCount, setProcessedCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<BulkOptOutFormValues>({
    resolver: zodResolver(bulkOptOutSchema),
    defaultValues: {
      source: 'manual',
      reason: '',
      phoneNumbers: '',
    },
  })

  const bulkOptOutMutation = useBulkOptOut({
    onSuccess: (data) => {
      toast.success(`Successfully processed ${data.success_count} opt-outs`)
      if (data.error_count > 0) {
        toast.warning(`${data.error_count} phone numbers failed to process`)
      }
      onComplete?.()
      handleClose()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to process bulk opt-out')
      setStep('input')
    },
  })

  const handleClose = () => {
    form.reset()
    setStep('input')
    setPhoneList([])
    setInvalidPhones([])
    setProcessedCount(0)
    onOpenChange(false)
  }

  const parsePhoneNumbers = (input: string): { valid: string[]; invalid: string[] } => {
    const lines = input
      .split(/[\n,\s]+/)
      .map(line => line.trim())
      .filter(line => line.length > 0)

    const valid: string[] = []
    const invalid: string[] = []

    lines.forEach(line => {
      // Basic phone number validation - can be enhanced
      const cleanPhone = line.replace(/[^\d+]/g, '')
      if (/^[\+]?[1-9]\d{1,14}$/.test(cleanPhone)) {
        valid.push(cleanPhone)
      } else {
        invalid.push(line)
      }
    })

    return { valid, invalid }
  }

  const handlePreview = () => {
    const phoneNumbers = form.getValues('phoneNumbers')
    const { valid, invalid } = parsePhoneNumbers(phoneNumbers)

    if (valid.length === 0) {
      toast.error('No valid phone numbers found')
      return
    }

    setPhoneList(valid)
    setInvalidPhones(invalid)
    setStep('preview')
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      form.setValue('phoneNumbers', content)
    }
    reader.readAsText(file)
  }

  const handleProcess = async () => {
    setStep('processing')
    setProcessedCount(0)

    // Simulate progress
    const total = phoneList.length
    const batchSize = 10
    const batches = Math.ceil(total / batchSize)

    for (let i = 0; i < batches; i++) {
      const batch = phoneList.slice(i * batchSize, (i + 1) * batchSize)

      try {
        await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API delay
        setProcessedCount((i + 1) * batchSize)
      } catch (error) {
        console.error('Batch processing error:', error)
      }
    }

    // Call the actual API
    bulkOptOutMutation.mutate({
      phoneNumbers: phoneList,
      reason: form.getValues('reason'),
      source: form.getValues('source'),
    })
  }

  const renderInputStep = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="phoneNumbers">Phone Numbers</Label>
        <Textarea
          id="phoneNumbers"
          placeholder="Enter phone numbers, one per line or separated by commas. Example:&#10;+12125551234&#10;+13105555678&#10;+14155555901"
          rows={10}
          {...form.register('phoneNumbers')}
          className="mt-1 font-mono text-sm"
        />
        <p className="text-sm text-gray-600 mt-1">
          Supports E.164 format with country code (e.g., +12125551234)
        </p>
      </div>

      <div>
        <Label>Or upload a file</Label>
        <div className="mt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose File
          </Button>
          <span className="ml-2 text-sm text-gray-600">
            TXT or CSV files with one phone number per line
          </span>
        </div>
      </div>

      <div>
        <Label htmlFor="source">Source</Label>
        <Select value={form.watch('source')} onValueChange={(value) => form.setValue('source', value as 'manual' | 'keyword' | 'complaint')}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual Entry</SelectItem>
            <SelectItem value="keyword">Keyword Response</SelectItem>
            <SelectItem value="complaint">User Complaint</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="reason">Reason (Optional)</Label>
        <Textarea
          id="reason"
          placeholder="Optional reason for opt-out..."
          rows={3}
          {...form.register('reason')}
          className="mt-1"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button type="button" onClick={handlePreview}>
          Preview & Process
        </Button>
      </DialogFooter>
    </div>
  )

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          Found <span className="font-semibold">{phoneList.length}</span> valid phone numbers
          {invalidPhones.length > 0 && (
            <>
              {" and "}
              <span className="font-semibold text-red-600">{invalidPhones.length}</span> invalid numbers
            </>
          )}
        </AlertDescription>
      </Alert>

      {phoneList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Valid Phone Numbers ({phoneList.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-40 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {phoneList.map((phone, index) => (
                  <div key={index} className="font-mono">{phone}</div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {invalidPhones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-600">Invalid Phone Numbers ({invalidPhones.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-40 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 text-sm text-red-600">
                {invalidPhones.map((phone, index) => (
                  <div key={index} className="font-mono">{phone}</div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Source:</span>
            <span className="font-medium capitalize">{form.getValues('source')}</span>
          </div>
          <div className="flex justify-between">
            <span>Reason:</span>
            <span className="font-medium">
              {form.getValues('reason') || 'No reason provided'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Total to process:</span>
            <span className="font-medium">{phoneList.length} phone numbers</span>
          </div>
        </CardContent>
      </Card>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setStep('input')}>
          Back
        </Button>
        <Button
          type="button"
          onClick={handleProcess}
          disabled={phoneList.length === 0}
        >
          Process Opt-Outs
        </Button>
      </DialogFooter>
    </div>
  )

  const renderProcessingStep = () => {
    const progress = Math.min((processedCount / phoneList.length) * 100, 100)

    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>
            Processing {phoneList.length} phone numbers for opt-out...
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.min(processedCount, phoneList.length)} / {phoneList.length}</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {bulkOptOutMutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              Error processing opt-outs: {bulkOptOutMutation.error.message}
            </AlertDescription>
          </Alert>
        )}

        {bulkOptOutMutation.isSuccess && (
          <Alert>
            <AlertDescription>
              Successfully processed opt-outs!
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={bulkOptOutMutation.isLoading}
          >
            Close
          </Button>
        </DialogFooter>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Opt-Out</DialogTitle>
        </DialogHeader>

        {step === 'input' && renderInputStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'processing' && renderProcessingStep()}
      </DialogContent>
    </Dialog>
  )
}
