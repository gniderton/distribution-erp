import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { useList, useDeleteCreditNote } from './hooks'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/shared/StatCard'
import type { ColumnDef } from '@tanstack/react-table'
import { CreditNoteItemsModal } from './components/CreditNoteItemsModal'
import { CreateCreditNoteModal } from './components/CreateCreditNoteModal'
import { FileText, Plus, CheckCircle2, AlertTriangle, Search, Filter, Trash, Printer, RotateCcw } from 'lucide-react'
import { generateCreditNotePDF } from './utils/pdfGenerator'
import { credit_noteApi } from './api'
import toast from 'react-hot-toast'

export default function CreditNotePage() {
  const { data, isLoading, isError } = useList()
  const { mutateAsync: deleteCreditNote } = useDeleteCreditNote()
  
  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'All' | 'Sales Return' | 'Rate Adjustment'>('All')
  const [dateFilter, setDateFilter] = useState('all')
  const [routeFilter, setRouteFilter] = useState('All')
  const [dseFilter, setDseFilter] = useState('All')
  
  const [itemsModalOpen, setItemsModalOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<any>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const filteredData = useMemo(() => {
    if (!data) return []
    return data.filter((row: any) => {
      if (typeFilter !== 'All' && row.type !== typeFilter) return false
      if (routeFilter !== 'All' && row.route_name !== routeFilter) return false
      if (dseFilter !== 'All' && row.dse_name !== dseFilter) return false
      
      if (dateFilter !== 'all') {
        const itemDateStr = row.return_date
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
  }, [data, typeFilter, dateFilter, routeFilter, dseFilter])

  const routeOptions = useMemo(() => {
    if (!data) return []
    const routes = new Set<string>(data.map((d: any) => d.route_name).filter(Boolean))
    return Array.from(routes).sort()
  }, [data])

  const dseOptions = useMemo(() => {
    if (!data) return []
    const dses = new Set<string>(data.map((d: any) => d.dse_name).filter(Boolean))
    return Array.from(dses).sort()
  }, [data])

  const stats = useMemo(() => {
    const list = filteredData
    const totalCount = list.length
    const totalValue = list.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
    
    const now = new Date()
    const currentMonthList = list.filter((r: any) => {
      const d = r.return_date
      if (!d) return false
      const date = new Date(d)
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    })
    
    const thisMonthCount = currentMonthList.length
    const thisMonthValue = currentMonthList.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
    
    const itemizedCount = list.filter((r: any) => r.type === 'Sales Return').length
    const flatCount = list.filter((r: any) => r.type === 'Rate Adjustment').length
    
    return { totalCount, totalValue, thisMonthCount, thisMonthValue, itemizedCount, flatCount }
  }, [filteredData])

  const handleViewItems = (row: any) => {
    setSelectedNote(row)
    setItemsModalOpen(true)
  }

  const handleDelete = async (row: any) => {
    if (window.confirm(`Are you sure you want to cancel Credit Note ${row.return_number}? This will reverse the stock and accounting entries.`)) {
      try {
        await deleteCreditNote(row.id)
        toast.success(`Credit Note ${row.return_number} cancelled successfully.`)
      } catch (err: any) {
        toast.error('Failed to cancel Credit Note: ' + (err.response?.data?.error || err.message))
      }
    }
  }

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'return_number',
      header: 'Return Number',
    },
    {
      accessorKey: 'return_date',
      header: 'Date',
      cell: ({ row }) => new Date(row.original.return_date).toLocaleDateString(),
    },
    {
      accessorKey: 'customer_name',
      header: 'Customer',
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge tone={row.original.type === 'Sales Return' ? 'brand' : 'neutral'}>
          {row.original.type === 'Sales Return' ? 'Itemized' : 'Flat Amount'}
        </Badge>
      ),
    },
    {
      accessorKey: 'linked_invoice_number',
      header: 'Linked Invoice',
      cell: ({ row }) => row.original.linked_invoice_number || '-',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge tone={row.original.status === 'Applied' ? 'success' : row.original.status === 'Cancelled' ? 'danger' : 'neutral'}>
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
        return (
          <div className="flex gap-2 items-center justify-end">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleViewItems(row.original) }}>
              View
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={async (e) => { 
                e.stopPropagation();
                try {
                  const detailData = await credit_noteApi.getSalesReturnDetail(row.original.id);
                  generateCreditNotePDF(detailData);
                } catch (err) {
                  toast.error("Failed to load full details for PDF");
                }
              }}
              title="Print PDF"
              className="text-ink-600 hover:text-brand-500 hover:bg-brand-50"
            >
              <Printer className="w-4 h-4" />
            </Button>
            {row.original.status !== 'Cancelled' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); handleDelete(row.original) }}
                title="Cancel Credit Note"
                className="text-danger hover:bg-danger/10"
              >
                <Trash className="w-4 h-4" />
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
          eyebrow="CRN · Sell"
          title="Credit Notes & Returns"
          description="Manage customer returns and financial credit adjustments."
        />
        <Button onClick={() => setCreateModalOpen(true)} className="gap-2" variant="primary">
          <Plus className="w-4 h-4" /> New Credit Note
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Total Records" value={String(stats.totalCount)} icon={FileText} />
        <StatCard label="Total Value" value={`₹${Number(stats.totalValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} icon={FileText} />
        <StatCard label="This Month Records" value={String(stats.thisMonthCount)} icon={FileText} tone="success" />
        <StatCard label="This Month Value" value={`₹${Number(stats.thisMonthValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} icon={CheckCircle2} tone="success" />
        <StatCard label="Itemized Returns" value={String(stats.itemizedCount)} icon={CheckCircle2} tone="success" />
        <StatCard label="Flat Amount" value={String(stats.flatCount)} icon={AlertTriangle} tone={stats.flatCount > 0 ? 'success' : 'neutral'} />
      </div>
      
      <div className="glass-card p-4 rounded-xl border border-[#e6e9ee] bg-white shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between w-full mb-6">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3 text-ink-600" size={15} />
          <input 
            type="text" 
            placeholder="Search Returns or Customers…" 
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
              <option value="Sales Return">Itemized Return</option>
              <option value="Rate Adjustment">Flat Amount</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
            <select
              value={routeFilter}
              onChange={e => setRouteFilter(e.target.value)}
              className="bg-transparent text-xs text-ink-900 focus:outline-none pr-2 cursor-pointer max-w-[120px]"
            >
              <option value="All">Route: All</option>
              {routeOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
            <select
              value={dseFilter}
              onChange={e => setDseFilter(e.target.value)}
              className="bg-transparent text-xs text-ink-900 focus:outline-none pr-2 cursor-pointer max-w-[120px]"
            >
              <option value="All">DSE: All</option>
              {dseOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {(globalFilter !== '' || typeFilter !== 'All' || dateFilter !== 'all' || routeFilter !== 'All' || dseFilter !== 'All') && (
            <Button 
              variant="secondary" 
              size="sm" 
              className="gap-1.5 text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 border-transparent rounded-full px-4"
              onClick={() => {
                setGlobalFilter('')
                setTypeFilter('All')
                setDateFilter('all')
                setRouteFilter('All')
                setDseFilter('All')
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </Button>
          )}
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
          emptyDescription="Create a new Credit Note to see it here."
        />
      </div>

      <CreditNoteItemsModal 
        isOpen={itemsModalOpen} 
        onClose={() => setItemsModalOpen(false)} 
        creditNote={selectedNote} 
      />

      <CreateCreditNoteModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
      />
    </div>
  )
}
