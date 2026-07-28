import { api } from '@/lib/axios'
import type { Product, Batch, StockAdjustment } from './types'

export const itemsApi = {
  list: async () => {
    const res = await api.get('/api/products')
    // API returns { data: Product[], pagination: ... } or just Product[]
    return Array.isArray(res.data) ? res.data : (res.data?.data || [])
  },
  templateData: () => api.get('/api/products/template-data').then((r) => r.data),
  batches: (productId: string | number) => api.get(`/api/products/${productId}/batches`).then((r) => r.data),
  allBatches: () => api.get('/api/products/batches').then((r) => r.data),

  brands: () => api.get('/api/master/brands').then((r) => r.data),
  categories: () => api.get('/api/master/categories').then((r) => r.data),
  hsn: () => api.get('/api/master/hsn').then((r) => r.data),
  taxes: () => api.get('/api/master/taxes').then((r) => r.data),
  vendors: () => api.get('/api/vendors').then((r) => Array.isArray(r.data) ? r.data : (r.data?.data || [])),

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

  productDashboard: (productId: string | number) =>
    api.get(`/api/analytics/products/${productId}/profile`).then((r) => r.data),
  bulkStatus: (payload: { ids: (string | number)[]; status: string }) =>
    api.post('/api/products/bulk-status', payload).then((r) => r.data),
  bulkUpdate: (payload: any) => api.post('/api/products/bulk-update', payload).then((r) => r.data),
  createLegacyBatchesBulk: (payload: { batches: any[] }) => 
    api.post('/api/products/batches/legacy-bulk', payload).then((r) => r.data),
  import: (payload: { items: any[] }) =>
    api.post('/api/products/import', payload).then((r) => r.data),
}
