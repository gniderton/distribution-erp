import { useState } from 'react'
import { Plus, Banknote, Users } from 'lucide-react'
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
  
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null)

  const { data: incomes, isLoading: incomesLoading, isError: incomesError } = useOtherIncome()
  const { data: entities, isLoading: entitiesLoading, isError: entitiesError } = useIncomeEntities()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-0 border-b border-border-subtle shrink-0">
        <div className="flex">
          <button
            onClick={() => setSubTab('transactions')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 -mb-[1px] transition-all ${
              subTab === 'transactions' ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-600 hover:text-ink-900'
            }`}
          >
            <Banknote size={14} />
            Income Transactions
          </button>
          <button
            onClick={() => setSubTab('entities')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 -mb-[1px] transition-all ${
              subTab === 'entities' ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-600 hover:text-ink-900'
            }`}
          >
            <Users size={14} />
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
            onRowClick={(row) => setSelectedEntity(row)}
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
        open={!!selectedEntity}
        onClose={() => setSelectedEntity(null)}
        entity={selectedEntity}
        type="income"
      />
    </div>
  )
}
