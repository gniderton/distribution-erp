import { api } from '@/lib/axios'

/** Full endpoint surface for the Payment Settlement module — extracted from the source app (Build Spec §8). */
export const payment_settlementApi = {
  getEmployeesProfile: () => api.get('/api/employees/profile').then((r) => r.data),
  getFinanceReconciliationBankUnconsumedCredits: () => api.get('/api/finance/reconciliation/bank/unconsumed-credits').then((r) => r.data),
  getFinanceReconciliationExpenses: () => api.get('/api/finance/reconciliation/expenses').then((r) => r.data),
  getFinanceReconciliationList: (status?: string) => api.get('/api/finance/reconciliation/list', { params: { status } }).then((r) => r.data),
  getFinanceReconciliationDetails: (reportid: string | number) => {
    if (!reportid || reportid === 'null') return Promise.resolve(null)
    return api.get(`/api/finance/reconciliation/${reportid}/details`).then((r) => r.data)
  },
  createFinanceReconciliationBulkUpdate: (payload: any) => api.post('/api/finance/reconciliation/bulk-update', payload).then((r) => r.data),
  createFinanceReconciliationExpensesProcess: (id: string | number, payload: any = {}) => api.post(`/api/finance/reconciliation/expenses/${id}/process`, payload).then((r) => r.data),
}
