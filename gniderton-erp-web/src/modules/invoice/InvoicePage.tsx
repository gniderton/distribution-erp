import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/shared/StatCard'
import { useInvoices } from './hooks'
import { InvoiceDetailDrawer } from './components/InvoiceDetailDrawer'
import type { Invoice } from './types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, CheckCircle2, AlertTriangle } from 'lucide-react'

const statusTone: Record<string, 'success' | 'warn' | 'danger' | 'neutral'> = {
  paid: 'success',
  pending: 'warn',
  overdue: 'danger',
  draft: 'neutral',
}

export default function InvoicePage() {
  const { data, isLoading, isError } = useInvoices()
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | number | null>(null)

  const stats = useMemo(() => {
    const list = data ?? []
    const total = list.reduce((s, i) => s + (i.amount || 0), 0)
    const paid = list.filter((i) => i.status === 'paid').length
    const overdue = list.filter((i) => i.status === 'overdue').length
    return { count: list.length, total, paid, overdue }
  }, [data])

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      { accessorKey: 'invoice_no', header: 'Invoice #', cell: (c) => c.getValue() || '—' },
      { accessorKey: 'customer_name', header: 'Customer', cell: (c) => c.getValue() || '—' },
      { accessorKey: 'date', header: 'Date', cell: (c) => formatDate(c.getValue() as string) },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: (c) => <span className="font-mono-figures">{formatCurrency(c.getValue() as number)}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (c) => {
          const v = ((c.getValue() as string) || 'pending').toLowerCase()
          return <Badge tone={statusTone[v] ?? 'neutral'}>{v}</Badge>
        },
      },
    ],
    []
  )

  return (
    <div>
      <PageHeader eyebrow="INV · Sell" title="Invoices" description="Unified view of all sales invoices." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total invoices" value={String(stats.count)} icon={FileText} />
        <StatCard label="Total value" value={formatCurrency(stats.total)} icon={FileText} />
        <StatCard label="Paid" value={String(stats.paid)} icon={CheckCircle2} tone="success" />
        <StatCard label="Overdue" value={String(stats.overdue)} icon={AlertTriangle} tone={stats.overdue > 0 ? 'danger' : 'neutral'} />
      </div>

      <DataTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        emptyTitle="No invoices yet"
        emptyDescription="Invoices generated from sales orders will appear here."
        onRowClick={(row) => setOpenId(row.id)}
        globalFilter={search}
        onGlobalFilterChange={setSearch}
        searchPlaceholder="Search invoices…"
      />

      <InvoiceDetailDrawer id={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
