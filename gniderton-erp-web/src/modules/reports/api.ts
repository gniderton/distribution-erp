import { api } from '@/lib/axios'

/** Full endpoint surface for the Reports module (Build Spec §8.16) — the largest module. */
export const reportsApi = {
  balanceSheet: () => api.get('/api/analytics/reports/balance-sheet').then((r) => r.data),
  profitAndLoss: (params?: { fy?: string, quarter?: string, month?: string }) => 
    api.get('/api/analytics/reports/p-and-l', { params }).then((r) => r.data),
  cashFlow: (params?: { start_date?: string, end_date?: string }) => 
    api.get('/api/analytics/reports/cash-flow', { params }).then((r) => r.data),
  fyOperatingBalances: () => api.get('/api/analytics/reports/fy-operating-balances').then((r) => r.data),
  integrityAudit: () => api.get('/api/analytics/reports/integrity-audit').then((r) => r.data),
  salesLines: (params?: any) => api.get('/api/analytics/reports/sales-lines', { params }).then((r) => r.data),
  salesSummaryDetailed: (params?: any) => api.get('/api/analytics/reports/sales-summary-detailed', { params }).then((r) => r.data),
  downloadCorporateReport: (params?: any) => api.get('/api/analytics/generate-corporate-report', { params, responseType: 'blob' }).then(r => r.data),
  salesFyReport: () => api.get('/api/analytics/sales-fy-report').then((r) => r.data),
  employeeDashboard: (id: string | number, params?: { fy?: string; month?: string }) => api.get(`/api/analytics/employees/${id}/dashboard`, { params }).then((r) => r.data),

  accountingCashFlow: () => api.get('/api/accounting/cash-flow').then((r) => r.data),
  forensicSnapshot: () => api.get('/api/accounting/forensic-snapshot').then((r) => r.data),
  sourceTransactions: () => api.get('/api/accounting/source-transactions').then((r) => r.data),
  unifiedLiquidLedger: () => api.get('/api/accounting/unified-liquid-ledger').then((r) => r.data),

  generalLedger: () => api.get('/api/general-ledger').then((r) => r.data),
  journalEntries: () => api.get('/api/journal-entries').then((r) => r.data),

  bankReconciliationList: (params?: any) => api.get('/api/finance/reconciliation/bank/list', { params }).then((r) => r.data),
  bankAuditView: (params?: any) => api.get('/api/finance/reconciliation/bank/audit-view', { params }).then((r) => r.data),
  bankAccounts: () => api.get('/api/bank-accounts').then((r) => r.data),
  uploadBankStatement: (payload: { content: string, bank_type: string }) =>
    api.post('/api/finance/reconciliation/bank/upload', payload).then((r) => r.data),

  paymentAllocations: () => api.get('/api/payments/allocations').then((r) => r.data),
  dsePendingInvoices: () => api.get('/api/payments/dse-pending-invoices').then((r) => r.data),

  purchaseInvoiceLines: (params?: any) => api.get('/api/purchase-invoices/lines', { params }).then((r) => r.data),
  salesInvoiceLines: (params?: { customer_id?: string; start_date?: string; end_date?: string; brand_id?: string; category_id?: string; page?: number; limit?: number }) => api.get('/api/sales/invoice-lines', { params }).then((r) => r.data),

  attendanceDetails: () => api.get('/api/employees/attendance/details').then((r) => r.data),
  customerAdvances: (params?: any) => api.get('/api/analytics/customer-advances', { params }).then(res => res.data),
  creditNoteAllocations: (params?: any) => api.get('/api/analytics/credit-note-allocations', { params }).then(res => res.data),
  salaryPaymentHeaders: () => api.get('/api/employees/salary-payment-headers').then((r) => r.data),
  salaryPaymentDetails: (id: string | number) => api.get(`/api/employees/salary-payment-details/${id}`).then((r) => r.data),

  openingCapital: () => api.get('/api/migration/opening-capital').then((r) => r.data),
}
