import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { itemsApi } from './api'
import type { Product } from './types'

export function useProducts() {
  return useQuery({ queryKey: ['products'], queryFn: itemsApi.list })
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
