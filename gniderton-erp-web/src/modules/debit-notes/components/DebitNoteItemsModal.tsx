import { Dialog } from '@/components/ui/Dialog'
import { DataTable } from '@/components/shared/DataTable'
import { useDebitNoteItems } from '../hooks'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/Button'

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
    { accessorKey: 'EAN Code', header: 'Code' },
    { accessorKey: 'Batch No', header: 'Batch' },
    { accessorKey: 'Qty', header: 'Qty' },
    { accessorKey: 'Price', header: 'Price' },
    { accessorKey: 'GST %', header: 'GST %' },
    { accessorKey: 'Taxable $', header: 'Taxable' },
    { accessorKey: 'Net $', header: 'Net Amt' },
  ]

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      title={`Items for ${debitNote?.debit_note_number || 'Debit Note'}`}
      widthClass="max-w-4xl"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="h-96">
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
    </Dialog>
  )
}
