import { Drawer } from '@/components/ui/Drawer'
import { AutoTable } from '@/components/shared/AutoTable'
import { useExpenseLedger, useIncomeLedger } from '../hooks'

interface Props {
  open: boolean
  onClose: () => void
  entityId: string | number | null
  type: 'expense' | 'income'
}

export function EntityLedgerModal({ open, onClose, entityId, type }: Props) {
  const expenseLedger = useExpenseLedger(entityId || '')
  const incomeLedger = useIncomeLedger(entityId || '')

  const { data, isLoading, isError } = type === 'expense' ? expenseLedger : incomeLedger

  return (
    <Drawer open={open} onClose={onClose} title={`${type === 'expense' ? 'Vendor' : 'Income Source'} Ledger`} description="Full transaction history">
      <div className="p-6 h-[70vh] flex flex-col">
        <div className="flex-1 overflow-auto border border-border-subtle rounded-xl">
          <AutoTable
            data={data}
            isLoading={isLoading}
            isError={isError}
            emptyTitle="No ledger entries found"
            emptyDescription="This entity does not have any recorded transactions yet."
          />
        </div>
      </div>
    </Drawer>
  )
}
