import { api } from '@/lib/axios'

/** Full endpoint surface for the Debit Notes module — extracted from the source app (Build Spec §8). */
export const debit_notesApi = {
  getDebitNotes: () => api.get('/api/debit-notes').then((r) => r.data),
  getDebitNotesItems: (id: string | number) => api.get(`/api/debit-notes/${id}/items`).then((r) => r.data),
  getDocumentsAllSequences: () => api.get('/api/documents/all-sequences').then((r) => r.data),
  getEmployeesProfile: () => api.get('/api/employees/profile').then((r) => r.data),
  getProducts: () => api.get('/api/products').then((r) => r.data),
  getProductsBatches: () => api.get('/api/products/batches').then((r) => r.data),
  getPurchaseInvoices: () => api.get('/api/purchase-invoices').then((r) => r.data),
  getStockAdjustBatches: (productid: string | number) => api.get(`/api/stock/adjust/batches/${productid}`).then((r) => r.data),
  getVendors: () => api.get('/api/vendors').then((r) => r.data.data || r.data),
  createDebitNotes: (payload: any) => api.post('/api/debit-notes', payload).then((r) => r.data),
  createDebitNotesConvert: (id: string | number, payload: any = {}) => api.post(`/api/debit-notes/${id}/convert`, payload).then((r) => r.data),
  createDebitNotesReverse: (id: string | number, payload: any = {}) => api.post(`/api/debit-notes/${id}/reverse`, payload).then((r) => r.data),
}
