import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerApi } from './api'
import type { Customer } from './types'

export function useCustomers() {
  return useQuery({ queryKey: ['customers'], queryFn: customerApi.list })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Customer>) => customerApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Partial<Customer> }) => customerApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}
