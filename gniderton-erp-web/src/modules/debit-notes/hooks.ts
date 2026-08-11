import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { debit_notesApi } from './api'

export function useList() {
  return useQuery({ 
    queryKey: ['debit-notes', 'list'], 
    queryFn: debit_notesApi.getDebitNotes 
  })
}

export function useDebitNoteItems(id: string | number | null) {
  return useQuery({
    queryKey: ['debit-notes', id, 'items'],
    queryFn: () => debit_notesApi.getDebitNotesItems(id!),
    enabled: !!id
  })
}

export function useVendors() {
  return useQuery({ queryKey: ['vendors', 'list'], queryFn: debit_notesApi.getVendors })
}

export function useProducts(params?: any) {
  return useQuery({ queryKey: ['products', 'list', params], queryFn: () => debit_notesApi.getProducts(params) })
}

export function useProductsBatches(params?: any) {
  return useQuery({ queryKey: ['products-batches', 'list', params], queryFn: () => debit_notesApi.getProductsBatches(params) })
}

export function usePurchaseInvoices() {
  return useQuery({ queryKey: ['purchase-invoices', 'list'], queryFn: debit_notesApi.getPurchaseInvoices })
}

export function useCreateDebitNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: debit_notesApi.createDebitNotes,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debit-notes', 'list'] })
    }
  })
}

export function useConvertReturnSlip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) => debit_notesApi.createDebitNotesConvert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debit-notes', 'list'] })
    }
  })
}
