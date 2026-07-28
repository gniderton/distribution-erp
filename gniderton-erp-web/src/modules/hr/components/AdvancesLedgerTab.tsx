import { AutoTable } from '@/components/shared/AutoTable'
import { useEmployeeAdvances } from '../hooks'
import { Button } from '@/components/ui/Button'
import { Landmark, Plus } from 'lucide-react'

export function AdvancesLedgerTab() {
  const { data, isLoading, isError } = useEmployeeAdvances()

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-ink-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-brand-50 rounded-lg">
            <Landmark className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink-900">Advances Ledger</h2>
            <p className="text-ink-600 text-sm">Track short-term salary advances and liabilities.</p>
          </div>
        </div>
        
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Issue Advance
        </Button>
      </div>

      <div className="flex-1 bg-white border border-ink-200 rounded-lg overflow-hidden">
        <AutoTable
          data={data}
          isLoading={isLoading}
          isError={isError}
          emptyTitle="No Advances"
          emptyDescription="No historical advances found."
        />
      </div>
    </div>
  )
}
