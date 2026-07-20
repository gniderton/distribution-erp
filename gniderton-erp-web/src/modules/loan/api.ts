import { api } from '@/lib/axios'

/** Full endpoint surface for the Loan module — extracted from the source app (Build Spec §8). */
export const loanApi = {
  removeFinanceLoansTransactions: (id: string | number) => api.delete(`/api/finance/loans/transactions/${id}`).then((r) => r.data),
  removeFinanceLoans: (id: string | number) => api.delete(`/api/finance/loans/${id}`).then((r) => r.data),
  getBankAccounts: () => api.get('/api/bank-accounts').then((r) => r.data),
  getEmployees: () => api.get('/api/employees').then((r) => r.data),
  getEmployeesProfile: () => api.get('/api/employees/profile').then((r) => r.data),
  getFinanceLoans: () => api.get('/api/finance/loans').then((r) => r.data),
  getFinanceLoansLedger: (id: string | number) => api.get(`/api/finance/loans/${id}/ledger`).then((r) => r.data),
  getFinanceReconciliationBankUnconsumedCredits: () => api.get('/api/finance/reconciliation/bank/unconsumed-credits').then((r) => r.data),
  getFinanceReconciliationBankUnconsumedDebits: () => api.get('/api/finance/reconciliation/bank/unconsumed-debits').then((r) => r.data),
  getLoanEntities: () => api.get('/api/loan-entities').then((r) => r.data),
  getLoanEntitiesLedger: (id: string | number) => api.get(`/api/loan-entities/${id}/ledger`).then((r) => r.data),
  createFinanceLoans: (payload: any) => api.post('/api/finance/loans', payload).then((r) => r.data),
  createFinanceLoansInstallment: (id: string | number, payload: any = {}) => api.post(`/api/finance/loans/${id}/installment`, payload).then((r) => r.data),
  createLoanEntities: (payload: any) => api.post('/api/loan-entities', payload).then((r) => r.data),
}
