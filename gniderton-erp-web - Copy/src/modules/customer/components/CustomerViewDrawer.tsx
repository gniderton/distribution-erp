import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { LayoutDashboard, User, BookOpen, FileText, Tag } from 'lucide-react'
import type { Customer } from '../types'
import { CustomerDashboardTab } from './CustomerDashboardTab'
import { CustomerDetailsTab } from './CustomerDetailsTab'
import { CustomerLedgerTab } from './CustomerLedgerTab'
import { CustomerPendingBillsTab } from './CustomerPendingBillsTab'
import { CustomerPricingTab } from './CustomerPricingTab'

export function CustomerViewDrawer({ open, onClose, customer }: { open: boolean; onClose: () => void; customer?: Customer | null }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'details' | 'ledger' | 'bills' | 'pricing'>('dashboard')
  const isEdit = !!customer

  // If we are creating a new customer, we only show the Details tab
  const tabsConfig = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'details', label: 'Details', icon: User },
    { id: 'ledger', label: 'Ledger', icon: BookOpen },
    { id: 'bills', label: 'Bills', icon: FileText },
    { id: 'pricing', label: 'Pricing', icon: Tag }
  ]

  const activeTabsConfig = isEdit ? tabsConfig : [tabsConfig.find(t => t.id === 'details')!]

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? customer.customer_name : 'New customer'}
      widthClass="max-w-6xl"
    >
      <div className="flex h-full flex-col">
        {isEdit && (
          <div className="border-b border-border-subtle bg-white px-6">
            <nav className="-mb-px flex space-x-6 overflow-x-auto">
              {activeTabsConfig.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-all border-b-2 ${
                      activeTab === tab.id 
                        ? 'border-brand-600 text-brand-600' 
                        : 'border-transparent text-ink-600 hover:text-ink-900 hover:border-ink-300'
                    }`}
                    onClick={() => setActiveTab(tab.id as any)}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 bg-ink-50/30">
          {(!isEdit || activeTab === 'details') && (
            <CustomerDetailsTab customer={customer} onClose={onClose} />
          )}
          {isEdit && activeTab === 'dashboard' && <CustomerDashboardTab customerId={customer.id} />}
          {isEdit && activeTab === 'ledger' && (
            <CustomerLedgerTab customer={customer} />
          )}
          {isEdit && activeTab === 'bills' && <CustomerPendingBillsTab customerId={customer.id} />}
          {isEdit && activeTab === 'pricing' && <CustomerPricingTab customerId={customer.id} />}
        </div>
      </div>
    </Drawer>
  )
}
