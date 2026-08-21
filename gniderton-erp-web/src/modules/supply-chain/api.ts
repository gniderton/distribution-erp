import { api } from '@/lib/axios'

/** Full endpoint surface for the Supply Chain Management module — extracted from the source app (Build Spec §8). */
export const supply_chainApi = {
  removeDeliveryTrips: (id: string | number) => api.delete(`/api/delivery/trips/${id}`).then((r) => r.data),
  getDeliveryInvoicesPool: () => api.get('/api/delivery/invoices-pool').then((r) => r.data),
  getDeliveryInvoicesDeliveryCycle: (invoiceid: string | number) => api.get(`/api/delivery/invoices/${invoiceid}/delivery-cycle`).then((r) => r.data),
  getDeliverySyncLogs: () => api.get('/api/delivery/sync-logs').then((r) => r.data),
  getDeliverySyncLogsHistory: () => api.get('/api/delivery/sync-logs/history').then((r) => r.data),
  getDeliverySyncDetails: (id: string | number) => api.get(`/api/delivery/sync/${id}/details`).then((r) => r.data),
  getDeliverySyncHistory: (id: string | number) => api.get(`/api/delivery/sync/${id}/history`).then((r) => r.data),
  getDeliveryTeams: () => api.get('/api/delivery/teams').then((r) => r.data),
  createDeliveryTeam: (data: { name: string, driver_id?: number, vehicle_id?: number, helper_ids?: number[] }) => api.post('/api/delivery/teams', data).then((r) => r.data),
  getDeliveryTrips: () => api.get('/api/delivery/trips').then((r) => r.data),
  getDeliveryTripsManifestWeb: (id: string | number) => api.get(`/api/delivery/trips/${id}/manifest-web`).then((r) => r.data),
  getDeliveryTripsPicklistWeb: (id: string | number) => api.get(`/api/delivery/trips/${id}/picklist-web`).then((r) => r.data),
  getDeliveryTripsPicklistWeb2: (tripid: string | number) => api.get(`/api/delivery/trips/${tripid}/picklist-web`).then((r) => r.data),
  getDeliveryTripsProductBreakdown: (id: string | number, productId: number, mrp: number) => 
    api.get(`/api/delivery/trips/${id}/product-breakdown`, { params: { product_id: productId, mrp } }).then((r) => r.data),
  getEmployeesProfile: () => api.get('/api/employees/profile').then((r) => r.data),
  getAllEmployees: () => api.get('/api/employees').then((r) => r.data),
  getDeliveryVehicles: () => api.get('/api/delivery/vehicles').then((r) => r.data),
  createDeliveryVehicle: (data: { vehicle_number: string, vehicle_type?: string }) => api.post('/api/delivery/vehicles', data).then((r) => r.data),
  getSalesBankDetails3: () => api.get('/api/sales/bank-details/3').then((r) => r.data),
  getSalesUnified: () => api.get('/api/sales/unified').then((r) => r.data),
  getSalesUnified2: (id: string | number) => api.get(`/api/sales/unified/${id}`).then((r) => r.data),
  createDeliveryMarkSelfCollected: (payload: any) => api.post('/api/delivery/mark-self-collected', payload).then((r) => r.data),
  createDeliveryTrips: (payload: any) => api.post('/api/delivery/trips', payload).then((r) => r.data),
  generateEwayBills: (tripId: string | number) => api.post(`/api/eway-bill/bulk-trip/${tripId}`).then((r) => r.data),
  clearEwayBill: (invoiceId: string | number) => api.post(`/api/eway-bill/clear/${invoiceId}`).then((r) => r.data),
  uploadEwayBillResponse: (formData: FormData) => api.post('/api/eway-bill/upload-response', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  createDeliveryVerifySettle: (payload: any) => api.post('/api/delivery/verify/settle', payload).then((r) => r.data),
  updateDeliveryTrips: (id: string | number, payload: any = {}) => api.put(`/api/delivery/trips/${id}`, payload).then((r) => r.data),
}
