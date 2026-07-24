import { api } from '@/lib/axios'

/** Full endpoint surface for the GST module — extracted from the source app (Build Spec §8). */
export const gstApi = {
  getFinanceGstGstr1: () => api.get('/api/finance/gst/gstr1').then((r) => r.data),
  getFinanceGstGstr3b: () => api.get('/api/finance/gst/gstr3b').then((r) => r.data),
  getFinanceGstHsnSummary: () => api.get('/api/finance/gst/hsn-summary').then((r) => r.data),
}
