import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
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
  const tabs = isEdit 
    ? ['dashboard', 'details', 'ledger', 'bills', 'pricing'] as const 
    : ['details'] as const

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? customer.name : 'New customer'}
      widthClass="max-w-4xl"
    >
      <div className="flex h-full flex-col">
        {isEdit && (
          <div className="border-b border-border bg-white px-6">
            <nav className="-mb-px flex space-x-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={`whitespace-nowrap px-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab 
                      ? 'border-brand-500 text-brand-600' 
                      : 'border-transparent text-ink-600 hover:text-ink-900 hover:border-ink-300'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
                </button>
              ))}
            </nav>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 bg-ink-50/30">
          {(!isEdit || activeTab === 'details') && (
            <CustomerDetailsTab customer={customer} onClose={onClose} />
          )}
          {isEdit && activeTab === 'dashboard' && <CustomerDashboardTab customerId={customer.id} />}
          {isEdit && activeTab === 'ledger' && <CustomerLedgerTab customerId={customer.id} />}
          {isEdit && activeTab === 'bills' && <CustomerPendingBillsTab customerId={customer.id} />}
          {isEdit && activeTab === 'pricing' && <CustomerPricingTab customerId={customer.id} />}
        </div>
      </div>
    </Drawer>
  )
}
