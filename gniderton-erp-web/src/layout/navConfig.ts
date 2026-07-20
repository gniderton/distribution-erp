import type { LucideIcon } from 'lucide-react'
import {
  ShoppingCart, Truck, FileText, Percent, Undo2, FileMinus,
  Package, Route,
  Landmark, Boxes, ScrollText, ArrowLeftRight, Wallet, Receipt, BarChart3,
  Users, GraduationCap, Trophy,
  UploadCloud, Settings, PenSquare,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  code: string
  icon: LucideIcon
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * Sidebar structure. The 3-letter "code" next to each item is a real
 * module reference (like a ledger account code), not decoration —
 * mirrors how the business already talks about these modules internally.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Sell',
    items: [
      { label: 'Sales Order', path: '/sales-order', code: 'SAL', icon: ShoppingCart },
      { label: 'Invoice', path: '/invoice', code: 'INV', icon: FileText },
      { label: 'Schemes', path: '/schemes', code: 'SCH', icon: Percent },
      { label: 'Credit Note', path: '/credit-note', code: 'CRN', icon: Undo2 },
    ],
  },
  {
    label: 'Buy',
    items: [
      { label: 'Inventory (PO/GRN)', path: '/inventory', code: 'PUR', icon: Truck },
      { label: 'Vendor', path: '/vendor', code: 'VEN', icon: Landmark },
      { label: 'Debit Notes', path: '/debit-notes', code: 'DBN', icon: FileMinus },
    ],
  },
  {
    label: 'Stock',
    items: [
      { label: 'Items', path: '/items', code: 'ITM', icon: Package },
      { label: 'Supply Chain', path: '/supply-chain', code: 'SCM', icon: Route },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Transactions', path: '/transactions', code: 'TXN', icon: ArrowLeftRight },
      { label: 'Loan', path: '/loan', code: 'LON', icon: Wallet },
      { label: 'Assets', path: '/assets', code: 'AST', icon: Boxes },
      { label: 'Cheque Mgmt', path: '/cheque-management', code: 'CHQ', icon: Receipt },
      { label: 'Payment Settlement', path: '/payment-settlement', code: 'PST', icon: ScrollText },
      { label: 'GST', path: '/gst', code: 'GST', icon: Landmark },
      { label: 'Reports', path: '/reports', code: 'RPT', icon: BarChart3 },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Customer', path: '/customer', code: 'CUS', icon: Users },
      { label: 'HR', path: '/hr', code: 'HRM', icon: GraduationCap },
      { label: 'Incentives', path: '/incentives', code: 'INC', icon: Trophy },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Migration Setup', path: '/migration-setup', code: 'MIG', icon: UploadCloud },
      { label: 'Settings', path: '/settings', code: 'SET', icon: Settings },
      { label: 'Letterhead Editor', path: '/letterhead-editor', code: 'LTR', icon: PenSquare },
    ],
  },
]
