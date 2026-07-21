import { useCustomerPendingBills } from '../hooks'
import { DataTable } from '@/components/shared/DataTable'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

export function CustomerPendingBillsTab({ customerId }: { customerId: string | number }) {
  const { data: bills, isLoading } = useCustomerPendingBills(customerId)

  if (isLoading) {
    return <div className="p-8 text-center text-ink-500 animate-pulse">Loading pending bills...</div>
  }

  const billsList = Array.isArray(bills) ? bills : bills?.bills || []

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-ink-900">Pending Bills</h3>
      </div>
      
      <DataTable 
        data={billsList}
        emptyTitle="All caught up!"
        emptyDescription="This customer has no unpaid invoices."
        columns={[
          { accessorKey: 'invoice_number', header: 'Invoice #' },
          { accessorKey: 'invoice_date', header: 'Date', cell: c => formatDate(c.getValue() as string) },
          { accessorKey: 'due_date', header: 'Due Date', cell: c => {
            const v = c.getValue() as string
            if (!v) return '—'
            const isOverdue = new Date(v) < new Date()
            return <span className={isOverdue ? 'text-danger-600 font-medium' : ''}>{formatDate(v)}</span>
          }},
          { accessorKey: 'grand_total', header: 'Invoice Total', cell: c => <span className="font-mono-figures">{formatCurrency(c.getValue() as number)}</span> },
          { accessorKey: 'amount_paid', header: 'Amount Paid', cell: c => <span className="font-mono-figures text-success-600">{formatCurrency(c.getValue() as number)}</span> },
          { accessorKey: 'balance', header: 'Balance Due', cell: c => <span className="font-mono-figures font-bold text-danger-600">{formatCurrency(c.getValue() as number)}</span> },
          { accessorKey: 'status', header: 'Status', cell: c => {
            const v = ((c.getValue() as string) || 'unpaid').toLowerCase()
            return <Badge tone={v === 'overdue' ? 'danger' : 'warn'}>{v}</Badge>
          }},
        ]}
      />
    </div>
  )
}
