export interface Customer {
  id: string | number
  name: string
  phone?: string
  channel?: string
  route?: string
  balance?: number
  status?: 'active' | 'pending' | 'inactive'
}
