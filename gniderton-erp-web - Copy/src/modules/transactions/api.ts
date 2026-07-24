import { api } from '@/lib/axios'

/** Full endpoint surface for the Transactions module — extracted from the source app (Build Spec §8). */
export const transactionsApi = {
  removeFinanceExpenses: (id: string | number) => api.delete(`/api/finance/expenses/${id}`).then((r) => r.data),
  removeFinanceOtherIncome: (id: string | number) => api.delete(`/api/finance/other-income/${id}`).then((r) => r.data),
  removeFinanceTransfers: (id: string | number) => api.delete(`/api/finance/transfers/${id}`).then((r) => r.data),
  getBankAccounts: () => api.get('/api/bank-accounts').then((r) => r.data),
  getEmployeesProfile: () => api.get('/api/employees/profile').then((r) => r.data),
  getEntitiesExpense: () => api.get('/api/entities/expense').then((r) => r.data),
  getEntitiesExpenseLedger: (id: string | number) => api.get(`/api/entities/expense/${id}/ledger`).then((r) => r.data),
  getEntitiesIncome: () => api.get('/api/entities/income').then((r) => r.data),
  getEntitiesIncomeLedger: (id: string | number) => api.get(`/api/entities/income/${id}/ledger`).then((r) => r.data),
  getFinanceExpenses: () => api.get('/api/finance/expenses').then((r) => r.data),
  getFinanceExpensesCategories: () => api.get('/api/finance/expenses/categories').then((r) => r.data),
  getFinanceOtherIncome: () => api.get('/api/finance/other-income').then((r) => r.data),
  getFinanceOtherIncomeCategories: () => api.get('/api/finance/other-income/categories').then((r) => r.data),
  getFinanceReconciliationBankUnconsumedCredits: () => api.get('/api/finance/reconciliation/bank/unconsumed-credits').then((r) => r.data),
  getFinanceReconciliationBankUnconsumedDebits: () => api.get('/api/finance/reconciliation/bank/unconsumed-debits').then((r) => r.data),
  getFinanceTransfers: () => api.get('/api/finance/transfers').then((r) => r.data),
  getMasterBanks: () => api.get('/api/master/banks').then((r) => r.data),
  createEntitiesExpense: (payload: any) => api.post('/api/entities/expense', payload).then((r) => r.data),
  createEntitiesIncome: (payload: any) => api.post('/api/entities/income', payload).then((r) => r.data),
  createFinanceExpenses: (payload: any) => api.post('/api/finance/expenses', payload).then((r) => r.data),
  createFinanceOtherIncome: (payload: any) => api.post('/api/finance/other-income', payload).then((r) => r.data),
  createFinanceTransfers: (payload: any) => api.post('/api/finance/transfers', payload).then((r) => r.data),
}
