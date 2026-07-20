import { api } from '@/lib/axios'

/** Full endpoint surface for the Incentives module — extracted from the source app (Build Spec §8). */
export const incentivesApi = {
  getFinanceLoans: () => api.get('/api/finance/loans').then((r) => r.data),
  getFinanceReconciliationBankList: () => api.get('/api/finance/reconciliation/bank/list').then((r) => r.data),
  getProducts: () => api.get('/api/products').then((r) => r.data),
  getTargetsPlans: () => api.get('/api/targets/plans').then((r) => r.data),
}
