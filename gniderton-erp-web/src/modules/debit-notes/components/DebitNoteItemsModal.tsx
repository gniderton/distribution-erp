import { Drawer } from '@/components/ui/Drawer'
import { DataTable } from '@/components/shared/DataTable'
import { useDebitNoteItems } from '../hooks'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'

interface DebitNoteItemsModalProps {
  isOpen: boolean
  onClose: () => void
  debitNote: any | null
}

export function DebitNoteItemsModal({ isOpen, onClose, debitNote }: DebitNoteItemsModalProps) {
  const { data: items, isLoading, isError } = useDebitNoteItems(isOpen ? debitNote?.id : null)

  const columns: ColumnDef<any, any>[] = [
    { accessorKey: 'S.No', header: 'S.No' },
    { accessorKey: 'Item Name', header: 'Item' },
    { accessorKey: 'Batch No', header: 'Batch' },
    { accessorKey: 'Qty', header: 'Qty' },
    { accessorKey: 'MRP', header: 'MRP', cell: (c) => formatCurrency(c.getValue() as number) },
    { accessorKey: 'Price', header: 'Unit Rate', cell: (c) => formatCurrency(c.getValue() as number) },
    { accessorKey: 'Gross $', header: 'Gross', cell: (c) => formatCurrency(c.getValue() as number) },
    { accessorKey: 'Sch', header: 'Scheme', cell: (c) => c.getValue() || '0' },
    { accessorKey: 'Disc %', header: 'Disc %', cell: (c) => c.getValue() || '0' },
    { accessorKey: 'Disc. $', header: 'Disc Amt', cell: (c) => formatCurrency(c.getValue() as number) },
    { accessorKey: 'Taxable $', header: 'Taxable', cell: (c) => formatCurrency(c.getValue() as number) },
    { accessorKey: 'GST %', header: 'Tax %' },
    { accessorKey: 'GST $', header: 'Tax Amt', cell: (c) => formatCurrency(c.getValue() as number) },
    { accessorKey: 'Net $', header: 'Net', cell: (c) => formatCurrency(c.getValue() as number) },
  ]

  if (!isOpen) return null

  return (
    <Drawer 
      open={isOpen} 
      onClose={onClose} 
      widthClass="max-w-4xl"
      title={
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold">{debitNote?.debit_note_number || 'Debit Note'}</span>
          {debitNote?.status && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              debitNote.status.toLowerCase() === 'approved' ? 'bg-green-100 text-green-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {debitNote.status.toUpperCase()}
            </span>
          )}
        </div>
      }
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="flex flex-col h-full space-y-6 mt-2">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row gap-6 justify-between items-start bg-surface p-5 rounded-xl border border-border-subtle">
          <div>
            <div className="text-sm font-medium text-ink-500 mb-1">Vendor</div>
            <div className="text-lg font-semibold text-ink-900">{debitNote?.vendor_name || '-'}</div>
          </div>
          
          <div className="flex flex-wrap gap-8">
            <div>
              <div className="text-sm font-medium text-ink-500 mb-1">Total Amount</div>
              <div className="text-xl font-bold text-ink-900">{formatCurrency(debitNote?.amount || 0)}</div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-surface rounded-xl border border-border-subtle">
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Note Type</div>
            <div className="text-lg font-medium">{debitNote?.note_type || '-'}</div>
          </div>
          <div className="p-4 bg-surface rounded-xl border border-border-subtle">
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Status</div>
            <div className="text-lg font-medium capitalize">{debitNote?.status || '-'}</div>
          </div>
          <div className="p-4 bg-surface rounded-xl border border-border-subtle">
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Linked Bill</div>
            <div className="text-lg font-medium">{debitNote?.linked_invoice_number || '-'}</div>
          </div>
          <div className="p-4 bg-surface rounded-xl border border-border-subtle">
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Date</div>
            <div className="text-lg font-medium">{debitNote?.debit_note_date ? new Date(debitNote.debit_note_date).toLocaleDateString() : '-'}</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-[300px]">
          <h4 className="font-semibold text-sm mb-3 text-ink-900">Line Items</h4>
          <div className="flex-1">
            <DataTable
              data={items}
              columns={columns}
              isLoading={isLoading}
              isError={isError}
              hideSearchBar
              emptyTitle="No Items"
              emptyDescription="This looks like a financial-only debit note with no line items."
            />
          </div>
        </div>
      </div>
    </Drawer>
  )
}
