import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { credit_noteApi } from './api'

export function useList() {
  return useQuery({ queryKey: ['credit-note', 'list'], queryFn: credit_noteApi.getSalesReturns })
}

export function useCustomers() {
  return useQuery({ queryKey: ['credit-note', 'customers'], queryFn: credit_noteApi.getCustomers })
}

export function useCustomerPendingBills(customerId?: string | number) {
  return useQuery({
    queryKey: ['credit-note', 'pending-bills', customerId],
    queryFn: () => credit_noteApi.getCustomersPendingBills(customerId!),
    enabled: !!customerId
  })
}

export function useCreditNoteDetail(id: string | number | null) {
  return useQuery({
    queryKey: ['credit-note', 'detail', id],
    queryFn: () => credit_noteApi.getSalesReturnDetail(id!),
    enabled: !!id
  })
}

export function useUnifiedInvoiceDetail(invoiceId?: string | number) {
  return useQuery({
    queryKey: ['credit-note', 'invoice-detail', invoiceId],
    queryFn: () => credit_noteApi.getUnifiedInvoiceDetail(invoiceId!),
    enabled: !!invoiceId
  })
}

export function useProducts() {
  return useQuery({ queryKey: ['credit-note', 'products'], queryFn: credit_noteApi.getProducts })
}

export function useProductsBatches() {
  return useQuery({ queryKey: ['credit-note', 'batches'], queryFn: credit_noteApi.getProductsBatches })
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: credit_noteApi.createSalesReturnsManual,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-note', 'list'] })
    }
  })
}

export function useDeleteCreditNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: credit_noteApi.removeSalesReturns,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-note', 'list'] })
    }
  })
}
