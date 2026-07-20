import { api } from '@/lib/axios'

/** Full endpoint surface for the Schemes module — extracted from the source app (Build Spec §8). */
export const schemesApi = {
  getCategories: () => api.get('/api/categories').then((r) => r.data),
  getCustomers: () => api.get('/api/customers').then((r) => r.data),
  getProducts: () => api.get('/api/products').then((r) => r.data),
  getProductsBrands: () => api.get('/api/products/brands').then((r) => r.data),
  getSalesBankDetails3: () => api.get('/api/sales/bank-details/3').then((r) => r.data),
  getSalesInvoicesLinesBulk: () => api.get('/api/sales/invoices/lines-bulk').then((r) => r.data),
  getSalesUnified: (id: string | number) => api.get(`/api/sales/unified/${id}`).then((r) => r.data),
  getSchemes: () => api.get('/api/schemes').then((r) => r.data),
  getSchemesUsage: (selectedOptionValue: string | number) => api.get(`/api/schemes/${selectedOptionValue}/usage`).then((r) => r.data),
  patchSchemesToggle: (id: string | number, payload: any = {}) => api.patch(`/api/schemes/${id}/toggle`, payload).then((r) => r.data),
  createSchemes: (payload: any) => api.post('/api/schemes', payload).then((r) => r.data),
  updateSchemes: (id: string | number, payload: any = {}) => api.put(`/api/schemes/${id}`, payload).then((r) => r.data),
}
