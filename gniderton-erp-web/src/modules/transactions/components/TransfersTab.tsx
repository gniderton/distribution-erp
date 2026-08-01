import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AutoTable } from '@/components/shared/AutoTable'
import { useTransfers } from '../hooks'
import { TransferDrawer } from './TransferDrawer'

export function TransfersTab() {
  const [isTransferDrawerOpen, setIsTransferDrawerOpen] = useState(false)
  const { data: transfers, isLoading, isError } = useTransfers()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle shrink-0">
        <div className="flex gap-4">
          <span className="text-sm font-medium text-brand-600">
            Internal Transfers
          </span>
        </div>
        
        <div>
          <Button variant="primary" size="sm" onClick={() => setIsTransferDrawerOpen(true)}>
            <Plus size={16} className="mr-1.5" />
            Record Transfer
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <AutoTable
          data={transfers}
          isLoading={isLoading}
          isError={isError}
          emptyTitle="No transfers found"
          emptyDescription="Record a new internal transfer to see it listed here."
        />
      </div>

      <TransferDrawer 
        open={isTransferDrawerOpen} 
        onClose={() => setIsTransferDrawerOpen(false)} 
      />
    </div>
  )
}
