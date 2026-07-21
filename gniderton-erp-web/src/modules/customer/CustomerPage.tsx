import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Plus, Users, CheckCircle2, Clock, Search } from 'lucide-react'
import { useCustomers } from './hooks'
import { CustomerViewDrawer } from './components/CustomerViewDrawer'
import { CustomerVerifyModal } from './components/CustomerVerifyModal'
import { CustomerBulkUpdateModal } from './components/CustomerBulkUpdateModal'
import type { Customer } from './types'

const statusTone: Record<string, 'success' | 'warn' | 'neutral'> = {
  active: 'success',
  pending: 'warn',
  inactive: 'neutral',
}

function StatCard({ title, value, icon: Icon, colorClass, onClick }: { title: string, value: string | number, icon: any, colorClass: string, onClick?: () => void }) {
  return (
    <div 
      className={`relative rounded-lg border border-white/20 bg-white/60 backdrop-blur-md shadow-sm overflow-hidden p-3 transition-all duration-300 hover:shadow-md flex items-center gap-3 ${colorClass} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="p-2 rounded-md bg-white/50 backdrop-blur-sm shadow-sm flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-xs font-medium text-ink-600 mb-0.5">{title}</div>
        <div className="text-lg font-bold font-mono-figures text-ink-900">{value}</div>
      </div>
      <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/30 rounded-full blur-lg"></div>
    </div>
  )
}

export default function CustomerPage() {
  const { data, isLoading, isError } = useCustomers()
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<Customer | null>(null)

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="rounded border-ink-300 w-4 h-4 cursor-pointer"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className="rounded border-ink-300 w-4 h-4 cursor-pointer"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
            />
          </div>
        ),
      },
      { accessorKey: 'customer_name', header: 'Customer', cell: (c) => <span className="font-semibold text-ink-900">{c.getValue() as string}</span> },
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

  const customers = Array.isArray(data) ? data : []
  const total = customers.length
  const verified = customers.filter(c => {
    const v = c.verification_status?.toLowerCase()
    return v === 'active' || v === 'verified'
  }).length
  const pending = customers.filter(c => {
    const v = c.verification_status?.toLowerCase()
    return v === 'pending'
  }).length

  return (
    <div className="flex h-full flex-col bg-ink-50/30">
      <div className="px-6 py-4">
        <PageHeader
          eyebrow="CUS · People"
          title="Customers"
          description="Retail and wholesale accounts, routes, channels, and outstanding balances."
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setVerifyModalOpen(true)} className="shadow-sm">
                Verify Pending
              </Button>
              {Object.keys(rowSelection).length > 0 && (
                <Button variant="secondary" onClick={() => setBulkUpdateOpen(true)} className="shadow-sm">
                  Bulk Update ({Object.keys(rowSelection).length})
                </Button>
              )}
              <Button onClick={() => { setEditing(null); setDrawerOpen(true) }} className="shadow-md hover:shadow-lg transition-shadow">
                <Plus className="h-4 w-4 mr-2" /> New customer
              </Button>
            </div>
          }
        />
        
        {/* Beautiful Glassmorphic KPIs - Compact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <StatCard 
            title="Total Customers" 
            value={total} 
            icon={Users} 
            colorClass="bg-gradient-to-br from-blue-50 to-indigo-100/50 border-blue-200" 
          />
          <StatCard 
            title="Active / Verified" 
            value={verified} 
            icon={CheckCircle2} 
            colorClass="bg-gradient-to-br from-emerald-50 to-teal-100/50 border-emerald-200 text-emerald-600" 
          />
          <StatCard 
            title="Pending Verification" 
            value={pending} 
            icon={Clock} 
            colorClass="bg-gradient-to-br from-amber-50 to-orange-100/50 border-amber-200 text-amber-600 hover:border-amber-400 hover:ring-2 hover:ring-amber-200" 
            onClick={() => setVerifyModalOpen(true)}
          />
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col space-y-4">
        <div className="glass-card p-4 rounded-xl border border-border-subtle bg-white shadow-sm flex items-center w-full">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-2.5 text-ink-600" size={15} />
            <input 
              type="text" 
              placeholder="Search customers by name, phone, or route..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface border border-border-subtle rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-brand-400 text-ink-900 placeholder:text-ink-600"
            />
          </div>
        </div>
        
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
          hideSearchBar={true}
          searchPlaceholder="Search customers by name, phone, or route..."
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
        />
      </div>

      <CustomerViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} customer={editing} />
      <CustomerVerifyModal open={verifyModalOpen} onClose={() => setVerifyModalOpen(false)} />
      <CustomerBulkUpdateModal 
        open={bulkUpdateOpen} 
        onClose={() => setBulkUpdateOpen(false)} 
        selectedIds={Object.keys(rowSelection).map(idx => data?.[parseInt(idx)]?.id).filter(Boolean) as (string | number)[]}
        onClearSelection={() => setRowSelection({})}
      />
    </div>
  )
}
