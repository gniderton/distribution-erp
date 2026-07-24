import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoiceApi } from './api'

export function useInvoices() {
  return useQuery({ queryKey: ['invoices'], queryFn: invoiceApi.list })
}

export function useInvoice(id: string | number | null) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => invoiceApi.getOne(id as string | number),
    enabled: !!id,
  })
}

export function useUnlockInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) => invoiceApi.unlockForEdit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}
