import { useCustomerLedger } from '../hooks'
import { DataTable } from '@/components/shared/DataTable'
import { formatCurrency, formatDate } from '@/lib/utils'

export function CustomerLedgerTab({ customerId }: { customerId: string | number }) {
  const { data: ledger, isLoading } = useCustomerLedger(customerId)

  if (isLoading) {
    return <div className="p-8 text-center text-ink-500 animate-pulse">Loading ledger...</div>
  }

  // The ledger API returns { metrics: { ... }, movements: [...] }
  // We need to check what /api/customers/:id/ledger returns exactly.
  // Assuming it returns an array of movements directly based on `useCustomerLedger` definition
  const movements = Array.isArray(ledger) ? ledger : ledger?.movements || []

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-ink-900">Account Ledger</h3>
        {ledger?.metrics && (
          <div className="text-sm">
            <span className="text-ink-500">Closing Balance: </span>
            <span className="font-mono-figures font-bold">{formatCurrency(ledger.metrics.closing_balance)}</span>
          </div>
        )}
      </div>
      
      <DataTable 
        data={movements}
        columns={[
          { accessorKey: 'date', header: 'Date', cell: c => formatDate(c.getValue() as string) },
          { accessorKey: 'type', header: 'Type' },
          { accessorKey: 'reference_number', header: 'Reference' },
          { accessorKey: 'debit_amount', header: 'Debit (Dr)', cell: c => {
            const val = c.getValue() as number
            return val > 0 ? <span className="font-mono-figures text-danger-600">{formatCurrency(val)}</span> : '—'
          }},
          { accessorKey: 'credit_amount', header: 'Credit (Cr)', cell: c => {
            const val = c.getValue() as number
            return val > 0 ? <span className="font-mono-figures text-success-600">{formatCurrency(val)}</span> : '—'
          }},
          { accessorKey: 'running_balance', header: 'Balance', cell: c => {
            const val = c.getValue() as number
            return <span className="font-mono-figures font-medium">{formatCurrency(val)}</span>
          }},
        ]}
      />
    </div>
  )
}
