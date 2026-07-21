import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import { useCustomers } from './hooks'
import { CustomerViewDrawer } from './components/CustomerViewDrawer'
import type { Customer } from './types'
import { formatCurrency } from '@/lib/utils'

const statusTone: Record<string, 'success' | 'warn' | 'neutral'> = {
  active: 'success',
  pending: 'warn',
  inactive: 'neutral',
}

export default function CustomerPage() {
  const { data, isLoading, isError } = useCustomers()
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      { accessorKey: 'customer_name', header: 'Customer' },
      { accessorKey: 'customer_phone', header: 'Phone', cell: (c) => c.getValue() || '—' },
      { accessorKey: 'channel_name', header: 'Channel', cell: (c) => c.getValue() || '—' },
      { accessorKey: 'route_name', header: 'Route', cell: (c) => c.getValue() || '—' },
      {
        accessorKey: 'verification_status',
        header: 'Status',
        cell: (c) => {
          const v = ((c.getValue() as string) || 'active').toLowerCase()
          return <Badge tone={statusTone[v] ?? 'neutral'}>{v}</Badge>
        },
      },
    ],
    []
  )

  return (
    <div>
      <PageHeader
        eyebrow="CUS · People"
        title="Customers"
        description="Retail and wholesale accounts, routes, channels, and outstanding balances."
        actions={
          <Button onClick={() => { setEditing(null); setDrawerOpen(true) }}>
            <Plus className="h-4 w-4" /> New customer
          </Button>
        }
      />

      <DataTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        emptyTitle="No customers yet"
        emptyDescription="Add your first customer to start creating sales orders."
        onRowClick={(row) => { setEditing(row); setDrawerOpen(true) }}
        globalFilter={search}
        onGlobalFilterChange={setSearch}
        searchPlaceholder="Search customers…"
      />

      <CustomerViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} customer={editing} />
    </div>
  )
}
