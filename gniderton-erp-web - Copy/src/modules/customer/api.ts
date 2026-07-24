import { api } from '@/lib/axios'
import type { Customer } from './types'

/** Full endpoint surface for the Customer module (Build Spec §8.2 in map, "Customer" section). */
export const customerApi = {
  list: () => api.get<Customer[]>('/api/customers/detailed-list').then((r) => r.data),
  ledger: (id: string | number) => api.get(`/api/customers/${id}/ledger`).then((r) => r.data),
  pricing: (id: string | number) => api.get(`/api/customers/${id}/pricing`).then((r) => r.data),
  setPricing: (id: string | number, payload: any) => api.post(`/api/customers/${id}/pricing`, payload).then((r) => r.data),
  customerDashboard: (id: string | number) => api.get(`/api/analytics/customers/${id}/dashboard`).then((r) => r.data),
  pendingBills: (id: string | number) => api.get(`/api/customers/${id}/pending-bills`).then((r) => r.data),

  channels: () => api.get('/api/channels').then((r) => r.data),
  routeTypes: () => api.get('/api/master/route-types').then((r) => r.data),
  routes: () => api.get('/api/master/routes').then((r) => r.data),
  brands: () => api.get('/api/master/brands').then((r) => r.data),
  employees: () => api.get('/api/employees').then((r) => r.data),

  pendingVerification: () => api.get('/api/verify-requests/pending').then((r) => r.data),
  approveVerification: (id: string | number, payload?: any) => api.post(`/api/verify-requests/${id}/approve`, payload).then((r) => r.data),
  rejectVerification: (id: string | number) => api.post(`/api/verify-requests/${id}/reject`).then((r) => r.data),
  verifyCustomer: (id: string | number, payload: any) => api.post(`/api/customers/${id}/verify`, payload).then((r) => r.data),

  create: (payload: Partial<Customer>) => api.post<Customer>('/api/customers', payload).then((r) => r.data),
  update: (id: string | number, payload: Partial<Customer>) => api.put<Customer>(`/api/customers/${id}`, payload).then((r) => r.data),
  bulkEdit: (payload: any) => api.post('/api/customers/bulk-edit', payload).then((r) => r.data),
}
