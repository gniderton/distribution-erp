import { api } from '@/lib/axios'
import type { Invoice } from './types'

/** Full endpoint surface for the Invoice module (Build Spec §8.5). */
export const invoiceApi = {
  list: () => api.get<Invoice[]>('/api/sales/unified').then((r) => r.data),
  getOne: (id: string | number) => api.get<Invoice>(`/api/sales/unified/${id}`).then((r) => r.data),
  bankDetails: () => api.get('/api/sales/bank-details/3').then((r) => r.data),
  regenerate: (payload: any) => api.post('/api/sales/invoices/regenerate', payload).then((r) => r.data),
  unlockForEdit: (id: string | number) => api.post(`/api/sales/invoices/${id}/unlock-for-edit`).then((r) => r.data),
  updateOrder: (orderId: string | number, payload: any) => api.put(`/api/sales/orders/${orderId}`, payload).then((r) => r.data),
}
