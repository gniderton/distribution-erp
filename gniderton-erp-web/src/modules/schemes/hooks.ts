import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schemeApi } from './api'

export function useListSchemes(params: any = {}) {
  return useQuery({
    queryKey: ['schemes', params],
    queryFn: () => schemeApi.list(params)
  })
}

export function useSchemeDetails(id: string | null) {
  return useQuery({
    queryKey: ['schemes', id],
    queryFn: () => schemeApi.getById(id!),
    enabled: !!id
  })
}

export function useSchemeUsage(id: string | null, params: any = {}) {
  return useQuery({
    queryKey: ['schemes', 'usage', id, params],
    queryFn: () => schemeApi.getUsage(id!, params),
    enabled: !!id
  })
}

export function useSchemeAnalytics(id: string | null) {
  return useQuery({
    queryKey: ['schemes', 'analytics', id],
    queryFn: () => schemeApi.getAnalytics(id!),
    enabled: !!id
  })
}

export function useCreateScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => schemeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] })
    }
  })
}

export function useUpdateScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => schemeApi.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] })
      queryClient.invalidateQueries({ queryKey: ['schemes', variables.id] })
    }
  })
}

export function useDeleteScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => schemeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] })
    }
  })
}

export function useToggleScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => schemeApi.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] })
    }
  })
}
