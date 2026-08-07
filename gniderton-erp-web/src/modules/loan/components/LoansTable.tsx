import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { BookOpen, IndianRupee, Trash2 } from 'lucide-react'
import { useDeleteLoan } from '../hooks'
import type { ColumnDef } from '@tanstack/react-table'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

interface LoansTableProps {
  data: any[];
  isLoading: boolean;
  onViewLedger: (loanId: number) => void;
  onPayEmi: (loan: any) => void;
}

export function LoansTable({ data, isLoading, onViewLedger, onPayEmi }: LoansTableProps) {
  const deleteMutation = useDeleteLoan()

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'loan_number',
      header: 'Loan Details',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-brand-600">{row.original.loan_number}</p>
          <p className="text-xs text-ink-500">{format(new Date(row.original.disbursement_date), 'dd MMM yyyy')}</p>
        </div>
      )
    },
    {
      accessorKey: 'party_name',
      header: 'Party',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-ink-900">{row.original.party_name}</p>
          <Badge tone="neutral" className="mt-1">{row.original.loan_type}</Badge>
        </div>
      )
    },
    {
      accessorKey: 'principal_amount',
      header: 'Amounts',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-ink-900">{formatCurrency(row.original.principal_amount)}</p>
          <p className="text-xs text-ink-500 font-medium">Bal: {formatCurrency(row.original.balance_principal)}</p>
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.original.status === 'Active'
        return (
          <Badge tone={isActive ? 'success' : 'neutral'}>
            {row.original.status}
          </Badge>
        )
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          {row.original.status === 'Active' && (
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => onPayEmi(row.original)}
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <IndianRupee size={14} className="mr-1" /> Pay EMI
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onViewLedger(row.original.id)}
            className="text-brand-600 hover:text-brand-700 hover:bg-brand-50"
          >
            <BookOpen size={14} className="mr-1" /> Ledger
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this loan? This will reverse all ledger entries and cannot be undone.')) {
                deleteMutation.mutate(row.original.id)
              }
            }}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }
  ]

  return (
    <DataTable 
      data={data || []} 
      columns={columns} 
      isLoading={isLoading} 
      emptyTitle="No Loans Recorded"
      emptyDescription="Disburse or record loans to see them here."
    />
  )
}
