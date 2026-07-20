import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from './api'

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ['purchase-orders'],
    queryFn: inventoryApi.getPurchaseOrders
  })
}

export function usePurchaseInvoices() {
  return useQuery({
    queryKey: ['purchase-invoices'],
    queryFn: inventoryApi.getPurchaseInvoices
  })
}

export function useVendors() {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: inventoryApi.getVendors
  })
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: inventoryApi.getProducts
  })
}

export function useNextPO() {
  return useQuery({
    queryKey: ['next-po-number'],
    queryFn: inventoryApi.getDocumentsNextPO,
    enabled: false // Trigger manually on drawer open
  })
}

export function usePOById(id: string | number | null) {
  return useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: () => inventoryApi.getPurchaseOrders2(id!),
    enabled: !!id
  })
}

export function useCreatePO() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inventoryApi.createPurchaseOrders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    }
  })
}

export function useUpdatePO() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: any }) =>
      inventoryApi.updatePurchaseOrders(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', variables.id] })
    }
  })
}

export function useCreateGRN() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inventoryApi.createPurchaseInvoices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }) // Re-query status
    }
  })
}

export function useReverseGRN() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: any }) =>
      inventoryApi.createPurchaseInvoicesReverse(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] })
    }
  })
}
