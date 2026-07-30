import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { AutoTable } from '@/components/shared/AutoTable'
import { Button } from '@/components/ui/Button'
import { useExpenses } from './hooks'
import { ExpenseDrawer } from './components/ExpenseDrawer'

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<'expenses' | 'income' | 'transfers'>('expenses')
  const [isExpenseDrawerOpen, setIsExpenseDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)

  // Currently only Expenses are fully hooked up
  const { data: expenses, isLoading: expensesLoading, isError: expensesError } = useExpenses()

  const tabs = [
    { id: 'expenses', label: 'Expenses' },
    { id: 'income', label: 'Other Income' },
    { id: 'transfers', label: 'Internal Transfers' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border-subtle bg-white shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-1">
              TXN · Finance
            </p>
            <h1 className="text-xl font-bold text-ink-900">Transactions</h1>
            <p className="text-sm text-ink-600 mt-1">
              Manage expenses, other income, and internal transfers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'expenses' && (
              <Button variant="primary" onClick={() => setIsExpenseDrawerOpen(true)}>
                <Plus size={16} className="mr-1.5" />
                Record Expense
              </Button>
            )}
            {activeTab === 'income' && (
              <Button variant="primary" onClick={() => {}}>
                <Plus size={16} className="mr-1.5" />
                Record Income
              </Button>
            )}
            {activeTab === 'transfers' && (
              <Button variant="primary" onClick={() => {}}>
                <Plus size={16} className="mr-1.5" />
                Record Transfer
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-6 border-b border-border-subtle">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-brand-600'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-surface p-6">
        {activeTab === 'expenses' && (
          <AutoTable
            data={expenses}
            isLoading={expensesLoading}
            isError={expensesError}
            emptyTitle="No expenses found"
            emptyDescription="Record a new expense to see it listed here."
            onRowClick={(row) => setSelected(row)}
          />
        )}
        
        {activeTab === 'income' && (
          <div className="text-center py-12 text-ink-600 bg-white border border-border-subtle rounded-xl">
            Other Income functionality coming soon.
          </div>
        )}

        {activeTab === 'transfers' && (
          <div className="text-center py-12 text-ink-600 bg-white border border-border-subtle rounded-xl">
            Internal Transfers functionality coming soon.
          </div>
        )}
      </div>

      <ExpenseDrawer 
        open={isExpenseDrawerOpen} 
        onClose={() => setIsExpenseDrawerOpen(false)} 
      />
    </div>
  )
}
