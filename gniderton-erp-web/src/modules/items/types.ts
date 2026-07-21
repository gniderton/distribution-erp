export interface Product {
  id: string | number
  product_name: string
  product_code?: string
  ean_code?: string
  brand_name?: string
  category_name?: string
  hsn_code?: string
  mrp?: number
  retail_rate?: number
  wholesale_rate?: number
  dealer_rate?: number
  distributor_rate?: number
  purchase_rate?: number
  current_stock?: number | string
  is_active?: boolean
  case_quantity?: number
  uom?: string
  model_number?: string
  min_stock_level?: number
  box_length_cm?: string
  box_width_cm?: string
  box_height_cm?: string
  weight_kg?: string
  description?: string
  tax_name?: string
  tax_percentage?: string
}

export interface Batch {
  id: string | number
  product_id: string | number
  batch_number: string
  expiry_date?: string
  mrp?: number
  stock_qty: number
}

export interface StockAdjustment {
  id?: string | number
  product_id: string | number
  batch_id?: string | number
  adjusted_qty: number
  reason: string
  reference?: string
  date?: string
}
