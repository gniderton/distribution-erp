import { Drawer } from '@/components/ui/Drawer'
import { DataTable } from '@/components/shared/DataTable'
import { useCreditNoteDetail } from '../hooks'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { Printer } from 'lucide-react'
import { generateCreditNotePDF } from '../utils/pdfGenerator'

interface CreditNoteItemsModalProps {
  isOpen: boolean
  onClose: () => void
  creditNote: any | null
}

export function CreditNoteItemsModal({ isOpen, onClose, creditNote }: CreditNoteItemsModalProps) {
  const { data: detailData, isLoading, isError } = useCreditNoteDetail(isOpen ? creditNote?.id : null)

  const items = detailData?.lines || []

  const columns: ColumnDef<any, any>[] = [
    { id: 'S.No', header: 'S.No', accessorFn: (_, i) => i + 1 },
    { accessorKey: 'product_name', header: 'Product' },
    { accessorKey: 'batch_number', header: 'Batch' },
    { accessorKey: 'qty', header: 'Qty' },
    { accessorKey: 'rate', header: 'Rate', cell: (c) => formatCurrency(c.getValue() as number) },
    { accessorKey: 'gross_amount', header: 'Gross', cell: (c) => formatCurrency(c.getValue() as number) },
    { accessorKey: 'taxable_amount', header: 'Taxable', cell: (c) => formatCurrency(c.getValue() as number) },
    { accessorKey: 'tax_percent', header: 'Tax %' },
    { accessorKey: 'tax_amount', header: 'Tax Amt', cell: (c) => formatCurrency(c.getValue() as number) },
    { accessorKey: 'amount', header: 'Net', cell: (c) => formatCurrency(c.getValue() as number) },
  ]

  if (!isOpen) return null

  return (
    <Drawer 
      open={isOpen} 
      onClose={onClose} 
      widthClass="max-w-7xl"
      title={
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold">{creditNote?.return_number || 'Credit Note'}</span>
          {creditNote?.status && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              creditNote.status.toLowerCase() === 'applied' ? 'bg-green-100 text-green-700' :
              creditNote.status.toLowerCase() === 'draft' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {creditNote.status.toUpperCase()}
            </span>
          )}
          
          <Button 
            variant="secondary" 
            size="sm" 
            className="ml-auto flex items-center gap-2"
            onClick={() => {
              if (detailData) {
                generateCreditNotePDF(detailData)
              }
            }}
            disabled={isLoading || isError || !detailData}
          >
            <Printer size={16} />
            Print PDF
          </Button>
        </div>
      }
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="space-y-8 mt-2">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row gap-6 justify-between items-start bg-surface p-5 rounded-xl border border-border-subtle">
          <div>
            <div className="text-sm font-medium text-ink-500 mb-1">Customer</div>
            <div className="text-lg font-semibold text-ink-900">{creditNote?.customer_name || '-'}</div>
          </div>
          
          <div className="flex flex-wrap gap-8">
            <div>
              <div className="text-sm font-medium text-ink-500 mb-1">Total Amount</div>
              <div className="text-xl font-bold text-ink-900">{formatCurrency(creditNote?.amount || creditNote?.grand_total || 0)}</div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-surface rounded-xl border border-border-subtle">
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Return Type</div>
            <div className="text-lg font-medium">{creditNote?.type || '-'}</div>
          </div>
          <div className="p-4 bg-surface rounded-xl border border-border-subtle">
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Status</div>
            <div className="text-lg font-medium capitalize">{creditNote?.status || '-'}</div>
          </div>
          <div className="p-4 bg-surface rounded-xl border border-border-subtle">
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Linked Bill</div>
            <div className="text-lg font-medium">{creditNote?.linked_invoice_number || creditNote?.original_invoice_number || '-'}</div>
          </div>
          <div className="p-4 bg-surface rounded-xl border border-border-subtle">
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Date</div>
            <div className="text-lg font-medium">{creditNote?.return_date ? new Date(creditNote.return_date).toLocaleDateString() : '-'}</div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3 text-ink-900">Line Items</h4>
          <div>
            <DataTable
              data={items}
              columns={columns}
              isLoading={isLoading}
              isError={isError}
              hideSearchBar
              emptyTitle="No Items"
              emptyDescription="This looks like a flat amount return with no line items."
            />
          </div>
        </div>
      </div>
    </Drawer>
  )
}
