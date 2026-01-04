import { useQuery } from '@tanstack/react-query'
import { analyticsApi, leadsApi, campaignsApi } from '@/lib/api'

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: analyticsApi.getDashboardMetrics,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider stale after 15 seconds
  })
}

export function useActiveCampaigns() {
  return useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn: () => campaignsApi.getCampaigns({ status: 'running', limit: 5 }),
    refetchInterval: 15000, // Refetch every 15 seconds
  })
}

export function useRecentLeads() {
  return useQuery({
    queryKey: ['leads', 'recent'],
    queryFn: () => leadsApi.getLeads({ limit: 5, page: 1 }),
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}