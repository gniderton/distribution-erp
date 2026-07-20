export interface Vendor {
  id: string | number
  vendor_code?: string
  vendor_name: string
  contact_person?: string
  contact_no?: string
  contact_no_2?: string
  email?: string
  gst?: string
  pan?: string
  is_active?: boolean
  credit_limit_amount?: string | number
  credit_period_days?: number
  bank_name?: string
  bank_account_no?: string
  bank_ifsc?: string
  address_line1?: string
  address_line2?: string
  state?: string
  district?: string
  created_at?: string
}

export interface VendorAddress {
  id: string | number
  vendor_id?: string | number
  address_line: string
  city?: string
  district?: string
  state_code?: string
  pin_code?: string
  is_default?: boolean
  is_active?: boolean
  created_at?: string
}

export interface VendorPayment {
  id: string | number
  vendor_id: string | number
  payment_number?: string
  payment_date: string
  amount: number
  payment_mode?: string
  transaction_ref?: string
  remarks?: string
  bank_account_id?: number | string
  created_at?: string
}
