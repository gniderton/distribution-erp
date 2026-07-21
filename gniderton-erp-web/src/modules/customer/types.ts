export interface Customer {
  id: string | number
  customer_name: string
  customer_phone?: string
  channel_name?: string
  route_name?: string
  verification_status?: 'active' | 'pending' | 'inactive'
  // raw fields for editing
  channel_id?: string | number
  route_id?: string | number
}
