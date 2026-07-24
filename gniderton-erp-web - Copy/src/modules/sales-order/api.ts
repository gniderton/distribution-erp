import { api } from '@/lib/axios'

export const sales_orderApi = {
  getProducts: () => api.get('/api/products').then((r) => r.data),
  // Filter for 'Confirmed' sales orders by default to match Appsmith getSalesOrder action
  getSalesOrders: (status = 'Confirmed') => 
    api.get('/api/sales-orders', { params: { status } }).then((r) => r.data),
  createSalesBulkInvoiceGenerate: (payload: {
    order_ids: (string | number)[]
    transit_stock: Record<string, { qty: number; batch_code: string; rate: number }>
    allow_negative_stock: boolean
  }) => api.post('/api/sales/bulk-invoice-generate', payload).then((r) => r.data),
}
