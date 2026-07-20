import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sales_orderApi } from './api'

export function useSalesOrders(status = 'Confirmed') {
  return useQuery({
    queryKey: ['sales-orders', status],
    queryFn: () => sales_orderApi.getSalesOrders(status),
  })
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: sales_orderApi.getProducts,
  })
}

export function useBulkInvoiceGenerate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: sales_orderApi.createSalesBulkInvoiceGenerate,
    onSuccess: () => {
      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
    }
  })
}
