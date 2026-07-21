export interface Customer {
  id: string | number
  customer_name: string
  customer_phone?: string
  email?: string
  whatsapp_number?: string
  is_active?: boolean
  gstin?: string
  pan?: string
  credit_limit?: number
  credit_days?: number
  channel_id?: string | number
  channel_name?: string
  route_id?: string | number
  route_name?: string
  dse_id?: string | number
  route_type_id?: string | number
  route_sequence?: number
  verification_status?: 'active' | 'pending' | 'inactive'
  default_price_tier?: string
  addresses?: Array<{
    address_line1?: string
    address_line2?: string
    city?: string
    state?: string
    pincode?: string
    location_lat?: string
    location_lng?: string
    is_default_billing?: boolean
    is_default_shipping?: boolean
  }>
  // the backend PUT requires nested schema if using Appsmith format
  Basic_Info?: any
  Tax_and_Accounting?: any
  Logistics_Assignment?: any
  Default_Address?: any
}
