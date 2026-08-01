import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/Button'
import { FileText, CheckCircle2, AlertTriangle, Eye, Download } from 'lucide-react'
import { useInvoices } from './hooks'
import { InvoiceViewModal } from './components/InvoiceViewModal'
import type { Invoice } from './types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { generateInvoicePDF } from './utils/pdfGenerator'
import { api } from '@/lib/axios'
import toast from 'react-hot-toast'

const statusTone: Record<string, 'success' | 'warn' | 'danger' | 'neutral'> = {
  paid: 'success',
  pending: 'warn',
  overdue: 'danger',
  draft: 'neutral',
  'fully paid': 'success',
  'partially paid': 'warn',
  'unpaid': 'danger',
}

export default function InvoicePage() {
  const { data, isLoading, isError } = useInvoices()
  const [search, setSearch] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const [dateFilter, setDateFilter] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all')
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('all')
  const [dseFilter, setDseFilter] = useState('all')

  const dseOptions = useMemo(() => Array.from(new Set((data || []).map(i => i.dse_name).filter(Boolean))), [data])

  const filteredData = useMemo(() => {
    return (data || []).filter(item => {
      const docType = (item.document_type || '').toLowerCase()
      const orderStatus = (item.status || '').toLowerCase()
      const isInvoice = docType === 'invoice' || orderStatus === 'invoiced'
      
      if (!isInvoice) return false

      if (dseFilter !== 'all' && item.dse_name !== dseFilter) return false

      if (paymentStatusFilter !== 'all') {
        const pStatus = (item.invoice_status || '').toLowerCase()
        if (paymentStatusFilter === 'paid' && !['paid', 'fully paid'].includes(pStatus)) return false
        if (paymentStatusFilter === 'unpaid' && pStatus !== 'unpaid') return false
        if (paymentStatusFilter === 'partial' && pStatus !== 'partially paid') return false
      }

      if (deliveryStatusFilter !== 'all') {
        const dStatus = (item.delivery_status || '').toLowerCase()
        if (dStatus !== deliveryStatusFilter) return false
      }

      if (dateFilter !== 'all') {
        const itemDateStr = item.invoice_date || item.order_date
        if (!itemDateStr) return false
        
        // Parse date considering only year, month, day to avoid timezone shifts
        const itemDate = new Date(itemDateStr.split('T')[0]).getTime()
        
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        
        if (dateFilter === 'today') {
           if (itemDate < today) return false
        } else if (dateFilter === 'this_week') {
           const firstDayOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime()
           if (itemDate < firstDayOfWeek) return false
        } else if (dateFilter === 'this_month') {
           const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
           if (itemDate < firstDayOfMonth) return false
        } else if (dateFilter === 'custom') {
           if (customStartDate && itemDate < new Date(customStartDate).getTime()) return false
           if (customEndDate && itemDate > new Date(customEndDate).getTime()) return false
        }
      }

      return true
    })
  }, [data, dseFilter, paymentStatusFilter, deliveryStatusFilter, dateFilter, customStartDate, customEndDate])

  const stats = useMemo(() => {
    const list = filteredData
    
    // Taxable logic: fallback to display_amount if invoice_taxable_amount is missing
    const getTaxable = (i: Invoice) => Number(i.invoice_taxable_amount) || Number(i.display_amount) || 0
    
    const totalTaxable = list.reduce((s, i) => s + getTaxable(i), 0)
    const count = list.length
    
    // Current month calculations
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    const currentMonthList = list.filter(i => {
      const d = i.invoice_date || i.order_date
      if (!d) return false
      const date = new Date(d)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
    
    const currentMonthCount = currentMonthList.length
    const currentMonthTaxable = currentMonthList.reduce((s, i) => s + getTaxable(i), 0)

    const paidCount = list.filter(i => ['paid', 'fully paid'].includes((i.invoice_status || '').toLowerCase())).length
    const unpaidCount = list.filter(i => ['unpaid', 'partially paid'].includes((i.invoice_status || '').toLowerCase())).length
    
    return { count, totalTaxable, currentMonthCount, currentMonthTaxable, paidCount, unpaidCount }
  }, [filteredData])

  const handleDownloadPDF = async (invoiceData: Invoice) => {
    try {
      // 1. Fetch full details for the triggered row
      const res = await api.get(`/api/sales/unified/${invoiceData.id}`)
      const fullInvoice = res.data

      // 2. Generate and store the PDF
      await generateInvoicePDF(fullInvoice)
    } catch (err: any) {
      toast.error('PDF Generation Error: ' + err.message)
    }
  }

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      { accessorKey: 'display_number', header: 'Invoice #', cell: (c) => c.getValue() || '—' },
      { accessorKey: 'customer_name', header: 'Customer', cell: (c) => c.getValue() || '—' },
      { accessorKey: 'dse_name', header: 'DSE', cell: (c) => c.getValue() || '—' },
      { accessorKey: 'order_date', header: 'Order Date', cell: (c) => c.getValue() ? formatDate(c.getValue() as string) : '—' },
      { accessorKey: 'invoice_date', header: 'Invoice Date', cell: (c) => c.getValue() ? formatDate(c.getValue() as string) : '—' },
      {
        accessorKey: 'display_amount',
        header: 'Amount',
        cell: (c) => <span className="font-mono-figures">{formatCurrency(c.getValue() as number)}</span>,
      },
      {
        accessorKey: 'balance_amount',
        header: 'Balance',
        cell: (c) => <span className="font-mono-figures">{formatCurrency(c.getValue() as number)}</span>,
      },
      {
        accessorKey: 'invoice_status',
        header: 'Status',
        cell: (c) => {
          const v = ((c.getValue() as string) || 'pending').toLowerCase()
          return <Badge tone={statusTone[v] ?? 'neutral'}>{v.toUpperCase()}</Badge>
        },
      },
      {
        accessorKey: 'delivery_status',
        header: 'Delivery',
        cell: (c) => <Badge tone="neutral">{String(c.getValue() || '—').toUpperCase()}</Badge>,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(row.original)} title="View Invoice">
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadPDF(row.original); }} title="Download PDF">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  return (
    <div>
      <PageHeader eyebrow="INV · Sell" title="Invoices" description="Unified view of all sales invoices." />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Total Invoices" value={String(stats.count)} icon={FileText} />
        <StatCard label="Total Value (Taxable)" value={formatCurrency(stats.totalTaxable)} icon={FileText} />
        <StatCard label="This Month Invoices" value={String(stats.currentMonthCount)} icon={FileText} tone="success" />
        <StatCard label="This Month Value (Taxable)" value={formatCurrency(stats.currentMonthTaxable)} icon={CheckCircle2} tone="success" />
        <StatCard label="Paid Invoices" value={String(stats.paidCount)} icon={CheckCircle2} tone="success" />
        <StatCard label="Unpaid Invoices" value={String(stats.unpaidCount)} icon={AlertTriangle} tone={stats.unpaidCount > 0 ? 'danger' : 'neutral'} />
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-border-subtle flex flex-wrap items-end gap-4 mb-6">
          <div className="space-y-1">
              <label className="text-xs font-medium text-ink-600">Date Range</label>
              <select 
                  value={dateFilter} 
                  onChange={e => setDateFilter(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-border-subtle text-sm bg-surface"
              >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="custom">Custom Range</option>
              </select>
          </div>

          {dateFilter === 'custom' && (
              <div className="flex gap-2 items-end">
                  <div className="space-y-1">
                      <label className="text-xs font-medium text-ink-600">Start Date</label>
                      <input 
                          type="date" 
                          value={customStartDate} 
                          onChange={e => setCustomStartDate(e.target.value)}
                          className="h-9 px-3 rounded-md border border-border-subtle text-sm bg-surface"
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs font-medium text-ink-600">End Date</label>
                      <input 
                          type="date" 
                          value={customEndDate} 
                          onChange={e => setCustomEndDate(e.target.value)}
                          className="h-9 px-3 rounded-md border border-border-subtle text-sm bg-surface"
                      />
                  </div>
              </div>
          )}

          <div className="space-y-1">
              <label className="text-xs font-medium text-ink-600">Payment Status</label>
              <select 
                  value={paymentStatusFilter} 
                  onChange={e => setPaymentStatusFilter(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-border-subtle text-sm bg-surface"
              >
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
              </select>
          </div>

          <div className="space-y-1">
              <label className="text-xs font-medium text-ink-600">Delivery Status</label>
              <select 
                  value={deliveryStatusFilter} 
                  onChange={e => setDeliveryStatusFilter(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-border-subtle text-sm bg-surface"
              >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="in transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
              </select>
          </div>

          <div className="space-y-1">
              <label className="text-xs font-medium text-ink-600">DSE</label>
              <select 
                  value={dseFilter} 
                  onChange={e => setDseFilter(e.target.value)}
                  className="w-full max-w-[200px] h-9 px-3 rounded-md border border-border-subtle text-sm bg-surface"
              >
                  <option value="all">All DSEs</option>
                  {dseOptions.map(dse => (
                      <option key={dse as string} value={dse as string}>{dse as string}</option>
                  ))}
              </select>
          </div>
      </div>

      <DataTable
        data={filteredData}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        emptyTitle="No invoices yet"
        emptyDescription="Invoices generated from sales orders will appear here."
        globalFilter={search}
        onGlobalFilterChange={setSearch}
        searchPlaceholder="Search invoices…"
      />

      {selectedInvoice && (
        <InvoiceViewModal 
          invoice={selectedInvoice} 
          onClose={() => setSelectedInvoice(null)} 
        />
      )}
    </div>
  )
}
