import { api } from '@/lib/axios'

/** Full endpoint surface for the Cheque Management module — extracted from the source app (Build Spec §8). */
export const cheque_managementApi = {
  getBankAccounts: () => api.get('/api/bank-accounts').then((r) => r.data),
  getEmployeesProfile: () => api.get('/api/employees/profile').then((r) => r.data),
  getFinanceCheques: () => api.get('/api/finance/cheques').then((r) => r.data),
  getFinanceReconciliationBankUnconsumedCredits: () => api.get('/api/finance/reconciliation/bank/unconsumed-credits').then((r) => r.data),
  getFinanceReconciliationBankUnconsumedDebits: () => api.get('/api/finance/reconciliation/bank/unconsumed-debits').then((r) => r.data),
  createFinanceChequesBulkClear: (payload: any) => api.post('/api/finance/cheques/bulk-clear', payload).then((r) => r.data),
  createFinanceChequesBounce: (id: string | number, payload: any = {}) => api.post(`/api/finance/cheques/${id}/bounce`, payload).then((r) => r.data),
  createFinanceChequesUnclear: (id: string | number, payload: any = {}) => api.post(`/api/finance/cheques/${id}/unclear`, payload).then((r) => r.data),
}
