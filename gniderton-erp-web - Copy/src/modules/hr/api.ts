import { api } from '@/lib/axios'

/** Full endpoint surface for the HR module — extracted from the source app (Build Spec §8). */
export const hrApi = {
  removeEmployeesAdvances: (id: string | number) => api.delete(`/api/employees/advances/${id}`).then((r) => r.data),
  getBankAccounts: () => api.get('/api/bank-accounts').then((r) => r.data),
  getEmployees: () => api.get('/api/employees').then((r) => r.data),
  getEmployeesAdvances: () => api.get('/api/employees/advances').then((r) => r.data),
  getEmployeesDesignations: () => api.get('/api/employees/designations').then((r) => r.data),
  getEmployeesProfile: () => api.get('/api/employees/profile').then((r) => r.data),
  getEmployeesProfile2: (id: string | number) => api.get(`/api/employees/profile/${id}`).then((r) => r.data),
  getEmployeesSalaryPreview: () => api.get('/api/employees/salary-preview').then((r) => r.data),
  getEmployeesAttendance: (id: string | number) => api.get(`/api/employees/${id}/attendance`).then((r) => r.data),
  getEmployeesSalaryHistory: (id: string | number) => api.get(`/api/employees/${id}/salary-history`).then((r) => r.data),
  getFinanceReconciliationBankUnconsumedDebits: () => api.get('/api/finance/reconciliation/bank/unconsumed-debits').then((r) => r.data),
  getMasterBanks: () => api.get('/api/master/banks').then((r) => r.data),
  getSalesInvoicesLookup: () => api.get('/api/sales/invoices/lookup').then((r) => r.data),
  createEmployees: (payload: any) => api.post('/api/employees', payload).then((r) => r.data),
  createEmployeesBulkAttendance: (payload: any) => api.post('/api/employees/bulk-attendance', payload).then((r) => r.data),
  createEmployeesBulkBonus: (payload: any) => api.post('/api/employees/bulk-bonus', payload).then((r) => r.data),
  createEmployeesBulkSalaryAdvance: (payload: any) => api.post('/api/employees/bulk-salary-advance', payload).then((r) => r.data),
  createEmployeesBulkSalaryPayment: (payload: any) => api.post('/api/employees/bulk-salary-payment', payload).then((r) => r.data),
  createEmployeesBulkSalaryUpdate: (payload: any) => api.post('/api/employees/bulk-salary-update', payload).then((r) => r.data),
  createEmployeesLiabilities: (payload: any) => api.post('/api/employees/liabilities', payload).then((r) => r.data),
  createEmployeesSalaryUpdate: (employeeid: string | number, payload: any = {}) => api.post(`/api/employees/${employeeid}/salary-update`, payload).then((r) => r.data),
  createEmployeesResign: (id: string | number, payload: any = {}) => api.post(`/api/employees/${id}/resign`, payload).then((r) => r.data),
}
