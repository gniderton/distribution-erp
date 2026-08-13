import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { useListSchemes, useToggleScheme, useDeleteScheme, useSchemeUsage } from './hooks'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/shared/StatCard'
import type { ColumnDef } from '@tanstack/react-table'
import { SchemeFormModal } from './components/SchemeFormModal'
import { SchemeAnalyticsDashboard } from './components/SchemeAnalyticsDashboard'
import { Gift, Plus, CheckCircle2, AlertTriangle, Search, Filter, Trash, Edit2, Play, Pause } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SchemesPage() {
  const [activeTab, setActiveTab] = useState<'schemes' | 'usage'>('schemes')
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  
  const { data, isLoading, isError } = useListSchemes()
  const { mutateAsync: toggleScheme } = useToggleScheme()
  const { mutateAsync: deleteScheme } = useDeleteScheme()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editScheme, setEditScheme] = useState<any>(null)

  // Usage Tab State
  const [selectedSchemeForUsage, setSelectedSchemeForUsage] = useState('')
  const { data: usageData, isLoading: isUsageLoading } = useSchemeUsage(selectedSchemeForUsage || null)

  const filteredData = useMemo(() => {
    if (!data) return []
    return data.filter((row: any) => {
      if (statusFilter !== 'All' && row.computed_status !== statusFilter) return false
      return true
    })
  }, [data, statusFilter])

  const stats = useMemo(() => {
    if (!data) return { total: 0, active: 0, inactive: 0, expired: 0 }
    return {
      total: data.length,
      active: data.filter((d: any) => d.computed_status === 'Active').length,
      inactive: data.filter((d: any) => d.computed_status === 'Inactive').length,
      expired: data.filter((d: any) => d.computed_status === 'Expired').length,
    }
  }, [data])

  const handleEdit = (row: any) => {
    setEditScheme(row)
    setCreateModalOpen(true)
  }

  const handleDelete = async (row: any) => {
    if (window.confirm(`Are you sure you want to delete Scheme '${row.scheme_name}'? This cannot be undone.`)) {
      try {
        await deleteScheme(row.id)
        toast.success('Scheme deleted successfully.')
      } catch (err: any) {
        toast.error('Failed to delete scheme.')
      }
    }
  }

  const handleToggle = async (row: any) => {
    try {
      await toggleScheme(row.id)
      toast.success(`Scheme ${row.is_active ? 'deactivated' : 'activated'} successfully.`)
    } catch (err: any) {
      toast.error('Failed to toggle scheme status.')
    }
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'scheme_name',
      header: 'Scheme Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-ink-900">{row.original.scheme_name}</div>
          <div className="text-xs text-ink-500 mt-0.5 max-w-[200px] truncate">{row.original.description || '-'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'computed_status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge tone={row.original.computed_status === 'Active' ? 'success' : row.original.computed_status === 'Expired' ? 'danger' : 'neutral'}>
          {row.original.computed_status}
        </Badge>
      ),
    },
    {
      accessorKey: 'validity',
      header: 'Validity',
      cell: ({ row }) => (
        <div className="text-xs">
          <div>From: {new Date(row.original.start_date).toLocaleDateString()}</div>
          {row.original.end_date ? (
            <div>To: {new Date(row.original.end_date).toLocaleDateString()}</div>
          ) : (
            <div className="text-ink-500">No Expiry</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'rule_count',
      header: 'Rules/Slabs',
      cell: ({ row }) => `${row.original.rule_count} configured`,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const isActive = row.original.is_active
        return (
          <div className="flex gap-2 items-center justify-end">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleToggle(row.original) }} title={isActive ? "Deactivate" : "Activate"}>
              {isActive ? <Pause className="w-4 h-4 text-warning-600" /> : <Play className="w-4 h-4 text-success-600" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(row.original) }}>
              <Edit2 className="w-4 h-4 text-ink-600" />
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(row.original) }}>
              <Trash className="w-4 h-4 text-danger-600" />
            </Button>
          </div>
        )
      },
    },
  ]

  const usageColumns: ColumnDef<any>[] = [
    { accessorKey: 'invoice_number', header: 'Invoice #' },
    { accessorKey: 'invoice_date', header: 'Date', cell: ({row}) => new Date(row.original.invoice_date).toLocaleDateString() },
    { accessorKey: 'customer_name', header: 'Customer' },
    { accessorKey: 'grand_total', header: 'Amount', cell: ({row}) => `₹${Number(row.original.grand_total).toLocaleString('en-IN', {minimumFractionDigits: 2})}` },
    { accessorKey: 'status', header: 'Status' }
  ]

  if (isError) return <div className="p-8 text-center text-danger-600">Failed to load schemes</div>

  return (
    <div>
      <PageHeader 
        eyebrow="SELL · PRICING" 
        title="Schemes & Offers" 
        description="Configure buy-get-free, combos, price slabs, and track their usage." 
        actions={
          <Button onClick={() => { setEditScheme(null); setCreateModalOpen(true) }} className="gap-2" variant="primary">
            <Plus className="w-4 h-4" /> New Scheme
          </Button>
        }
      />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Schemes" value={String(stats.total)} icon={Gift} />
          <StatCard label="Active" value={String(stats.active)} icon={CheckCircle2} tone="success" />
          <StatCard label="Inactive" value={String(stats.inactive)} icon={Pause} tone="neutral" />
          <StatCard label="Expired" value={String(stats.expired)} icon={AlertTriangle} tone="danger" />
        </div>

        {/* Custom Tabs */}
        <div className="flex border-b border-[#e6e9ee] mb-6 gap-6">
          <button 
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'schemes' ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-600 hover:text-ink-900'}`}
            onClick={() => setActiveTab('schemes')}
          >
            Schemes List
          </button>
          <button 
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'usage' ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-600 hover:text-ink-900'}`}
            onClick={() => setActiveTab('usage')}
          >
            Analytics & Usage
          </button>
        </div>

        {activeTab === 'schemes' && (
          <>
            <div className="glass-card p-4 rounded-xl border border-[#e6e9ee] bg-white shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between w-full mb-6">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3.5 top-3 text-ink-600" size={15} />
                <input 
                  type="text" 
                  placeholder="Search Schemes…" 
                  value={globalFilter}
                  onChange={e => setGlobalFilter(e.target.value)}
                  className="w-full bg-surface border border-[#e6e9ee] rounded-lg pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-brand-400 text-ink-900 placeholder:text-ink-600"
                />
              </div>

              <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
                <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
                  <Filter size={12} className="text-ink-600" />
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-transparent text-xs text-ink-900 focus:outline-none pr-2 cursor-pointer">
                    <option value="All">Status: All</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="glass-card bg-white rounded-xl border border-[#e6e9ee] shadow-sm overflow-hidden mb-6">
              <DataTable columns={columns} data={filteredData} isLoading={isLoading} />
            </div>
          </>
        )}

        {activeTab === 'usage' && (
          <>
            <div className="glass-card p-4 rounded-xl border border-[#e6e9ee] bg-white shadow-sm flex gap-4 items-center mb-6">
              <div className="w-64">
                <label className="block text-xs font-medium text-ink-600 mb-1.5">Select Scheme to Track</label>
                <select 
                  className="w-full bg-surface border border-[#e6e9ee] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
                  value={selectedSchemeForUsage}
                  onChange={e => setSelectedSchemeForUsage(e.target.value)}
                >
                  <option value="">Select a Scheme...</option>
                  {data?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.scheme_name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {selectedSchemeForUsage ? (
              <div className="space-y-6 mb-6">
                <SchemeAnalyticsDashboard schemeId={selectedSchemeForUsage} />
                
                <div className="glass-card bg-white rounded-xl border border-[#e6e9ee] shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-[#e6e9ee] bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">Raw Invoice Transactions</h3>
                  </div>
                  <DataTable columns={usageColumns} data={usageData || []} isLoading={isUsageLoading} hideSearchBar={false} />
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-ink-500 border border-dashed border-[#e6e9ee] rounded-xl">
                Please select a scheme from the dropdown above to view its usage across invoices.
              </div>
            )}
          </>
        )}
      {createModalOpen && (
        <SchemeFormModal 
          isOpen={createModalOpen} 
          onClose={() => setCreateModalOpen(false)} 
          editScheme={editScheme} 
        />
      )}
    </div>
  )
}
