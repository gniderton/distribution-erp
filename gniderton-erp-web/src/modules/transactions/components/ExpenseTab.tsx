import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AutoTable } from '@/components/shared/AutoTable'
import { useExpenses, useExpenseEntities } from '../hooks'
import { ExpenseDrawer } from './ExpenseDrawer'
import { EntityDrawer } from './EntityDrawer'
import { EntityLedgerModal } from './EntityLedgerModal'

export function ExpenseTab() {
  const [subTab, setSubTab] = useState<'transactions' | 'entities'>('transactions')
  
  const [isExpenseDrawerOpen, setIsExpenseDrawerOpen] = useState(false)
  const [isEntityDrawerOpen, setIsEntityDrawerOpen] = useState(false)
  
  const [selectedEntityId, setSelectedEntityId] = useState<string | number | null>(null)

  const { data: expenses, isLoading: expensesLoading, isError: expensesError } = useExpenses()
  const { data: entities, isLoading: entitiesLoading, isError: entitiesError } = useExpenseEntities()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle shrink-0">
        <div className="flex bg-surface rounded-lg p-1 border border-border-subtle">
          <button
            onClick={() => setSubTab('transactions')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              subTab === 'transactions' ? 'bg-white shadow text-ink-900' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            Expense Transactions
          </button>
          <button
            onClick={() => setSubTab('entities')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              subTab === 'entities' ? 'bg-white shadow text-ink-900' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            Vendors / Entities
          </button>
        </div>
        
        <div>
          {subTab === 'transactions' && (
            <Button variant="primary" size="sm" onClick={() => setIsExpenseDrawerOpen(true)}>
              <Plus size={16} className="mr-1.5" />
              Record Expense
            </Button>
          )}
          {subTab === 'entities' && (
            <Button variant="primary" size="sm" onClick={() => setIsEntityDrawerOpen(true)}>
              <Plus size={16} className="mr-1.5" />
              Create Vendor
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {subTab === 'transactions' && (
          <AutoTable
            data={expenses}
            isLoading={expensesLoading}
            isError={expensesError}
            emptyTitle="No expenses found"
            emptyDescription="Record a new expense to see it listed here."
          />
        )}

        {subTab === 'entities' && (
          <AutoTable
            data={entities}
            isLoading={entitiesLoading}
            isError={entitiesError}
            emptyTitle="No vendors found"
            emptyDescription="Create a new vendor entity to see it listed here."
            onRowClick={(row) => setSelectedEntityId(row.id)}
          />
        )}
      </div>

      <ExpenseDrawer 
        open={isExpenseDrawerOpen} 
        onClose={() => setIsExpenseDrawerOpen(false)} 
      />
      <EntityDrawer
        open={isEntityDrawerOpen}
        onClose={() => setIsEntityDrawerOpen(false)}
        type="expense"
      />
      <EntityLedgerModal
        open={!!selectedEntityId}
        onClose={() => setSelectedEntityId(null)}
        entityId={selectedEntityId}
        type="expense"
      />
    </div>
  )
}
