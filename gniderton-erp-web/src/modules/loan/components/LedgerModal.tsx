import { Dialog } from '@/components/ui/Dialog'
import { DataTable } from '@/components/shared/DataTable'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Trash2 } from 'lucide-react'
import { useDeleteInstallment } from '../hooks'

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  data: any;
  isLoading: boolean;
  type: 'loan' | 'entity';
  loanIdForDeletion?: number | null;
}

export function LedgerModal({ open, onClose, title, data, isLoading, type, loanIdForDeletion }: Props) {
  const deleteMutation = useDeleteInstallment(loanIdForDeletion || null)

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.date), 'dd MMM yyyy')
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <Badge tone="neutral">{row.original.type}</Badge>
    },
    {
      accessorKey: 'description',
      header: 'Particulars',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-ink-900">{row.original.description}</p>
          <p className="text-xs text-ink-500">{row.original.reference_number || '-'}</p>
        </div>
      )
    },
    {
      accessorKey: 'debit_amount',
      header: 'Debit (Dr)',
      cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.debit_amount)}</span>
    },
    {
      accessorKey: 'credit_amount',
      header: 'Credit (Cr)',
      cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.credit_amount)}</span>
    },
    {
      accessorKey: 'running_balance',
      header: 'Balance',
      cell: ({ row }) => <span className="font-bold text-brand-600">{formatCurrency(row.original.running_balance)}</span>
    }
  ]

  if (type === 'loan') {
    columns.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => row.original.type === 'INSTALLMENT' && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this installment payment and reverse its accounting?')) {
              deleteMutation.mutate(row.original.id)
            }
          }}
          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
        >
          <Trash2 size={14} />
        </Button>
      )
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Ledger: ${title}`} widthClass="max-w-4xl">
      <div className="p-4 space-y-4">
        {!isLoading && data && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-ink-50 rounded-lg border border-border-subtle">
              <p className="text-xs text-ink-500 font-semibold uppercase">Opening Balance</p>
              <p className="text-lg font-bold mt-1 text-ink-900">{formatCurrency(data.opening_balance)}</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
              <p className="text-xs text-rose-500 font-semibold uppercase">Total Debit</p>
              <p className="text-lg font-bold mt-1 text-rose-700">{formatCurrency(data.total_debit)}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="text-xs text-emerald-600 font-semibold uppercase">Total Credit</p>
              <p className="text-lg font-bold mt-1 text-emerald-700">{formatCurrency(data.total_credit)}</p>
            </div>
            <div className="p-3 bg-brand-50 rounded-lg border border-brand-100">
              <p className="text-xs text-brand-600 font-semibold uppercase">Closing Balance</p>
              <p className="text-lg font-bold mt-1 text-brand-700">{formatCurrency(data.closing_balance)}</p>
            </div>
          </div>
        )}

        <DataTable 
          data={data?.ledger || []} 
          columns={columns} 
          isLoading={isLoading} 
          emptyTitle="No Ledger Entries"
          emptyDescription="Transactions will appear here once recorded."
        />
        
        <div className="flex justify-end pt-4">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Dialog>
  )
}
