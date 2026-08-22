import { api } from '@/lib/axios'
import type { Vendor, VendorAddress, VendorPayment } from './types'

/**
 * Full endpoint surface for the Vendor module (Build Spec §8.2).
 * Everything here is real — copied from the source application's wiring.
 */
export const vendorApi = {
  list: () => api.get<Vendor[]>('/api/vendors').then((r) => r.data),
  getOne: (id: string | number) => api.get<Vendor>(`/api/vendors/${id}`).then((r) => r.data),
  create: (payload: Partial<Vendor>) => api.post<Vendor>('/api/vendors', payload).then((r) => r.data),
  update: (id: string | number, payload: Partial<Vendor>) =>
    api.put<Vendor>(`/api/vendors/${id}`, payload).then((r) => r.data),

  addresses: (vendorId: string | number) =>
    api.get<VendorAddress[]>(`/api/vendors/${vendorId}/addresses`).then((r) => r.data),
  addAddress: (vendorId: string | number, payload: Partial<VendorAddress>) =>
    api.post<VendorAddress>(`/api/vendors/${vendorId}/addresses`, payload).then((r) => r.data),
  masterAddresses: () => api.get('/api/master/vendor-addresses').then((r) => r.data),

  ledger: (vendorId: string | number) =>
    api.get(`/api/vendor-payments/ledger/${vendorId}`).then((r) => r.data),
  paymentHistory: (vendorId: string | number) =>
    api.get<VendorPayment[]>(`/api/vendor-payments/history/${vendorId}`).then((r) => r.data),
  recordPayment: (payload: { vendor_id: string | number; amount: number; mode?: string; reference?: string }) =>
    api.post<VendorPayment>('/api/vendor-payments', payload).then((r) => r.data),
  paymentSlip: (paymentId: string | number) =>
    api.get(`/api/vendor-payments/${paymentId}/slip-details`).then((r) => r.data),
  deletePayment: (paymentId: string | number) =>
    api.delete(`/api/vendor-payments/${paymentId}`).then((r) => r.data),

  purchaseInvoices: () => api.get('/api/purchase-invoices').then((r) => r.data),
  purchaseInvoicesAging: () => api.get('/api/purchase-invoices/aging').then((r) => r.data),

  debitNotes: (vendorId: string | number) =>
    api.get(`/api/debit-notes/vendor/${vendorId}`).then((r) => r.data),
  debitNoteItems: (debitNoteId: string | number) =>
    api.get(`/api/debit-notes/${debitNoteId}/items`).then((r) => r.data),

  documentSequences: () => api.get('/api/documents/all-sequences').then((r) => r.data),
  masterBanks: () => api.get('/api/master/banks').then((r) => r.data),
  bankAccounts: () => api.get('/api/bank-accounts').then((r) => r.data),
  unconsumedDebits: () => api.get('/api/finance/reconciliation/bank/unconsumed-debits').then((r) => r.data),
}
