export interface Product {
  id: string | number
  name: string
  sku?: string
  brand?: string
  category?: string
  hsn?: string
  tax_rate?: number
  stock_qty?: number
  price?: number
  status?: 'active' | 'inactive'
}
