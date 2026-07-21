import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Plus, Users, CheckCircle2, Clock } from 'lucide-react'
import { useCustomers } from './hooks'
import { CustomerViewDrawer } from './components/CustomerViewDrawer'
import type { Customer } from './types'

const statusTone: Record<string, 'success' | 'warn' | 'neutral'> = {
  active: 'success',
  pending: 'warn',
  inactive: 'neutral',
}

function StatCard({ title, value, icon: Icon, colorClass }: { title: string, value: string | number, icon: any, colorClass: string }) {
  return (
    <div className={`relative rounded-xl border border-white/20 bg-white/60 backdrop-blur-md shadow-sm overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${colorClass}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="font-medium text-ink-600">{title}</span>
        <div className="p-2 rounded-lg bg-white/50 backdrop-blur-sm shadow-sm">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-3xl font-bold font-mono-figures text-ink-900">{value}</div>
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/30 rounded-full blur-xl"></div>
    </div>
  )
}

export default function CustomerPage() {
  const { data, isLoading, isError } = useCustomers()
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
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
            <Button onClick={() => { setEditing(null); setDrawerOpen(true) }} className="shadow-md hover:shadow-lg transition-shadow">
              <Plus className="h-4 w-4 mr-2" /> New customer
            </Button>
          }
        />
        
        {/* Beautiful Glassmorphic KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 mb-2">
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
            colorClass="bg-gradient-to-br from-amber-50 to-orange-100/50 border-amber-200 text-amber-600" 
          />
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col">
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-border overflow-hidden">
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
            searchPlaceholder="Search customers by name, phone, or route..."
          />
        </div>
      </div>

      <CustomerViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} customer={editing} />
    </div>
  )
}
