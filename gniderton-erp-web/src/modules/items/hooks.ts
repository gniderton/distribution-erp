import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { itemsApi } from './api'
import type { Product, StockAdjustment } from './types'

export function useProducts() {
  return useQuery({ queryKey: ['products'], queryFn: itemsApi.list })
}

export function useProductBatches(productId: string | number | null) {
  return useQuery({
    queryKey: ['products', productId, 'batches'],
    queryFn: () => itemsApi.batches(productId as string | number),
    enabled: !!productId,
  })
}

export function useProductDashboard(productId: string | number | null) {
  return useQuery({
    queryKey: ['products', productId, 'dashboard'],
    queryFn: () => itemsApi.productDashboard(productId as string | number),
    enabled: !!productId,
  })
}

export function useAllBatches() {
  return useQuery({ queryKey: ['products', 'batches', 'all'], queryFn: itemsApi.allBatches })
}

export function useInventoryLedger(productId: string | number | null) {
  return useQuery({
    queryKey: ['inventory-ledger', productId],
    queryFn: () => itemsApi.inventoryLedger(productId as string | number),
    enabled: !!productId,
  })
}

export function useBrands() {
  return useQuery({ queryKey: ['brands'], queryFn: itemsApi.brands })
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: itemsApi.categories })
}

export function useHsn() {
  return useQuery({ queryKey: ['hsn'], queryFn: itemsApi.hsn })
}

export function useTaxes() {
  return useQuery({ queryKey: ['taxes'], queryFn: itemsApi.taxes })
}

export function useVendors() {
  return useQuery({ queryKey: ['vendors'], queryFn: itemsApi.vendors })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Product>) => itemsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Partial<Product> }) => itemsApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useCreateStockAdjustment() {
  return useMutation({
    mutationFn: (payload: Partial<StockAdjustment>) => itemsApi.createStockAdjustment(payload),
  })
}

export function useUpdateBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: any }) => itemsApi.updateBatch(id, payload),
    onSuccess: (_, variables) => qc.invalidateQueries({ queryKey: ['products'] }), // Invalidate all products and their batches
  })
}

export const useCreateLegacyBatchesBulk = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: itemsApi.createLegacyBatchesBulk,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['batches'] })
    }
  })
}

export const useBulkUpdateBatches = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: itemsApi.bulkUpdateBatches,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
    }
  })
}
