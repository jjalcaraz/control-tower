import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import {
  authApi,
  leadsApi,
  campaignsApi,
  messagesApi,
  analyticsApi,
  templatesApi,
  phoneNumbersApi,
  complianceApi,
  organizationsApi,
  settingsApi,
  webhooksApi,
  integrationsApi,
} from '@/lib/api'

type QueryOptions<TData = any, TError = unknown> = UseQueryOptions<TData, TError, TData, any[]>
type MutationOptions<TData = any, TError = unknown, TVariables = any, TContext = unknown> =
  UseMutationOptions<TData, TError, TVariables, TContext>

// Auth Hooks
export function useCurrentUser(options?: QueryOptions) {
  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: authApi.getCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

export function useLogin(options?: MutationOptions<any, any, { email: string; password: string }>) {
  return useMutation({
    mutationFn: ({ email, password }) => authApi.login(email, password),
    ...options,
  })
}

export function useLogout(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear()
    },
    ...options,
  })
}

// Leads Hooks
export function useLeads(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => leadsApi.getLeads(params),
    staleTime: 1000 * 30, // 30 seconds
    ...options,
  })
}

export function useLead(id: string | number, options?: QueryOptions) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: () => leadsApi.getLead(id),
    enabled: !!id,
    ...options,
  })
}

export function useCreateLead(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: leadsApi.createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
    ...options,
  })
}

export function useUpdateLead(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) => leadsApi.updateLead(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['leads', id] })
    },
    ...options,
  })
}

export function useDeleteLead(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: leadsApi.deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
    ...options,
  })
}

export function useImportLeads(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, mappings, bulkTags, autoTaggingEnabled, taggingOptions }: {
      file: File;
      mappings: Record<string, string>;
      bulkTags?: string[];
      autoTaggingEnabled?: boolean;
      taggingOptions?: any;
    }) =>
      leadsApi.importLeads(file, mappings, bulkTags, autoTaggingEnabled, taggingOptions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
    ...options,
  })
}

export function useImportStatus(importId: string, options?: QueryOptions) {
  return useQuery({
    queryKey: ['importStatus', importId],
    queryFn: () => leadsApi.getImportStatus(importId),
    enabled: !!importId,
    refetchInterval: (data) => {
      // Stop polling when import is completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false
      }
      return 2000 // Poll every 2 seconds
    },
    ...options,
  })
}

export function useBulkUpdateLeads(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ leadIds, updates }: { leadIds: Array<string | number>; updates: any }) => 
      leadsApi.bulkUpdate(leadIds, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
    ...options,
  })
}

// Campaigns Hooks
export function useCampaigns(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['campaigns', params],
    queryFn: () => campaignsApi.getCampaigns(params),
    staleTime: 1000 * 60, // 1 minute
    ...options,
  })
}

export function useActiveCampaigns(options?: QueryOptions) {
  return useQuery({
    queryKey: ['campaigns', { status: 'running' }],
    queryFn: () => campaignsApi.getCampaigns({ status: 'running' }),
    staleTime: 1000 * 30, // 30 seconds
    ...options,
  })
}

export function useCampaign(id: string | number, options?: QueryOptions) {
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: () => campaignsApi.getCampaign(id),
    enabled: !!id,
    ...options,
  })
}

export function useCreateCampaign(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: campaignsApi.createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
    ...options,
  })
}

export function useStartCampaign(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: campaignsApi.startCampaign,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
    },
    ...options,
  })
}

export function usePauseCampaign(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: campaignsApi.pauseCampaign,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
    },
    ...options,
  })
}

export function useResumeCampaign(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: campaignsApi.resumeCampaign,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
    },
    ...options,
  })
}

export function useStopCampaign(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: campaignsApi.stopCampaign,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
    },
    ...options,
  })
}

export function useBuildCampaignTargets(options?: MutationOptions) {
  return useMutation({
    mutationFn: campaignsApi.buildCampaignTargets,
    ...options,
  })
}

export function useCampaignStats(id: string | number, options?: QueryOptions) {
  return useQuery({
    queryKey: ['campaigns', id, 'stats'],
    queryFn: () => campaignsApi.getCampaignStats(id),
    enabled: !!id,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    ...options,
  })
}

export function useCampaignMetrics(id: string | number, options?: QueryOptions) {
  return useQuery({
    queryKey: ['campaigns', id, 'metrics'],
    queryFn: () => campaignsApi.getCampaignMetrics(id),
    enabled: !!id,
    refetchInterval: 30000, // Refetch every 30 seconds
    ...options,
  })
}

// Messages Hooks
export function useConversations(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['conversations', params],
    queryFn: () => messagesApi.getConversations(params),
    refetchInterval: 10000, // Refetch every 10 seconds for real-time feel
    ...options,
  })
}

export function useConversation(id: string | number, options?: QueryOptions) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: () => messagesApi.getConversation(id),
    enabled: !!id,
    refetchInterval: 5000, // More frequent refetch for active conversations
    ...options,
  })
}

export function useSendMessage(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string | number; content: string }) =>
      messagesApi.sendMessage(conversationId, content),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations', conversationId] })
    },
    ...options,
  })
}

export function useBroadcastMessage(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { content: string; leadIds?: number[]; filters?: any }) =>
      messagesApi.broadcastMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
    ...options,
  })
}

export function useArchiveConversation(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: messagesApi.archiveConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    ...options,
  })
}

export function useDeleteConversation(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: messagesApi.deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    ...options,
  })
}

export function useMarkConversationRead(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string | number) => messagesApi.markConversationRead(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations', conversationId] })
    },
    ...options,
  })
}

export function useStarConversation(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string | number) => messagesApi.starConversation(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations', conversationId] })
    },
    ...options,
  })
}

export function useUnstarConversation(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string | number) => messagesApi.unstarConversation(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations', conversationId] })
    },
    ...options,
  })
}

export function useMessageTemplates(options?: QueryOptions) {
  return useQuery({
    queryKey: ['message-templates'],
    queryFn: messagesApi.getTemplates,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

export function useQuickResponses(options?: QueryOptions) {
  return useQuery({
    queryKey: ['quick-responses'],
    queryFn: messagesApi.getQuickResponses,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// Templates Hooks
export function useTemplates(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['templates', params],
    queryFn: () => templatesApi.getTemplates(params),
    staleTime: 1000 * 60, // 1 minute
    ...options,
  })
}

export function useTemplate(id: string | number, options?: QueryOptions) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: () => templatesApi.getTemplate(id),
    enabled: !!id,
    ...options,
  })
}

export function useCreateTemplate(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: templatesApi.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
    ...options,
  })
}

export function useUpdateTemplate(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) => templatesApi.updateTemplate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['templates', id] })
    },
    ...options,
  })
}

export function useDeleteTemplate(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) => templatesApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
    ...options,
  })
}

export function useTemplateStats(params?: { timeRange?: string }, options?: QueryOptions) {
  return useQuery({
    queryKey: ['templates', 'stats', params],
    queryFn: () => templatesApi.getTemplateStats(params),
    staleTime: 1000 * 60, // 1 minute
    ...options,
  })
}

export function useTestTemplate(options?: MutationOptions) {
  return useMutation({
    mutationFn: ({ id, testData }: { id: number; testData: any }) =>
      templatesApi.testTemplate(id, testData),
    ...options,
  })
}

export function useTemplatePerformance(id: string | number, timeRange?: string, options?: QueryOptions) {
  return useQuery({
    queryKey: ['templates', id, 'performance', timeRange],
    queryFn: () => templatesApi.getTemplatePerformance(id, timeRange),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// Phone Numbers Hooks
export function usePhoneNumbers(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['phone-numbers', params],
    queryFn: () => phoneNumbersApi.getPhoneNumbers(params),
    staleTime: 1000 * 60, // 1 minute
    ...options,
  })
}

export function usePhoneNumber(id: number, options?: QueryOptions) {
  return useQuery({
    queryKey: ['phone-numbers', id],
    queryFn: () => phoneNumbersApi.getPhoneNumber(id),
    enabled: !!id,
    ...options,
  })
}

export function usePhoneNumberHealth(id: number, options?: QueryOptions) {
  return useQuery({
    queryKey: ['phone-numbers', id, 'health'],
    queryFn: () => phoneNumbersApi.getPhoneNumberHealth(id),
    enabled: !!id,
    refetchInterval: 60000, // Refetch every minute
    ...options,
  })
}

export function usePurchasePhoneNumber(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: phoneNumbersApi.purchasePhoneNumber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] })
    },
    ...options,
  })
}

export function useTestPhoneNumber(options?: MutationOptions) {
  return useMutation({
    mutationFn: ({ id, testData }: { id: number; testData: any }) =>
      phoneNumbersApi.testPhoneNumber(id, testData),
    ...options,
  })
}

export function useSyncTwilioNumbers(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: phoneNumbersApi.syncTwilioNumbers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] })
    },
    ...options,
  })
}

export function useUpdatePhoneNumberSettings(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, settings }: { id: number; settings: any }) =>
      phoneNumbersApi.updatePhoneNumberSettings(id, settings),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] })
      queryClient.invalidateQueries({ queryKey: ['phone-numbers', id] })
    },
    ...options,
  })
}

export function usePhoneNumberAnalytics(id: number, timeRange?: string, options?: QueryOptions) {
  return useQuery({
    queryKey: ['phone-numbers', id, 'analytics', timeRange],
    queryFn: () => phoneNumbersApi.getPhoneNumberAnalytics(id, timeRange),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// Compliance Hooks
export function useOptOuts(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['opt-outs', params],
    queryFn: () => complianceApi.getOptOuts(params),
    staleTime: 1000 * 60, // 1 minute
    ...options,
  })
}

export function useAuditLogs(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => complianceApi.getAuditLogs(params),
    staleTime: 1000 * 30, // 30 seconds
    ...options,
  })
}

export function useConsentRecords(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['consent-records', params],
    queryFn: () => complianceApi.getConsentRecords(params),
    staleTime: 1000 * 60, // 1 minute
    ...options,
  })
}

export function useAddOptOut(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ phoneNumber, reason }: { phoneNumber: string; reason?: string }) =>
      complianceApi.addOptOut(phoneNumber, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opt-outs'] })
    },
    ...options,
  })
}

export function useBulkOptOut(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ phoneNumbers, reason, source }: { phoneNumbers: string[]; reason?: string; source?: string }) =>
      complianceApi.bulkOptOut(phoneNumbers, reason, source),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opt-outs'] })
    },
    ...options,
  })
}

export function useComplianceDashboard(options?: QueryOptions) {
  return useQuery({
    queryKey: ['compliance', 'dashboard'],
    queryFn: complianceApi.getComplianceDashboard,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider stale after 15 seconds
    ...options,
  })
}

export function useGenerateComplianceReport(options?: MutationOptions) {
  return useMutation({
    mutationFn: (params: {
      type: string
      startDate: string
      endDate: string
      format?: string
    }) => complianceApi.generateComplianceReport(params),
    ...options,
  })
}

// Analytics Hooks
export function useDashboardMetrics(options?: QueryOptions) {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: analyticsApi.getDashboardMetrics,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider stale after 15 seconds
    ...options,
  })
}

export function useCampaignAnalytics(campaignId: string | number, timeRange: string, options?: QueryOptions) {
  return useQuery({
    queryKey: ['analytics', 'campaigns', campaignId, timeRange],
    queryFn: () => analyticsApi.getCampaignAnalytics(campaignId, timeRange),
    enabled: !!campaignId,
    staleTime: 1000 * 60, // 1 minute
    ...options,
  })
}

export function useLeadAnalytics(timeRange: string, options?: QueryOptions) {
  return useQuery({
    queryKey: ['analytics', 'leads', timeRange],
    queryFn: () => analyticsApi.getLeadAnalytics(timeRange),
    staleTime: 1000 * 60, // 1 minute
    ...options,
  })
}

export function useMessageAnalytics(timeRange: string, options?: QueryOptions) {
  return useQuery({
    queryKey: ['analytics', 'messages', timeRange],
    queryFn: () => analyticsApi.getMessageAnalytics(timeRange),
    staleTime: 1000 * 60, // 1 minute
    ...options,
  })
}

export function usePhoneHealthAnalytics(options?: QueryOptions) {
  return useQuery({
    queryKey: ['analytics', 'phone-health'],
    queryFn: analyticsApi.getPhoneHealthAnalytics,
    refetchInterval: 60000, // Refetch every minute
    ...options,
  })
}

export function useTrendAnalytics(params?: { metric?: string; timeRange?: string }, options?: QueryOptions) {
  return useQuery({
    queryKey: ['analytics', 'trends', params],
    queryFn: () => analyticsApi.getTrends(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  })
}

export function useROIAnalytics(timeRange: string, options?: QueryOptions) {
  return useQuery({
    queryKey: ['analytics', 'roi', timeRange],
    queryFn: () => analyticsApi.getROIAnalysis(timeRange),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

export function useConversionFunnel(campaignId?: number, timeRange?: string, options?: QueryOptions) {
  return useQuery({
    queryKey: ['analytics', 'conversion-funnel', campaignId, timeRange],
    queryFn: () => analyticsApi.getConversionFunnel(campaignId, timeRange),
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  })
}

export function useCompareCampaigns(campaignIds: Array<string | number>, metrics?: string[], options?: QueryOptions) {
  return useQuery({
    queryKey: ['analytics', 'campaigns-comparison', campaignIds, metrics],
    queryFn: () => analyticsApi.compareCampaigns(campaignIds, metrics),
    enabled: campaignIds.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  })
}

// Recent Leads Hook (for Dashboard)
export function useRecentLeads(options?: QueryOptions) {
  return useQuery({
    queryKey: ['leads', { recent: true }],
    queryFn: () => leadsApi.getLeads({ limit: 10 }),
    staleTime: 1000 * 30, // 30 seconds
    ...options,
  })
}

// Organization Hooks
export function useCurrentOrganization(options?: QueryOptions) {
  return useQuery({
    queryKey: ['organization', 'current'],
    queryFn: organizationsApi.getCurrentOrganization,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

export function useOrganizationUsers(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['organization', 'users', params],
    queryFn: () => organizationsApi.getOrganizationUsers(params),
    staleTime: 1000 * 60, // 1 minute
    ...options,
  })
}

// Settings Hooks
export function useSettings(options?: QueryOptions) {
  return useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

export function useIntegrationSettings(options?: QueryOptions) {
  return useQuery({
    queryKey: ['settings', 'integrations'],
    queryFn: settingsApi.getIntegrationSettings,
    staleTime: 1000 * 60, // 1 minute
    ...options,
  })
}

export function useUpdateSettings(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: settingsApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    ...options,
  })
}

// Webhooks Hooks
export function useWebhooks(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['webhooks', params],
    queryFn: () => webhooksApi.getWebhooks(params),
    staleTime: 1000 * 60, // 1 minute
    ...options,
  })
}

export function useCreateWebhook(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: webhooksApi.createWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
    ...options,
  })
}

export function useTestWebhook(options?: MutationOptions) {
  return useMutation({
    mutationFn: webhooksApi.testWebhook,
    ...options,
  })
}

export function useTestWebhookByUrl(options?: MutationOptions) {
  return useMutation({
    mutationFn: webhooksApi.testByUrl,
    ...options,
  })
}

// Integration Hooks
export function useIntegrations(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['integrations', params],
    queryFn: () => integrationsApi.list(),
    staleTime: 1000 * 60, // 1 minute
    ...options,
  })
}

export function useTwilioStatus(options?: QueryOptions) {
  return useQuery({
    queryKey: ['integrations', 'twilio', 'status'],
    queryFn: integrationsApi.getTwilioStatus,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
    ...options,
  })
}

export function useTestTwilioConnection(options?: MutationOptions) {
  return useMutation({
    mutationFn: integrationsApi.testTwilioConnection,
    ...options,
  })
}

export function useUpdateTwilioConfig(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: integrationsApi.updateTwilioConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
    },
    ...options,
  })
}

export function useAPIKeys(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['integrations', 'api-keys', params],
    queryFn: () => integrationsApi.getAPIKeys(params),
    staleTime: 1000 * 60,
    ...options,
  })
}

export function useCreateAPIKey(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: integrationsApi.createAPIKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'api-keys'] })
    },
    ...options,
  })
}

export function useDeleteAPIKey(options?: MutationOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => integrationsApi.deleteAPIKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'api-keys'] })
    },
    ...options,
  })
}

// Note: useComplianceDashboard is already defined above with real implementation

export function useAuditTrail(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['audit-trail', params],
    queryFn: () => complianceApi.getAuditLogs(params), // Use API directly instead of hook
    staleTime: 1000 * 60,
    ...options,
  })
}

export function useComplianceReports(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['compliance-reports', params],
    queryFn: () => complianceApi.reports.list(params), // Use list method for report metadata
    staleTime: 1000 * 60,
    ...options,
  })
}

export function useDownloadComplianceReport(options?: MutationOptions) {
  return useMutation({
    mutationFn: (reportId: string) => complianceApi.reports.download(reportId),
    ...options,
  })
}

// Additional Phone Number Hooks
export function usePhoneNumberStats(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['phone-numbers', 'stats', params],
    queryFn: () => analyticsApi.getPhoneHealthAnalytics(), // Use real API
    staleTime: 1000 * 60,
    ...options,
  })
}

// Additional Analytics Hooks
export function useAnalytics(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['analytics', 'general', params],
    queryFn: () => analyticsApi.getDashboardMetrics(), // Use real API
    staleTime: 1000 * 60,
    ...options,
  })
}

export function usePerformanceMetrics(params?: any, options?: QueryOptions) {
  return useQuery({
    queryKey: ['analytics', 'performance', params],
    queryFn: () => analyticsApi.getMessageAnalytics(params?.timeRange || '7d'), // Use real API
    staleTime: 1000 * 60,
    ...options,
  })
}
