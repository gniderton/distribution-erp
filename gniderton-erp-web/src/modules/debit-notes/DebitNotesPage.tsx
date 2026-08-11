import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { useList, useConvertReturnSlip } from './hooks'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/shared/StatCard'
import type { ColumnDef } from '@tanstack/react-table'
import { DebitNoteItemsModal } from './components/DebitNoteItemsModal'
import { CreateDebitNoteModal } from './components/CreateDebitNoteModal'
import { generateDebitNotePdf } from './utils/pdf'
import { FileText, Plus, CheckCircle2, AlertTriangle, Search, Filter } from 'lucide-react'

export default function DebitNotesPage() {
  const { data, isLoading, isError } = useList()
  const { mutate: convertToDN } = useConvertReturnSlip()
  
  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'All' | 'Debit Note' | 'Return Slip'>('All')
  const [dateFilter, setDateFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  
  const [itemsModalOpen, setItemsModalOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<any>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const filteredData = useMemo(() => {
    if (!data) return []
    return data.filter((row: any) => {
      if (typeFilter !== 'All' && row.note_type !== typeFilter) return false
      
      if (statusFilter !== 'all') {
        const rowStatus = String(row.status).toLowerCase()
        if (statusFilter === 'approved' && rowStatus !== 'approved') return false
        if (statusFilter === 'draft' && rowStatus !== 'draft') return false
      }

      if (dateFilter !== 'all') {
        const itemDateStr = row.debit_note_date
        if (!itemDateStr) return false
        const itemDate = new Date(itemDateStr.split('T')[0]).getTime()
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        
        if (dateFilter === 'today' && itemDate < today) return false
        if (dateFilter === 'this_week') {
           const firstDayOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime()
           if (itemDate < firstDayOfWeek) return false
        }
        if (dateFilter === 'this_month') {
           const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
           if (itemDate < firstDayOfMonth) return false
        }
      }
      return true
    })
  }, [data, typeFilter, statusFilter, dateFilter])

  const stats = useMemo(() => {
    const list = filteredData
    const totalCount = list.length
    const totalValue = list.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
    
    const now = new Date()
    const currentMonthList = list.filter((r: any) => {
      const d = r.debit_note_date
      if (!d) return false
      const date = new Date(d)
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    })
    
    const thisMonthCount = currentMonthList.length
    const thisMonthValue = currentMonthList.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
    
    const dnCount = list.filter((r: any) => r.note_type === 'Debit Note').length
    const rsCount = list.filter((r: any) => r.note_type === 'Return Slip').length
    
    return { totalCount, totalValue, thisMonthCount, thisMonthValue, dnCount, rsCount }
  }, [filteredData])

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
        <Badge tone={row.original.note_type === 'Return Slip' ? 'warn' : 'neutral'}>
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
        <Badge tone={row.original.status === 'Approved' ? 'success' : 'neutral'}>
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
        const isConverted = row.original.converted_from_rs
        
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
                variant="secondary" 
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
        <Button onClick={() => setCreateModalOpen(true)} className="gap-2" variant="primary">
          <Plus className="w-4 h-4" /> New Record
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Total Records" value={String(stats.totalCount)} icon={FileText} />
        <StatCard label="Total Value" value={`₹${Number(stats.totalValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} icon={FileText} />
        <StatCard label="This Month Records" value={String(stats.thisMonthCount)} icon={FileText} tone="success" />
        <StatCard label="This Month Value" value={`₹${Number(stats.thisMonthValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} icon={CheckCircle2} tone="success" />
        <StatCard label="Debit Notes" value={String(stats.dnCount)} icon={CheckCircle2} tone="success" />
        <StatCard label="Return Slips" value={String(stats.rsCount)} icon={AlertTriangle} tone={stats.rsCount > 0 ? 'danger' : 'neutral'} />
      </div>
      
      <div className="glass-card p-4 rounded-xl border border-[#e6e9ee] bg-white shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between w-full mb-6">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3 text-ink-600" size={15} />
          <input 
            type="text" 
            placeholder="Search Notes or Vendors…" 
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="w-full bg-surface border border-[#e6e9ee] rounded-lg pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-brand-400 text-ink-900 placeholder:text-ink-600"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
            <Filter size={12} className="text-ink-600" />
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="bg-transparent text-xs text-ink-900 focus:outline-none pr-2 cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="bg-transparent text-xs text-ink-900 focus:outline-none pr-2 cursor-pointer"
            >
              <option value="All">Type: All</option>
              <option value="Debit Note">Debit Note</option>
              <option value="Return Slip">Return Slip</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-ink-900 focus:outline-none pr-2 cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="approved">Approved</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <DataTable
          data={filteredData}
          columns={columns}
          isLoading={isLoading}
          isError={isError}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          hideSearchBar={true}
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
