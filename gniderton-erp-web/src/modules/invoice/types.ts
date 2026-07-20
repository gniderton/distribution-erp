export interface Invoice {
  id: string | number
  invoice_no?: string
  customer_name?: string
  order_id?: string | number
  amount?: number
  status?: 'paid' | 'pending' | 'overdue' | 'draft'
  date?: string
}
