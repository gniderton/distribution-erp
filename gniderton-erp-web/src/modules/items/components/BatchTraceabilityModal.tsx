import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { DataTable } from '@/components/shared/DataTable'
import { formatDate } from '@/lib/utils'
import { itemsApi } from '../api'

interface BatchTraceabilityModalProps {
  open: boolean
  onClose: () => void
  batch: any
}

export function BatchTraceabilityModal({ open, onClose, batch }: BatchTraceabilityModalProps) {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && batch?.id) {
      setIsLoading(true)
      itemsApi.getBatchTraceability(batch.id)
        .then((res: any[]) => setData(res))
        .catch(console.error)
        .finally(() => setIsLoading(false))
    }
  }, [open, batch?.id])

  if (!batch) return null

  return (
    <Dialog open={open} onClose={onClose} size="4xl" title={`Traceability: Batch ${batch.batch_code}`}>
      <div className="space-y-4">
        <div className="bg-ink-50 p-4 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm text-ink-500">Remaining Stock</p>
            <p className="text-xl font-bold font-mono-figures">{batch.quantity_remaining}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-ink-500">Expiry Date</p>
            <p className="font-semibold">{batch.expiry_date ? formatDate(batch.expiry_date) : 'N/A'}</p>
          </div>
        </div>

        <DataTable
          data={data}
          isLoading={isLoading}
          columns={[
            { accessorKey: 'date', header: 'Date', cell: (c) => formatDate(c.getValue() as string) },
            { 
              accessorKey: 'transaction_type', 
              header: 'Type',
              cell: (c) => {
                const val = c.getValue() as string;
                return (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${val === 'IN' ? 'bg-success-100 text-success-800' : 'bg-brand-100 text-brand-800'}`}>
                    {val}
                  </span>
                )
              }
            },
            { 
              accessorKey: 'quantity_change', 
              header: 'Qty Change',
              cell: (c) => {
                const val = Number(c.getValue())
                return (
                  <span className={`font-mono-figures font-bold ${val > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                    {val > 0 ? `+${val}` : val}
                  </span>
                )
              }
            },
            { accessorKey: 'reference_number', header: 'Reference No.' },
            { accessorKey: 'party_name', header: 'Party / Customer', cell: (c) => c.getValue() || '-' }
          ]}
        />
      </div>
    </Dialog>
  )
}
