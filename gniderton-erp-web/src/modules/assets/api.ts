import { api } from '@/lib/axios'

/** Full endpoint surface for the Assets module — extracted from the source app (Build Spec §8). */
export const assetsApi = {
  getAssetEntities: () => api.get('/api/asset-entities').then((r) => r.data),
  getAssetEntitiesLedger: (id: string | number) => api.get(`/api/asset-entities/${id}/ledger`).then((r) => r.data),
  getAssets: () => api.get('/api/assets').then((r) => r.data),
  getAssetsAccounts: () => api.get('/api/assets/accounts').then((r) => r.data),
  getAssetsCategories: () => api.get('/api/assets/categories').then((r) => r.data),
  getAssetsDepreciations: () => api.get('/api/assets/depreciations').then((r) => r.data),
  getBankAccounts: () => api.get('/api/bank-accounts').then((r) => r.data),
  getEmployeesProfile: () => api.get('/api/employees/profile').then((r) => r.data),
  getFinanceReconciliationBankUnconsumedCredits: () => api.get('/api/finance/reconciliation/bank/unconsumed-credits').then((r) => r.data),
  getFinanceReconciliationBankUnconsumedDebits: () => api.get('/api/finance/reconciliation/bank/unconsumed-debits').then((r) => r.data),
  getMasterBanks: () => api.get('/api/master/banks').then((r) => r.data),
  createAssetEntities: (payload: any) => api.post('/api/asset-entities', payload).then((r) => r.data),
  createAssets: (payload: any) => api.post('/api/assets', payload).then((r) => r.data),
  createAssetsAutoDepreciate: (payload: any) => api.post('/api/assets/auto-depreciate', payload).then((r) => r.data),
  createAssetsPayment: (payload: any) => api.post('/api/assets/payment', payload).then((r) => r.data),
  createAssetsSale: (id: string | number, payload: any = {}) => api.post(`/api/assets/${id}/sale`, payload).then((r) => r.data),
  createAssetsSalePayment: (id: string | number, payload: any = {}) => api.post(`/api/assets/${id}/sale-payment`, payload).then((r) => r.data),
  scrapAsset: (id: string | number, payload: any = {}) => api.post(`/api/assets/${id}/scrap`, payload).then((r) => r.data),
  assignAsset: (id: string | number, payload: any = {}) => api.post(`/api/assets/${id}/assign`, payload).then((r) => r.data),
  addMaintenanceLog: (id: string | number, payload: any = {}) => api.post(`/api/assets/${id}/maintenance`, payload).then((r) => r.data),
  getAssetProfile: (id: string | number) => api.get(`/api/assets/${id}/profile`).then((r) => r.data),
  
  createAssetCategory: (payload: any) => api.post('/api/assets/categories', payload).then((r) => r.data),
  updateAssetCategory: (id: string | number, payload: any) => api.put(`/api/assets/categories/${id}`, payload).then((r) => r.data),
  deleteAssetCategory: (id: string | number) => api.delete(`/api/assets/categories/${id}`).then((r) => r.data),
  createAssetAccount: (payload: any) => api.post('/api/assets/accounts', payload).then((r) => r.data),
  updateAssetEntity: (id: string | number, payload: any) => api.put(`/api/asset-entities/${id}`, payload).then((r) => r.data),
}
