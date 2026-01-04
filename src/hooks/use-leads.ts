import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsApi } from '@/lib/api'
import { Lead, LeadFilter } from '@/types/lead'

export function useLeads(params?: {
  page?: number
  limit?: number
  search?: string
  status?: string[]
  tags?: string[]
}) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => leadsApi.getLeads(params),
    keepPreviousData: true,
  })
}

export function useLead(id: number) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: () => leadsApi.getLead(id),
    enabled: !!id,
  })
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: leadsApi.createLead,
    onSuccess: () => {
      queryClient.invalidateQueries(['leads'])
    },
  })
}

export function useUpdateLead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Lead> }) =>
      leadsApi.updateLead(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['leads'])
      queryClient.invalidateQueries(['leads', id])
    },
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: leadsApi.deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries(['leads'])
    },
    onError: (error: any) => {
      console.error('Failed to delete lead:', error)
      // You could add a toast notification here
      alert('Failed to delete lead. Please try again.')
    },
  })
}

export function useImportLeads() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ file, mappings }: { file: File; mappings: Record<string, string> }) =>
      leadsApi.importLeads(file, mappings),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads'])
    },
  })
}

export function useExportLeads() {
  return useMutation({
    mutationFn: ({ filters, format }: { filters: LeadFilter; format: 'csv' | 'excel' }) =>
      leadsApi.exportLeads(filters, format),
  })
}

export function useBulkUpdateLeads() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ leadIds, updates }: { leadIds: number[]; updates: any }) =>
      leadsApi.bulkUpdate(leadIds, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads'])
    },
  })
}

export function useBulkDeleteLeads() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: leadsApi.bulkDelete,
    onSuccess: () => {
      queryClient.invalidateQueries(['leads'])
    },
  })
}