import { useState, useRef, useCallback, useEffect as ReactUseEffect } from 'react'
import { Upload, AlertCircle, CheckCircle, Tag, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { useImportLeads, useImportStatus } from '@/hooks/use-api'
import { cn } from '@/lib/utils'
import {
  generateLeadTags,
  LeadData,
  TaggingOptions,
  validateAndCleanTags,
} from '@/lib/leadTagging'
// import Papa from 'papaparse' // Commented out due to install issues

interface ImportLeadsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CSVRow {
  [key: string]: string
}

interface FieldMapping {
  [csvField: string]: string
}

const REQUIRED_FIELDS = [
  { key: 'firstName', label: 'First Name', required: false }, // Encouraged but not mandatory
  { key: 'lastName', label: 'Last Name', required: false },  // Optional for phone-only contacts
  { key: 'primaryPhone', label: 'Primary Phone Number', required: true },
]

const OPTIONAL_FIELDS = [
  { key: 'secondaryPhone', label: 'Secondary Phone Number', required: false },
  { key: 'alternatePhone', label: 'Alternate Phone Number', required: false },
  { key: 'email', label: 'Email Address', required: false },
  { key: 'address.street', label: 'Street Address', required: false },
  { key: 'address.city', label: 'City', required: false },
  { key: 'address.state', label: 'State', required: false },
  { key: 'address.zip', label: 'ZIP Code', required: false },
  { key: 'address.county', label: 'County', required: false },
  { key: 'property.propertyType', label: 'Property Type', required: false },
  { key: 'property.acreage', label: 'Acreage', required: false },
  { key: 'property.estimatedValue', label: 'Estimated Value', required: false },
  { key: 'property.parcelId', label: 'Parcel ID', required: false },
  { key: 'leadSource', label: 'Lead Source', required: false },
  { key: 'tags', label: 'Tags (comma-separated)', required: false },
]

// const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]

export function ImportLeadsDialog({ open, onOpenChange }: ImportLeadsDialogProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({})
  const [previewData, setPreviewData] = useState<any[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importResult, setImportResult] = useState<{ successful: number; failed: number } | null>(null)
  const [bulkTags, setBulkTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [autoTaggingEnabled, setAutoTaggingEnabled] = useState(true)
  const [taggingOptions, setTaggingOptions] = useState<TaggingOptions>({
    includeTimeTag: true,
    includeGeographicTag: true,
    includePropertyTag: true,
    customUploadDate: new Date()
  })
  const [importId, setImportId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const importMutation = useImportLeads()
  const { data: importStatus } = useImportStatus(importId || '')

  // Tag management functions
  const addBulkTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !bulkTags.includes(trimmedTag)) {
      setBulkTags(prev => [...prev, trimmedTag])
    }
  }, [bulkTags])

  const removeBulkTag = useCallback((tagToRemove: string) => {
    setBulkTags(prev => prev.filter(tag => tag !== tagToRemove))
  }, [])

  const handleTagInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (tagInput.trim()) {
        addBulkTag(tagInput.trim())
        setTagInput('')
      }
    }
  }, [tagInput, addBulkTag])

  // Auto-generate campaign tag with current date
  const generateCampaignTag = useCallback(() => {
    const now = new Date()
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    const campaignTag = `${now.getFullYear()} ${monthNames[now.getMonth()]} Campaign`
    if (!bulkTags.includes(campaignTag)) {
      addBulkTag(campaignTag)
    }
  }, [bulkTags, addBulkTag])

  const parseCSV = useCallback((csvContent: string): Promise<{ headers: string[]; rows: CSVRow[] }> => {
    return new Promise((resolve, reject) => {
      try {
        // Enhanced CSV parsing that handles quoted fields and commas within quotes
        const lines = csvContent.split('\n').filter(line => line.trim())

        if (lines.length === 0) {
          resolve({ headers: [], rows: [] })
          return
        }

        // Parse headers with proper quote handling
        const headerLine = lines[0]
        const headers = parseCSVLine(headerLine)

        if (headers.length === 0) {
          resolve({ headers: [], rows: [] })
          return
        }

        // Parse data rows
        const rows: CSVRow[] = []
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue // Skip empty lines

          const values = parseCSVLine(line)
          const row: CSVRow = {}

          headers.forEach((header, index) => {
            row[header] = values[index] || ''
          })

          // Only add non-empty rows
          if (Object.values(row).some(val => val.trim() !== '')) {
            rows.push(row)
          }
        }

        resolve({ headers, rows })
      } catch (error) {
        reject(new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }, [])

  // Helper function to parse a CSV line handling quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote within quotes
          current += '"'
          i += 2 // Skip both quotes
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes
          i++
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim())
        current = ''
        i++
      } else {
        current += char
        i++
      }
    }

    // Add the last field
    result.push(current.trim())

    return result
  }

  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    if (!uploadedFile) return

    try {
      const text = await uploadedFile.text()
      const { headers, rows } = await parseCSV(text)

      if (headers.length === 0 || rows.length === 0) {
        setErrors(['Invalid CSV file format. Please ensure the file has headers and data rows.'])
        return
      }

      setFile(uploadedFile)
      setCsvHeaders(headers)
      setCsvData(rows)
      setStep('mapping')
      setErrors([])
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to parse CSV file.'])
    }
  }, [parseCSV])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv'))) {
        handleFileUpload(droppedFile)
      } else {
        setErrors(['Please upload a valid CSV file.'])
      }
    },
    [handleFileUpload]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        handleFileUpload(selectedFile)
      }
    },
    [handleFileUpload]
  )

  const validateMapping = useCallback((): boolean => {
    const newErrors: string[] = []

    // Check required fields are mapped (only primaryPhone is truly required)
    REQUIRED_FIELDS.forEach(field => {
      if (field.required) {
        const isMapped = Object.values(fieldMapping).includes(field.key)
        if (!isMapped) {
          newErrors.push(`${field.label} is required but not mapped`)
        }
      }
    })

    setErrors(newErrors)
    return newErrors.length === 0
  }, [fieldMapping])

  const generatePreview = useCallback(() => {
    if (!validateMapping()) return

    const preview = csvData.slice(0, 5).map((row, index) => {
      const leadData: any = { 
        _rowIndex: index + 1,
        address: {},
        property: {}
      }

      // Map CSV fields to lead data
      Object.entries(fieldMapping).forEach(([csvField, leadField]) => {
        const value = row[csvField]?.trim()
        if (value) {
          if (leadField.includes('.')) {
            const [parent, child] = leadField.split('.')
            if (!leadData[parent]) leadData[parent] = {}
            leadData[parent][child] = child === 'acreage' ? parseFloat(value) || 0 : value
          } else if (leadField === 'tags') {
            // Handle CSV tags (comma-separated)
            const csvTags = value.split(',').map(t => t.trim()).filter(Boolean)
            leadData[leadField] = csvTags
          } else {
            leadData[leadField] = value
          }
        }
      })

      // Generate automatic tags if enabled
      let allTags = [...bulkTags]
      if (autoTaggingEnabled) {
        const autoTags = generateLeadTags(leadData as LeadData, taggingOptions)
        allTags = [...allTags, ...autoTags]
      }
      
      // Add any CSV tags
      if (leadData.tags) {
        allTags = [...allTags, ...leadData.tags]
      }
      
      // Clean and deduplicate tags
      leadData.tags = validateAndCleanTags([...new Set(allTags)])

      return leadData
    })

    setPreviewData(preview)
    setStep('preview')
  }, [csvData, fieldMapping, validateMapping, bulkTags, autoTaggingEnabled, taggingOptions])

  const executeImport = useCallback(async () => {
    if (!file || !validateMapping()) return

    setStep('importing')
    setErrors([])

    try {
      const result = await importMutation.mutateAsync({
        file,
        mappings: fieldMapping,
        bulkTags: bulkTags,
        autoTaggingEnabled: autoTaggingEnabled,
        taggingOptions: taggingOptions
      }) as { import_id?: string; successful_imports?: number; success_count?: number; failed_imports?: number; error_count?: number }

      // Capture import ID for progress tracking
      if (result.import_id) {
        setImportId(result.import_id)
      } else {
        // Fallback for immediate completion
        setImportResult({
          successful: result.successful_imports ?? result.success_count ?? 0,
          failed: result.failed_imports ?? result.error_count ?? 0
        })
        setStep('complete')
      }
    } catch (error) {
      setErrors(['Import failed. Please try again.'])
      setStep('preview')
    }
  }, [file, fieldMapping, importMutation, validateMapping, bulkTags, autoTaggingEnabled, taggingOptions])

  // Handle progress updates
  ReactUseEffect(() => {
    if (importStatus && importId) {
      const status = importStatus as {
        status: string
        successful_imports?: number
        success_count?: number
        failed_imports?: number
        error_count?: number
        error_message?: string
      }
      if (status.status === 'completed') {
        setImportResult({
          successful: status.successful_imports ?? status.success_count ?? 0,
          failed: status.failed_imports ?? status.error_count ?? 0
        })
        setStep('complete')
        setImportId(null) // Clear import ID
      } else if (status.status === 'failed') {
        setErrors([status.error_message || 'Import failed. Please try again.'])
        setStep('preview')
        setImportId(null) // Clear import ID
      }
    }
  }, [importStatus, importId])

  const resetDialog = useCallback(() => {
    setStep('upload')
    setFile(null)
    setCsvData([])
    setCsvHeaders([])
    setFieldMapping({})
    setPreviewData([])
    setErrors([])
    setImportResult(null)
    setBulkTags([])
    setTagInput('')
    setAutoTaggingEnabled(true)
    setTaggingOptions({
      includeTimeTag: true,
      includeGeographicTag: true,
      includePropertyTag: true,
      customUploadDate: new Date()
    })
    setImportId(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleClose = useCallback(() => {
    resetDialog()
    onOpenChange(false)
  }, [resetDialog, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Import Leads</DialogTitle>
          <DialogDescription>
            Upload a CSV, map columns, and preview data before importing leads.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: File Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors",
                errors.length > 0 && "border-red-300"
              )}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => e.preventDefault()}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Drop your CSV file here</p>
                <p className="text-sm text-gray-500">or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4"
                >
                  Choose File
                </Button>
              </div>
            </div>

            {/* Automatic Tagging Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5" />
                  <span>Automatic Lead Tagging</span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Automatically generate strategic tags for lead organization and targeting
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-tagging"
                    checked={autoTaggingEnabled}
                    onCheckedChange={(checked) => setAutoTaggingEnabled(checked as boolean)}
                  />
                  <Label htmlFor="auto-tagging" className="font-medium">
                    Enable automatic tag generation
                  </Label>
                </div>
                
                {autoTaggingEnabled && (
                  <div className="ml-6 space-y-3 p-4 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="time-tag"
                          checked={taggingOptions.includeTimeTag}
                          onCheckedChange={(checked) => 
                            setTaggingOptions(prev => ({ ...prev, includeTimeTag: !!checked }))
                          }
                        />
                        <Label htmlFor="time-tag" className="text-sm">
                          Time Tag (SEP25)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="geo-tag"
                          checked={taggingOptions.includeGeographicTag}
                          onCheckedChange={(checked) => 
                            setTaggingOptions(prev => ({ ...prev, includeGeographicTag: !!checked }))
                          }
                        />
                        <Label htmlFor="geo-tag" className="text-sm">
                          Geographic Tag (TX-HAR)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="property-tag"
                          checked={taggingOptions.includePropertyTag}
                          onCheckedChange={(checked) => 
                            setTaggingOptions(prev => ({ ...prev, includePropertyTag: !!checked }))
                          }
                        />
                        <Label htmlFor="property-tag" className="text-sm">
                          Property Tag (1-5AC)
                        </Label>
                      </div>
                    </div>
                    <p className="text-xs text-blue-700">
                      Automatic tags are generated based on upload date, location data, and property information
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Tags Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Tag className="h-5 w-5" />
                  <span>Manual Campaign Tags</span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Add custom tags to all imported leads for campaign targeting
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter tag (e.g., 2025 September Campaign)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (tagInput.trim()) {
                        addBulkTag(tagInput.trim())
                        setTagInput('')
                      }
                    }}
                  >
                    Add Tag
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateCampaignTag}
                    className="whitespace-nowrap"
                  >
                    Auto-Generate
                  </Button>
                </div>

                {bulkTags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Tags to apply to all leads ({bulkTags.length})
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {bulkTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer hover:bg-gray-200"
                          onClick={() => removeBulkTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Click on a tag to remove it
                    </p>
                  </div>
                )}

                {bulkTags.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">No tags added yet</p>
                    <p className="text-xs">Tags help organize leads for targeted campaigns</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Errors</h3>
                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Field Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Map CSV Columns to Lead Fields</CardTitle>
                <p className="text-sm text-gray-600">
                  Found {csvHeaders.length} columns in your CSV file. Map them to the appropriate lead fields below.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-3">
                      Required Fields
                      <span className="text-xs text-gray-500 ml-2">(Only Primary Phone is required)</span>
                    </h4>
                    {REQUIRED_FIELDS.map((field) => (
                      <div key={field.key} className="flex items-center justify-between py-2">
                        <label className="text-sm font-medium">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                          {!field.required && <span className="text-gray-400 ml-1">(optional)</span>}
                        </label>
                        <Select
                          value={Object.keys(fieldMapping).find(k => fieldMapping[k] === field.key) || ''}
                          onValueChange={(csvField) => {
                            setFieldMapping(prev => {
                              const newMapping = { ...prev }
                              // Remove old mapping for this field
                              Object.keys(newMapping).forEach(k => {
                                if (newMapping[k] === field.key) delete newMapping[k]
                              })
                              // Add new mapping
                              if (csvField) {
                                newMapping[csvField] = field.key
                              }
                              return newMapping
                            })
                          }}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">-- None --</SelectItem>
                            {csvHeaders.map((header) => (
                              <SelectItem key={header} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Optional Fields</h4>
                    <div className="max-h-64 overflow-y-auto">
                      {OPTIONAL_FIELDS.map((field) => (
                        <div key={field.key} className="flex items-center justify-between py-2">
                          <label className="text-sm">{field.label}</label>
                          <Select
                            value={Object.keys(fieldMapping).find(k => fieldMapping[k] === field.key) || ''}
                            onValueChange={(csvField) => {
                              setFieldMapping(prev => {
                                const newMapping = { ...prev }
                                // Remove old mapping for this field
                                Object.keys(newMapping).forEach(k => {
                                  if (newMapping[k] === field.key) delete newMapping[k]
                                })
                                // Add new mapping
                                if (csvField) {
                                  newMapping[csvField] = field.key
                                }
                                return newMapping
                              })
                            }}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">-- None --</SelectItem>
                              {csvHeaders.map((header) => (
                                <SelectItem key={header} value={header}>{header}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {errors.length > 0 && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Mapping Errors</h3>
                        <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                          {errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preview Import Data</CardTitle>
                <p className="text-sm text-gray-600">
                  Showing first 5 rows. {csvData.length} total rows will be imported.
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Row</th>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Phone</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Location</th>
                        <th className="text-left p-2">Property Type</th>
                        <th className="text-left p-2">Tags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((lead) => (
                        <tr key={lead._rowIndex} className="border-b">
                          <td className="p-2">{lead._rowIndex}</td>
                          <td className="p-2">{lead.firstName} {lead.lastName}</td>
                          <td className="p-2">{lead.primaryPhone || lead.phone}</td>
                          <td className="p-2">{lead.email || '-'}</td>
                          <td className="p-2">
                            {lead.address?.city && lead.address?.state 
                              ? `${lead.address.city}, ${lead.address.state}` 
                              : '-'
                            }
                          </td>
                          <td className="p-2">{lead.property?.propertyType || '-'}</td>
                          <td className="p-2">
                            {lead.tags && lead.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {lead.tags.slice(0, 3).map((tag: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {lead.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">+{lead.tags.length - 3}</Badge>
                                )}
                              </div>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-medium">Importing Leads...</h3>
              <p className="text-gray-600">This may take a few moments for large files.</p>
            </div>

            {importStatus ? (() => {
              const status = importStatus as {
                progress_percentage?: number
                progress_pct?: number
                processed_rows?: number
                current_row?: number
                total_rows?: number
                estimated_time_remaining?: number
                eta_seconds?: number
                successful_imports?: number
                success_count?: number
                failed_imports?: number
                error_count?: number
                warning_count?: number
              }
              const etaSeconds = status.estimated_time_remaining ?? status.eta_seconds
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Import Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{status.progress_percentage ?? status.progress_pct ?? 0}%</span>
                      </div>
                      <Progress value={status.progress_percentage ?? status.progress_pct ?? 0} className="w-full" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Current Row:</span>
                        <div className="font-medium">
                          {(status.processed_rows ?? status.current_row ?? 0)} / {status.total_rows || csvData.length}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Estimated Time:</span>
                        <div className="font-medium">
                          {typeof etaSeconds === 'number'
                            ? `${Math.ceil(etaSeconds)}s`
                            : 'Calculating...'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-green-600">Success:</span>
                        <div className="font-medium">{status.successful_imports ?? status.success_count ?? 0}</div>
                      </div>
                      <div>
                        <span className="text-red-600">Errors:</span>
                        <div className="font-medium">{status.failed_imports ?? status.error_count ?? 0}</div>
                      </div>
                      <div>
                        <span className="text-blue-600">Warnings:</span>
                        <div className="font-medium">{status.warning_count || 0}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })() : null}

            {!importStatus && (
              <div className="text-center text-sm text-gray-500">
                Initializing import...
              </div>
            )}
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && importResult && (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">Import Complete!</h3>
            <div className="space-y-2 text-gray-600">
              <p>{importResult.successful} leads imported successfully</p>
              {importResult.failed > 0 && (
                <p className="text-red-600">{importResult.failed} leads failed to import</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={handleClose}>
              {step === 'complete' ? 'Close' : 'Cancel'}
            </Button>
            
            <div className="space-x-2">
              {step === 'mapping' && (
                <>
                  <Button variant="outline" onClick={() => setStep('upload')}>
                    Back
                  </Button>
                  <Button onClick={generatePreview}>
                    Next: Preview
                  </Button>
                </>
              )}
              
              {step === 'preview' && (
                <>
                  <Button variant="outline" onClick={() => setStep('mapping')}>
                    Back
                  </Button>
                  <Button onClick={executeImport} disabled={importMutation.isLoading}>
                    Import {csvData.length} Leads
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
