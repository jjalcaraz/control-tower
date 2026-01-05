import { useState } from 'react'
import { AlertTriangle, Users, Check, Merge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lead } from '@/types/lead'
import { DuplicateMatch, DuplicateDetectionService } from './DuplicateDetectionService'
import { formatPhoneNumber, formatDate } from '@/lib/utils'

interface DuplicateAlertModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  duplicateMatch: DuplicateMatch | null
  onMerge: (primaryLead: Lead, duplicatesToRemove: Lead[]) => void
  onKeepSeparate: () => void
  onCancel: () => void
}

export function DuplicateAlertModal({
  open,
  onOpenChange,
  duplicateMatch,
  onMerge,
  onKeepSeparate,
  onCancel
}: DuplicateAlertModalProps) {
  const [selectedPrimaryLead, setSelectedPrimaryLead] = useState<Lead | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'compare' | 'merge'>('overview')

  if (!duplicateMatch) return null

  const allLeads = [duplicateMatch.lead, ...duplicateMatch.duplicates]
  const suggestedPrimary = DuplicateDetectionService.suggestPrimaryLead(allLeads)

  const handleMerge = () => {
    const primaryLead = selectedPrimaryLead || suggestedPrimary
    const duplicatesToRemove = allLeads.filter(lead => lead.id !== primaryLead.id)
    onMerge(primaryLead, duplicatesToRemove)
    onOpenChange(false)
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-red-100 text-red-800'
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-blue-100 text-blue-800'
  }

  const getConfidenceText = (score: number) => {
    if (score >= 0.8) return 'High'
    if (score >= 0.6) return 'Medium'
    return 'Low'
  }

  const renderLeadCard = (lead: Lead, isSelected?: boolean, onSelect?: () => void) => (
    <Card 
      className={`cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {lead.firstName} {lead.lastName}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {lead.id === suggestedPrimary.id && (
              <Badge variant="secondary">Suggested Primary</Badge>
            )}
            {isSelected && <Check className="h-5 w-5 text-green-600" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium">Contact</p>
            <p>{formatPhoneNumber(lead.primaryPhone || lead.phone)}</p>
            {lead.email && <p className="text-gray-600">{lead.email}</p>}
          </div>
          <div>
            <p className="font-medium">Location</p>
            {lead.address && (
              <>
                <p>{lead.address.city}, {lead.address.state}</p>
                <p className="text-gray-600">{lead.address.county} County</p>
              </>
            )}
          </div>
          <div>
            <p className="font-medium">Property</p>
            <p>{lead.property?.propertyType || 'Unknown'}</p>
            {lead.property?.acreage && (
              <p className="text-gray-600">{lead.property.acreage} acres</p>
            )}
          </div>
          <div>
            <p className="font-medium">Status</p>
            <div className="flex items-center space-x-2">
              <Badge variant={lead.score === 'hot' ? 'destructive' : lead.score === 'warm' ? 'default' : 'secondary'}>
                {lead.score}
              </Badge>
              <span className="text-gray-600">{lead.status}</span>
            </div>
          </div>
        </div>
        <div className="pt-2 border-t">
          <p className="text-xs text-gray-500">
            Added {formatDate(lead.createdAt)} • Source: {lead.leadSource || 'Unknown'}
          </p>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            <DialogTitle>Potential Duplicate Leads Detected</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Confidence Score */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Match Confidence</h3>
                <p className="text-sm text-gray-600">
                  {duplicateMatch.matchReasons.join(', ')}
                </p>
              </div>
              <Badge 
                className={getConfidenceColor(duplicateMatch.confidenceScore)}
              >
                {getConfidenceText(duplicateMatch.confidenceScore)} ({Math.round(duplicateMatch.confidenceScore * 100)}%)
              </Badge>
            </div>
          </div>

          {/* Tabs for different views */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as typeof viewMode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="compare">Compare</TabsTrigger>
              <TabsTrigger value="merge">Merge</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-3">Primary Lead</h4>
                  {renderLeadCard(duplicateMatch.lead)}
                </div>
                <div>
                  <h4 className="font-medium mb-3">
                    Potential Duplicates ({duplicateMatch.duplicates.length})
                  </h4>
                  <div className="space-y-3">
                    {duplicateMatch.duplicates.map((duplicate) => (
                      <div key={duplicate.id} className="scale-90 origin-top">
                        {renderLeadCard(duplicate)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="compare" className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Field</th>
                      {allLeads.map((lead) => (
                        <th key={lead.id} className="text-left p-2 font-medium">
                          Lead {lead.id} {lead.id === suggestedPrimary.id && '(Suggested)'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Name</td>
                      {allLeads.map((lead) => (
                        <td key={lead.id} className="p-2">{lead.firstName} {lead.lastName}</td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Phone</td>
                      {allLeads.map((lead) => (
                        <td key={lead.id} className="p-2">{formatPhoneNumber(lead.primaryPhone || lead.phone)}</td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Email</td>
                      {allLeads.map((lead) => (
                        <td key={lead.id} className="p-2">{lead.email || '-'}</td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Address</td>
                      {allLeads.map((lead) => (
                        <td key={lead.id} className="p-2">
                          {lead.address ? `${lead.address.street}, ${lead.address.city}, ${lead.address.state}` : '-'}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Property Type</td>
                      {allLeads.map((lead) => (
                        <td key={lead.id} className="p-2">{lead.property?.propertyType || '-'}</td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Status</td>
                      {allLeads.map((lead) => (
                        <td key={lead.id} className="p-2">{lead.status}</td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Score</td>
                      {allLeads.map((lead) => (
                        <td key={lead.id} className="p-2">
                          <Badge variant={lead.score === 'hot' ? 'destructive' : lead.score === 'warm' ? 'default' : 'secondary'}>
                            {lead.score}
                          </Badge>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Created</td>
                      {allLeads.map((lead) => (
                        <td key={lead.id} className="p-2">{formatDate(lead.createdAt)}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="merge" className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">Select Primary Lead</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Choose which lead to keep as the primary record. Other leads will be merged into this one.
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {allLeads.map((lead) => (
                    <div key={lead.id}>
                      {renderLeadCard(
                        lead,
                        selectedPrimaryLead?.id === lead.id,
                        () => setSelectedPrimaryLead(lead)
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            
            <div className="space-x-2">
              <Button variant="outline" onClick={onKeepSeparate}>
                <Users className="h-4 w-4 mr-2" />
                Keep Separate
              </Button>
              
              {viewMode === 'merge' ? (
                <Button 
                  onClick={handleMerge}
                  disabled={!selectedPrimaryLead}
                >
                  <Merge className="h-4 w-4 mr-2" />
                  Merge Leads
                </Button>
              ) : (
                <Button onClick={() => {
                  setSelectedPrimaryLead(suggestedPrimary)
                  setViewMode('merge')
                }}>
                  <Merge className="h-4 w-4 mr-2" />
                  Merge Duplicates
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
