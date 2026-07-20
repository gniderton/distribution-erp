import { api } from '@/lib/axios'
import type { Product } from './types'

/** Full endpoint surface for the Items module (Build Spec §8.3). */
export const itemsApi = {
  list: () => api.get<Product[]>('/api/products').then((r) => r.data),
  templateData: () => api.get('/api/products/template-data').then((r) => r.data),
  batches: (productId: string | number) => api.get(`/api/products/${productId}/batches`).then((r) => r.data),

  brands: () => api.get('/api/master/brands').then((r) => r.data),
  categories: () => api.get('/api/master/categories').then((r) => r.data),
  hsn: () => api.get('/api/master/hsn').then((r) => r.data),
  taxes: () => api.get('/api/master/taxes').then((r) => r.data),

  stockAdjustments: () => api.get('/api/stock/adjust').then((r) => r.data),
  stockAdjustBatches: (productId: string | number) =>
    api.get(`/api/stock/adjust/batches/${productId}`).then((r) => r.data),
  createStockAdjustment: (payload: any) => api.post('/api/stock/adjust', payload).then((r) => r.data),
  deleteStockAdjustment: (id: string | number) => api.delete(`/api/stock/adjust/${id}`).then((r) => r.data),

  inventoryLedger: (productId: string | number) => api.get(`/api/inventory/ledger/${productId}`).then((r) => r.data),
  productProfile: (productId: string | number) => api.get(`/api/analytics/products/${productId}/profile`).then((r) => r.data),
  brandHistory: (brandId: string | number) => api.get(`/api/analytics/brands/${brandId}/history`).then((r) => r.data),

  create: (payload: Partial<Product>) => api.post<Product>('/api/products', payload).then((r) => r.data),
  update: (id: string | number, payload: Partial<Product>) =>
    api.put<Product>(`/api/products/${id}`, payload).then((r) => r.data),
  updateBatch: (batchId: string | number, payload: any) =>
    api.put(`/api/products/batches/${batchId}`, payload).then((r) => r.data),
  bulkStatus: (payload: { ids: (string | number)[]; status: string }) =>
    api.post('/api/products/bulk-status', payload).then((r) => r.data),
  bulkUpdate: (payload: any) => api.post('/api/products/bulk-update', payload).then((r) => r.data),
  import: (formData: FormData) =>
    api.post('/api/products/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
}
