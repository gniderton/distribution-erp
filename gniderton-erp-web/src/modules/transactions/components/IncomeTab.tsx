import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AutoTable } from '@/components/shared/AutoTable'
import { useOtherIncome, useIncomeEntities } from '../hooks'
import { IncomeDrawer } from './IncomeDrawer'
import { EntityDrawer } from './EntityDrawer'
import { EntityLedgerModal } from './EntityLedgerModal'

export function IncomeTab() {
  const [subTab, setSubTab] = useState<'transactions' | 'entities'>('transactions')
  
  const [isIncomeDrawerOpen, setIsIncomeDrawerOpen] = useState(false)
  const [isEntityDrawerOpen, setIsEntityDrawerOpen] = useState(false)
  
  const [selectedEntityId, setSelectedEntityId] = useState<string | number | null>(null)

  const { data: incomes, isLoading: incomesLoading, isError: incomesError } = useOtherIncome()
  const { data: entities, isLoading: entitiesLoading, isError: entitiesError } = useIncomeEntities()

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
            Income Transactions
          </button>
          <button
            onClick={() => setSubTab('entities')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              subTab === 'entities' ? 'bg-white shadow text-ink-900' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            Income Sources / Entities
          </button>
        </div>
        
        <div>
          {subTab === 'transactions' && (
            <Button variant="primary" size="sm" onClick={() => setIsIncomeDrawerOpen(true)}>
              <Plus size={16} className="mr-1.5" />
              Record Income
            </Button>
          )}
          {subTab === 'entities' && (
            <Button variant="primary" size="sm" onClick={() => setIsEntityDrawerOpen(true)}>
              <Plus size={16} className="mr-1.5" />
              Create Source
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {subTab === 'transactions' && (
          <AutoTable
            data={incomes}
            isLoading={incomesLoading}
            isError={incomesError}
            emptyTitle="No income found"
            emptyDescription="Record a new income entry to see it listed here."
          />
        )}

        {subTab === 'entities' && (
          <AutoTable
            data={entities}
            isLoading={entitiesLoading}
            isError={entitiesError}
            emptyTitle="No income sources found"
            emptyDescription="Create a new income source entity to see it listed here."
            onRowClick={(row) => setSelectedEntityId(row.id)}
          />
        )}
      </div>

      <IncomeDrawer 
        open={isIncomeDrawerOpen} 
        onClose={() => setIsIncomeDrawerOpen(false)} 
      />
      <EntityDrawer
        open={isEntityDrawerOpen}
        onClose={() => setIsEntityDrawerOpen(false)}
        type="income"
      />
      <EntityLedgerModal
        open={!!selectedEntityId}
        onClose={() => setSelectedEntityId(null)}
        entityId={selectedEntityId}
        type="income"
      />
    </div>
  )
}
