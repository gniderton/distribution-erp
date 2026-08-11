import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { useList, useConvertReturnSlip } from './hooks'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { ColumnDef } from '@tanstack/react-table'
import { DebitNoteItemsModal } from './components/DebitNoteItemsModal'
import { CreateDebitNoteModal } from './components/CreateDebitNoteModal'
import { generateDebitNotePdf } from './utils/pdf'
import { FileText, Plus } from 'lucide-react'

export default function DebitNotesPage() {
  const { data, isLoading, isError } = useList()
  const { mutate: convertToDN } = useConvertReturnSlip()
  
  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'All' | 'Debit Note' | 'Return Slip'>('All')
  
  const [itemsModalOpen, setItemsModalOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<any>(null)

  const [createModalOpen, setCreateModalOpen] = useState(false)

  const filteredData = useMemo(() => {
    if (!data) return []
    if (typeFilter === 'All') return data
    return data.filter((row: any) => row.note_type === typeFilter)
  }, [data, typeFilter])

  const handleViewItems = (row: any) => {
    setSelectedNote(row)
    setItemsModalOpen(true)
  }

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'debit_note_number',
      header: 'Note Number',
    },
    {
      accessorKey: 'debit_note_date',
      header: 'Date',
      cell: ({ row }) => new Date(row.original.debit_note_date).toLocaleDateString(),
    },
    {
      accessorKey: 'vendor_name',
      header: 'Vendor',
    },
    {
      accessorKey: 'note_type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant={row.original.note_type === 'Return Slip' ? 'warning' : 'default'}>
          {row.original.note_type}
        </Badge>
      ),
    },
    {
      accessorKey: 'linked_invoice_number',
      header: 'Linked Bill',
      cell: ({ row }) => row.original.linked_invoice_number || '-',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'Approved' ? 'success' : 'default'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => `₹${Number(row.original.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const isReturnSlip = row.original.note_type === 'Return Slip'
        const isConverted = row.original.converted_from_rs // Custom field if it exists to track if it was converted
        
        return (
          <div className="flex gap-2 items-center justify-end">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleViewItems(row.original) }}>
              Items
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { 
                e.stopPropagation(); 
                generateDebitNotePdf(row.original) 
              }}
              title="Download PDF"
            >
              <FileText className="w-4 h-4" />
            </Button>
            {isReturnSlip && !isConverted && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if(window.confirm('Convert this Return Slip to a Financial Debit Note?')) {
                    convertToDN(row.original.id) 
                  }
                }}
              >
                Convert to DN
              </Button>
            )}
          </div>
        )
      }
    }
  ]

  return (
    <div className="flex flex-col h-full h-[calc(100vh-6rem)]">
      <div className="flex justify-between items-center mb-4">
        <PageHeader
          eyebrow="DBN · Buy"
          title="Debit Notes & Returns"
          description="Manage financial adjustments and item returns to vendors."
        />
        <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Record
        </Button>
      </div>
      
      <div className="flex gap-2 mb-4 items-center text-sm">
        <span className="text-ink-600/60 font-medium">Filter Type:</span>
        {(['All', 'Debit Note', 'Return Slip'] as const).map(type => (
          <Button 
            key={type}
            variant={typeFilter === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter(type)}
            className="rounded-full"
          >
            {type}
          </Button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <DataTable
          data={filteredData}
          columns={columns}
          isLoading={isLoading}
          isError={isError}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          searchPlaceholder="Search Notes or Vendors..."
          emptyTitle="No records found"
          emptyDescription="Create a new Debit Note or Return Slip to see it here."
        />
      </div>

      <DebitNoteItemsModal 
        isOpen={itemsModalOpen} 
        onClose={() => setItemsModalOpen(false)} 
        debitNote={selectedNote} 
      />

      <CreateDebitNoteModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
      />
    </div>
  )
}
