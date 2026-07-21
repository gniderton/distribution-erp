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

  const filteredData = useMemo(() => {
    return (data || []).filter(item => {
      const docType = (item.document_type || '').toLowerCase()
      const orderStatus = (item.status || '').toLowerCase()
      return docType === 'invoice' || orderStatus === 'invoiced'
    })
  }, [data])

  const stats = useMemo(() => {
    const list = filteredData
    const total = list.reduce((s, i) => s + (Number(i.display_amount) || 0), 0)
    const count = list.length
    const paidCount = list.filter(i => ['paid', 'fully paid'].includes((i.invoice_status || '').toLowerCase())).length
    const unpaidCount = list.filter(i => ['unpaid', 'partially paid'].includes((i.invoice_status || '').toLowerCase())).length
    return { count, total, paidCount, unpaidCount }
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Invoices" value={String(stats.count)} icon={FileText} />
        <StatCard label="Total Value" value={formatCurrency(stats.total)} icon={FileText} />
        <StatCard label="Paid Invoices" value={String(stats.paidCount)} icon={CheckCircle2} tone="success" />
        <StatCard label="Unpaid Invoices" value={String(stats.unpaidCount)} icon={AlertTriangle} tone={stats.unpaidCount > 0 ? 'danger' : 'neutral'} />
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
