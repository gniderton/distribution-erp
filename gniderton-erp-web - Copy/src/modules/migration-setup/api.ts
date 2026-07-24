import { api } from '@/lib/axios'

/** Full endpoint surface for the Migration Setup module — extracted from the source app (Build Spec §8). */
export const migration_setupApi = {
  createMigrationCustomerAdvances: (payload: any) => api.post('/api/migration/customer-advances', payload).then((r) => r.data),
  createMigrationCustomers: (payload: any) => api.post('/api/migration/customers', payload).then((r) => r.data),
  createMigrationLoans: (payload: any) => api.post('/api/migration/loans', payload).then((r) => r.data),
  createMigrationOpeningStock: (payload: any) => api.post('/api/migration/opening-stock', payload).then((r) => r.data),
  createMigrationOutstandingBills: (payload: any) => api.post('/api/migration/outstanding-bills', payload).then((r) => r.data),
  createMigrationOutstandingInvoices: (payload: any) => api.post('/api/migration/outstanding-invoices', payload).then((r) => r.data),
  createMigrationVendorAdvances: (payload: any) => api.post('/api/migration/vendor-advances', payload).then((r) => r.data),
  createMigrationVendors: (payload: any) => api.post('/api/migration/vendors', payload).then((r) => r.data),
}
