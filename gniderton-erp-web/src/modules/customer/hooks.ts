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

export function useCustomerDashboard(id: string | number | null) {
  return useQuery({
    queryKey: ['customers', id, 'dashboard'],
    queryFn: () => customerApi.customerDashboard(id as string | number),
    enabled: !!id,
  })
}

export function useCustomerLedger(id: string | number | null) {
  return useQuery({
    queryKey: ['customers', id, 'ledger'],
    queryFn: () => customerApi.ledger(id as string | number),
    enabled: !!id,
  })
}

export function useCustomerPendingBills(id: string | number | null) {
  return useQuery({
    queryKey: ['customers', id, 'pending-bills'],
    queryFn: () => customerApi.pendingBills(id as string | number),
    enabled: !!id,
  })
}

export function useCustomerPricing(id: string | number | null) {
  return useQuery({
    queryKey: ['customers', id, 'pricing'],
    queryFn: () => customerApi.pricing(id as string | number),
    enabled: !!id,
  })
}

export function useSetCustomerPricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: any }) => customerApi.setPricing(id, payload),
    onSuccess: (_, variables) => qc.invalidateQueries({ queryKey: ['customers', variables.id, 'pricing'] }),
  })
}
