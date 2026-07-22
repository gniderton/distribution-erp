import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Plus, Users, CheckCircle2, Clock, Search, Bell } from 'lucide-react'
import { useCustomers } from './hooks'
import { customerApi } from './api'
import { CustomerViewDrawer } from './components/CustomerViewDrawer'
import { CustomerVerifyModal } from './components/CustomerVerifyModal'
import { CustomerBulkUpdateModal } from './components/CustomerBulkUpdateModal'
import type { Customer } from './types'

const statusTone: Record<string, 'success' | 'warn' | 'neutral'> = {
  active: 'success',
  pending: 'warn',
  inactive: 'neutral',
}

function StatCard({ title, value, icon: Icon, wrapperClass = 'bg-white border-border text-ink-900', iconClass = 'bg-surface border-border-subtle text-ink-600', onClick }: { title: string, value: string | number, icon: any, wrapperClass?: string, iconClass?: string, onClick?: () => void }) {
  return (
    <div 
      className={`relative rounded-lg border shadow-sm overflow-hidden p-3 transition-all duration-300 hover:shadow-md flex items-center gap-3 ${wrapperClass} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className={`p-2 rounded-md border shadow-sm flex-shrink-0 ${iconClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-xs font-medium text-ink-600 mb-0.5">{title}</div>
        <div className="text-lg font-bold font-mono-figures">{value}</div>
      </div>
    </div>
  )
}

export default function CustomerPage() {
  const { data, isLoading, isError } = useCustomers()
  
  const { data: pendingRequests } = useQuery({
    queryKey: ['customers', 'pending'],
    queryFn: () => customerApi.pendingVerification()
  })
  
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<Customer | null>(null)
  const [filterDSE, setFilterDSE] = useState('')
  const [filterRoute, setFilterRoute] = useState('')
  const [filterChannel, setFilterChannel] = useState('')

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
      { id: 'dse', accessorFn: (c: any) => c.dse_name || c.employee_name || '—', header: 'DSE', cell: (c) => c.getValue() },
      { accessorKey: 'gstin', header: 'GST No', cell: (c) => <span className="font-mono-figures text-xs">{c.getValue() as string || '—'}</span> },
      { accessorKey: 'credit_limit', header: 'Credit Limit', cell: (c) => {
        const val = c.getValue() as number;
        return val ? <span className="font-mono-figures text-ink-900 font-medium">₹{val.toLocaleString('en-IN')}</span> : '—';
      }},
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
  
  // Extract unique options for filters
  const dses = Array.from(new Set(customers.map((c: any) => c.dse_name || c.employee_name).filter(Boolean))) as string[]
  const routes = Array.from(new Set(customers.map(c => c.route_name).filter(Boolean))) as string[]
  const channels = Array.from(new Set(customers.map(c => c.channel_name).filter(Boolean))) as string[]

  // Apply filters
  const filteredCustomers = useMemo(() => {
    return customers.filter((c: any) => {
      const matchDSE = filterDSE ? (c.dse_name === filterDSE || c.employee_name === filterDSE) : true
      const matchRoute = filterRoute ? c.route_name === filterRoute : true
      const matchChannel = filterChannel ? c.channel_name === filterChannel : true
      return matchDSE && matchRoute && matchChannel
    })
  }, [customers, filterDSE, filterRoute, filterChannel])

  const total = filteredCustomers.length
  const verified = filteredCustomers.filter(c => {
    const v = c.verification_status?.toLowerCase()
    return v === 'active' || v === 'verified'
  }).length
  
  const pendingCount = pendingRequests?.length || 0;

  return (
    <div className="space-y-6 w-full h-full flex flex-col">
      <div>
        <PageHeader
          eyebrow="CUS · People"
          title="Customers"
          description="Retail and wholesale accounts, routes, channels, and outstanding balances."
          actions={
            <div className="flex gap-2">
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
            iconClass="bg-blue-50 text-blue-600 border-blue-100"
          />
          <StatCard 
            title="Active / Verified" 
            value={verified} 
            icon={CheckCircle2} 
            iconClass="bg-emerald-50 text-emerald-600 border-emerald-100"
          />
          <StatCard 
            title={pendingCount > 0 ? "Action Required" : "Pending Verification"}
            value={pendingCount} 
            icon={pendingCount > 0 ? Bell : Clock} 
            wrapperClass={pendingCount > 0 
              ? "bg-rose-50 border-rose-300 text-rose-700 shadow-md animate-pulse hover:animate-none"
              : "bg-white border-border text-ink-900"} 
            iconClass={pendingCount > 0 
              ? "bg-rose-100 text-rose-700 border-rose-200" 
              : "bg-amber-50 text-amber-600 border-amber-100"}
            onClick={() => setVerifyModalOpen(true)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col space-y-4">
        <div className="glass-card p-4 rounded-xl border border-border-subtle bg-white shadow-sm flex items-center gap-4 w-full flex-wrap">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-2.5 text-ink-600" size={15} />
            <input 
              type="text" 
              placeholder="Search customers by name, phone, or route..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface border border-border-subtle rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-brand-400 text-ink-900 placeholder:text-ink-600"
            />
          </div>
          
          <div className="flex gap-2">
            <select 
              value={filterDSE} 
              onChange={e => setFilterDSE(e.target.value)}
              className="bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-400 text-ink-900"
            >
              <option value="">All DSEs</option>
              {dses.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            
            <select 
              value={filterRoute} 
              onChange={e => setFilterRoute(e.target.value)}
              className="bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-400 text-ink-900"
            >
              <option value="">All Routes</option>
              {routes.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            
            <select 
              value={filterChannel} 
              onChange={e => setFilterChannel(e.target.value)}
              className="bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-400 text-ink-900"
            >
              <option value="">All Channels</option>
              {channels.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        
        <DataTable
          data={filteredCustomers}
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
