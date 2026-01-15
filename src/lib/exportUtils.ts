import { Lead } from '@/types/lead'

// Extended interface to handle various field name formats from API
type ExtendedLead = Omit<Lead, 'primaryPhone'> & {
  fullName?: string
  primaryPhone?: string
  secondaryPhone?: string
  alternatePhone?: string
  created_at?: string
  notes?: string
}

export interface ExportOptions {
  format: 'csv' | 'excel'
  filterType: 'all' | 'selected' | 'filtered'
  includeFields: {
    personalInfo: boolean
    contactInfo: boolean
    addressInfo: boolean
    propertyInfo: boolean
    leadInfo: boolean
    notes: boolean
  }
}

export function exportLeadsToCSV(leads: ExtendedLead[], options: ExportOptions): void {
  const headers = generateHeaders(options.includeFields)
  const rows = leads.map(lead => generateRow(lead, options.includeFields))
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const filename = `leads-export-${new Date().toISOString().split('T')[0]}.csv`
  downloadFile(blob, filename)
}

export async function exportLeadsToExcel(leads: ExtendedLead[], options: ExportOptions): Promise<void> {
  // For Excel export, we'll use a simple approach by creating an HTML table
  // and letting the browser handle it as Excel format
  const headers = generateHeaders(options.includeFields)
  const rows = leads.map(lead => generateRow(lead, options.includeFields))
  
  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <meta name="ProgId" content="Excel.Sheet" />
      <meta name="Generator" content="Microsoft Excel 15" />
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #000; padding: 5px; text-align: left; }
        th { background-color: #f0f0f0; font-weight: bold; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>${row.map(cell => `<td>${String(cell)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `
  
  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' })
  const filename = `leads-export-${new Date().toISOString().split('T')[0]}.xls`
  downloadFile(blob, filename)
}

function generateHeaders(includeFields: ExportOptions['includeFields']): string[] {
  const headers: string[] = []
  
  if (includeFields.personalInfo) {
    headers.push('First Name', 'Last Name', 'Full Name')
  }
  
  if (includeFields.contactInfo) {
    headers.push('Primary Phone', 'Secondary Phone', 'Alternate Phone', 'Email')
  }
  
  if (includeFields.addressInfo) {
    headers.push('Street Address', 'City', 'State', 'ZIP Code', 'County')
  }
  
  if (includeFields.propertyInfo) {
    headers.push('Property Type', 'Property Value', 'Acreage', 'Parcel ID')
  }
  
  if (includeFields.leadInfo) {
    headers.push('Lead Source', 'Status', 'Score', 'Created Date', 'Tags')
  }
  
  if (includeFields.notes) {
    headers.push('Notes')
  }
  
  return headers
}

function generateRow(lead: ExtendedLead, includeFields: ExportOptions['includeFields']): (string | number | null)[] {
  const row: (string | number | null)[] = []
  
  if (includeFields.personalInfo) {
    row.push(
      lead.firstName || '',
      lead.lastName || '',
      lead.fullName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
    )
  }
  
  if (includeFields.contactInfo) {
    row.push(
      lead.primaryPhone || lead.phone || '',
      lead.secondaryPhone || '',
      lead.alternatePhone || '',
      lead.email || ''
    )
  }
  
  if (includeFields.addressInfo) {
    row.push(
      lead.address?.street || '',
      lead.address?.city || '',
      lead.address?.state || '',
      lead.address?.zip || '',
      lead.address?.county || ''
    )
  }
  
  if (includeFields.propertyInfo) {
    row.push(
      lead.property?.propertyType || '',
      lead.property?.estimatedValue || 0,
      lead.property?.acreage || '',
      lead.property?.parcelId || ''
    )
  }
  
  if (includeFields.leadInfo) {
    row.push(
      lead.leadSource || '',
      lead.status || '',
      lead.score || '',
      lead.createdAt || lead.created_at || '',
      Array.isArray(lead.tags) ? lead.tags.join('; ') : ''
    )
  }
  
  if (includeFields.notes) {
    row.push(lead.notes || '')
  }
  
  return row
}

function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
