import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  Scale,
  Settings,
  RefreshCw
} from 'lucide-react'
import { usePhoneNumbers, useComplianceDashboard } from '@/hooks/use-api'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface ComplianceRequirement {
  id: string
  name: string
  description: string
  status: 'compliant' | 'non-compliant' | 'pending' | 'expired'
  lastVerified: string
  nextDue: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  documents?: Array<{
    name: string
    uploadedAt: string
    status: 'valid' | 'expired' | 'pending'
  }>
}

interface PhoneCompliance {
  phoneId: string
  phoneNumber: string
  overallScore: number
  requirements: ComplianceRequirement[]
  violations: Array<{
    id: string
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    detectedAt: string
    resolvedAt?: string
    status: 'active' | 'resolved' | 'under_review'
  }>
  consentRecords: {
    total: number
    verified: number
    expired: number
    pending: number
  }
}

export function ComplianceManagement() {
  const [selectedPhoneId] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { data: phoneNumbersData } = usePhoneNumbers()
  const { data: complianceDashboardData, refetch: refetchCompliance } = useComplianceDashboard({
    refetchInterval: 60000 // Refetch every minute
  })

  const phoneNumbers = (phoneNumbersData?.data || []) as any[]
  const complianceData = complianceDashboardData?.data

  // Transform API data to our component format
  const complianceDataList: PhoneCompliance[] = phoneNumbers
    .filter(phone => selectedPhoneId === 'all' || phone.id === selectedPhoneId)
    .map(phone => {
      const phoneCompliance = complianceData?.phoneCompliance?.find((c: any) => c.phoneId === phone.id)

      return {
        phoneId: phone.id,
        phoneNumber: phone.number || phone.phone_number,
        overallScore: phoneCompliance?.overallScore || (
          phone.compliance ? (
            (phone.compliance.tcpaCompliant ? 25 : 0) +
            (phone.compliance.carrierApproved ? 25 : 0) +
            (phone.compliance.brandRegistered ? 25 : 0) +
            (phone.compliance.campaignRegistered ? 25 : 0)
          ) : 75
        ),
        requirements: phoneCompliance?.requirements || [
          {
            id: 'tcpa-consent',
            name: 'TCPA Consent',
            description: 'Valid express written consent for marketing messages',
            status: phone.compliance?.tcpaCompliant ? 'compliant' : 'pending',
            lastVerified: new Date().toISOString(),
            nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 'critical'
          },
          {
            id: 'carrier-approval',
            name: 'Carrier Registration',
            description: 'Registered with all major carriers',
            status: phone.compliance?.carrierApproved ? 'compliant' : 'pending',
            lastVerified: new Date().toISOString(),
            nextDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 'high'
          }
        ],
        violations: phoneCompliance?.violations || [],
        consentRecords: phoneCompliance?.consentRecords || {
          total: 0,
          verified: 0,
          expired: 0,
          pending: 0
        }
      }
    })

  const selectedCompliance = complianceDataList

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetchCompliance()
    setIsRefreshing(false)
  }

  const overallComplianceScore = complianceDataList.length > 0
    ? complianceDataList.reduce((sum, c) => sum + c.overallScore, 0) / complianceDataList.length
    : complianceData?.overallScore || 0

  const activeViolations = complianceDataList.reduce((sum, c) => sum + c.violations.filter(v => v.status === 'active').length, 0) +
    (complianceData?.activeViolations || 0)

  const pendingRequirements = complianceDataList.reduce((sum, c) => sum + c.requirements.filter(r => r.status === 'pending').length, 0) +
    (complianceData?.pendingRequirements || 0)

  const criticalRequirements = complianceDataList.reduce((sum, c) => sum + c.requirements.filter(r => r.priority === 'critical' && r.status !== 'compliant').length, 0) +
    (complianceData?.criticalRequirements || 0)

  const getStatusColor = (status: string) => {
    const colors = {
      compliant: 'bg-green-100 text-green-800 border-green-200',
      'non-compliant': 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      expired: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      critical: 'text-red-600 bg-red-50 border-red-200',
      high: 'text-orange-600 bg-orange-50 border-orange-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      low: 'text-blue-600 bg-blue-50 border-blue-200'
    }
    return colors[priority as keyof typeof colors] || colors.low
  }

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800'
    }
    return colors[severity as keyof typeof colors] || colors.low
  }

  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Compliance Management
          </h3>
          <p className="text-sm text-muted-foreground">
            TCPA compliance tracking and regulatory requirements
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Math.round(overallComplianceScore)}%
            </div>
            <p className="text-xs text-muted-foreground">Overall compliance</p>
            <Progress value={overallComplianceScore} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Violations</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{activeViolations}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requirements</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingRequirements}</div>
            <p className="text-xs text-muted-foreground">Awaiting completion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalRequirements}</div>
            <p className="text-xs text-muted-foreground">Immediate action required</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Phone Numbers Compliance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Phone Number Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {complianceDataList.map(compliance => (
                  <Card key={compliance.phoneId} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-mono font-medium">{compliance.phoneNumber}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={compliance.overallScore} className="w-16 h-2" />
                          <span className="text-sm font-medium">{compliance.overallScore}%</span>
                        </div>
                      </div>
                      <Badge className={cn(compliance.overallScore >= 80 ? 'bg-green-100 text-green-800' : compliance.overallScore >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')}>
                        {compliance.overallScore >= 80 ? 'Compliant' : compliance.overallScore >= 60 ? 'At Risk' : 'Non-Compliant'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {compliance.requirements.slice(0, 3).map(req => (
                        <div key={req.id} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{req.name}</span>
                          <Badge className={cn("text-xs", getStatusColor(req.status))}>
                            {req.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Violations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Compliance Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {complianceDataList.flatMap(c => c.violations)
                  .filter(v => v.status === 'active')
                  .slice(0, 10)
                  .map(violation => (
                    <Alert key={violation.id} className="border-l-4 border-l-red-500">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={cn("text-xs", getSeverityColor(violation.severity))}>
                              {violation.severity.toUpperCase()}
                            </Badge>
                            <span className="font-medium text-sm">{violation.type}</span>
                          </div>
                          <AlertDescription className="text-sm">
                            {violation.description}
                          </AlertDescription>
                          <div className="text-xs text-muted-foreground mt-2">
                            Detected {format(new Date(violation.detectedAt), 'MMM d, h:mm a')}
                          </div>
                        </div>
                      </div>
                    </Alert>
                  ))}

                {activeViolations === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Active Violations</h3>
                    <p className="text-muted-foreground">
                      All phone numbers are currently compliant
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Compliance Requirements Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {selectedCompliance.flatMap(compliance =>
                compliance.requirements.map(req => (
                  <Card key={`${compliance.phoneId}-${req.id}`} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{req.name}</div>
                        <Badge className={cn("text-xs", getStatusColor(req.status))}>
                          {req.status}
                        </Badge>
                        <Badge className={cn("text-xs border", getPriorityColor(req.priority))}>
                          {req.priority}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {compliance.phoneNumber}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{req.description}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Last verified: {format(new Date(req.lastVerified), 'MMM d, yyyy')}</span>
                      <span>Next due: {format(new Date(req.nextDue), 'MMM d, yyyy')}</span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
