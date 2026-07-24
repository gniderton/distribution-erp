import { api } from '@/lib/axios'

/** Full endpoint surface for the Credit Note module — extracted from the source app (Build Spec §8). */
export const credit_noteApi = {
  removeSalesReturns: (id: string | number) => api.delete(`/api/sales-returns/${id}`).then((r) => r.data),
  getCustomers: () => api.get('/api/customers').then((r) => r.data),
  getCustomersPendingBills: (selectedOptionValue: string | number) => api.get(`/api/customers/${selectedOptionValue}/pending-bills`).then((r) => r.data),
  getProducts: () => api.get('/api/products').then((r) => r.data),
  getProductsBatches: () => api.get('/api/products/batches').then((r) => r.data),
  getSalesReturns: () => api.get('/api/sales-returns').then((r) => r.data),
  getSalesReturns2: () => api.get('/api/sales/returns').then((r) => r.data),
  createSalesReturnsManual: (payload: any) => api.post('/api/sales/returns/manual', payload).then((r) => r.data),
}
