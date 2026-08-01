import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ExpenseTab } from './components/ExpenseTab'
import { IncomeTab } from './components/IncomeTab'
import { TransfersTab } from './components/TransfersTab'
import { ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

type Tab = 'expenses' | 'income' | 'transfers'

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('expenses')

  const tabs = [
    { id: 'expenses', label: 'Expenses', icon: ArrowUpFromLine },
    { id: 'income', label: 'Other Income', icon: ArrowDownToLine },
    { id: 'transfers', label: 'Internal Transfers', icon: ArrowRightLeft },
  ] as const

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-6">
      <div className="shrink-0">
        <PageHeader
          eyebrow="TXN · Finance"
          title="Transactions"
          description="Manage expenses, other income, and internal transfers."
        />
        
        <div className="flex border-b border-border-subtle mt-6 bg-transparent">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all -mb-px ${
                  isActive 
                    ? 'border-brand-600 text-brand-600' 
                    : 'border-transparent text-ink-600 hover:text-ink-900'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-brand-600' : 'text-ink-400'} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-border-subtle">
        {activeTab === 'expenses' && <ExpenseTab />}
        {activeTab === 'income' && <IncomeTab />}
        {activeTab === 'transfers' && <TransfersTab />}
      </div>
    </div>
  )
}
