import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/shared/DataTable'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { api } from '@/lib/axios'
import { Building2, Hash, Wrench, Wallet, TrendingUp, TrendingDown, Tags, FileText, IndianRupee, Plus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { AssignAssetModal } from './modals/AssignAssetModal'
import { AddMaintenanceModal } from './modals/AddMaintenanceModal'

interface Props {
  open: boolean
  onClose: () => void
  asset: any
}

export function AssetProfileDrawer({ open, onClose, asset }: Props) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'analytics' | 'subassets' | 'maintenance' | 'assignments' | 'depreciations'>('analytics')
  const [assignOpen, setAssignOpen] = useState(false)
  const [maintenanceOpen, setMaintenanceOpen] = useState(false)

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['asset-analytics', asset?.id],
    queryFn: () => api.get(`/api/assets/${asset?.id}/analytics`).then(res => res.data),
    enabled: !!asset?.id && activeTab === 'analytics'
  })

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['asset-profile', asset?.id],
    queryFn: () => api.get(`/api/assets/${asset?.id}/profile`).then(res => res.data),
    enabled: !!asset?.id && (activeTab === 'maintenance' || activeTab === 'assignments' || activeTab === 'depreciations')
  })

  if (!asset) return null

  const netROI = (analytics?.total_income || 0) - (analytics?.total_expenses || 0) - (analytics?.total_depreciation || 0)
  const roiIsPositive = netROI >= 0

  return (
    <Drawer 
      open={open} 
      onClose={onClose} 
      title={asset.asset_name}
      description="Asset Profitability & Sub-asset Tracking"
      widthClass="max-w-4xl"
    >
      <div className="flex flex-col h-full -mx-6 -my-5">
        
        {/* Header */}
        <div className="bg-brand-50 border-b border-brand-100 p-6 shrink-0">
          <div className="flex gap-4 items-start">
            <div className="h-16 w-16 bg-white rounded-xl shadow-sm border border-brand-100 flex items-center justify-center text-brand-600">
              <Building2 size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-900">{asset.asset_name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-brand-700">
                <span className="flex items-center gap-1"><Tags size={14} /> {asset.category}</span>
                <span className="flex items-center gap-1"><Hash size={14} /> {asset.asset_purchase_no}</span>
                <span className="flex items-center gap-1 font-medium text-brand-800">
                  Val: {formatCurrency(asset.net_book_value || asset.purchase_cost)}
                </span>
                {asset.parent_asset_name && (
                  <span className="bg-brand-200 text-brand-800 px-2 py-0.5 rounded-full text-xs font-semibold">
                    Child of: {asset.parent_asset_name}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-6 mt-6 border-b border-brand-200">
            {[
              { id: 'analytics', label: 'ROI Analytics', icon: TrendingUp },
              { id: 'subassets', label: 'Sub-Assets', icon: Tags },
              { id: 'depreciations', label: 'Depreciations', icon: TrendingDown },
              { id: 'maintenance', label: 'Maintenance & Repairs', icon: Wrench },
              { id: 'assignments', label: 'Assignments', icon: FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-colors border-b-2 -mb-[1px] ${
                  activeTab === tab.id 
                    ? 'border-brand-600 text-brand-800' 
                    : 'border-transparent text-brand-600/70 hover:text-brand-800'
                }`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {analyticsLoading ? (
                <div className="text-center p-8 text-ink-500">Calculating advanced ROI metrics...</div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
                      <div className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">Total Income</div>
                      <div className="text-xl font-bold text-emerald-600">{formatCurrency(analytics?.total_income || 0)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
                      <div className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">Maint. & Expenses</div>
                      <div className="text-xl font-bold text-rose-600">{formatCurrency(analytics?.total_expenses || 0)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
                      <div className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">Depreciation</div>
                      <div className="text-xl font-bold text-amber-600">{formatCurrency(analytics?.total_depreciation || 0)}</div>
                    </div>
                    <div className={`p-4 rounded-xl border shadow-sm ${roiIsPositive ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                      <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${roiIsPositive ? 'text-emerald-700' : 'text-rose-700'}`}>Net ROI Profitability</div>
                      <div className={`text-xl font-bold ${roiIsPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatCurrency(netROI)}
                      </div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm">
                    <h3 className="font-bold text-ink-900 mb-6">Income vs Expenses (6 Months)</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics?.trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val/1000}k`} />
                          <RechartsTooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          <Bar dataKey="income" name="Income" fill="var(--color-success-500)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expense" name="Expenses" fill="var(--color-danger-500)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'subassets' && (
            <div className="bg-white border border-border-subtle rounded-xl overflow-hidden">
              <DataTable 
                data={analytics?.sub_assets || []} 
                columns={[
                  { header: 'Sub-Asset Name', accessorKey: 'asset_name' },
                  { header: 'Purchase Cost', accessorKey: 'purchase_cost', cell: (i: any) => formatCurrency(i.getValue()) }
                ]}
              />
            </div>
          )}

          {activeTab === 'depreciations' && (
            <div className="bg-white border border-border-subtle rounded-xl overflow-hidden">
              <DataTable 
                data={profile?.depreciations || []} 
                columns={[
                  { header: 'Date', accessorKey: 'transaction_date', cell: (i: any) => i.getValue() ? format(new Date(i.getValue()), 'MMM dd, yyyy') : '-' },
                  { header: 'Amount', accessorKey: 'amount', cell: (i: any) => <span className="font-medium text-amber-600">{formatCurrency(i.getValue())}</span> },
                  { header: 'Remarks', accessorKey: 'remarks', cell: (i: any) => i.getValue() || '-' }
                ]}
              />
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" className="gap-2" onClick={() => setMaintenanceOpen(true)}>
                  <Plus size={16} /> Log Maintenance
                </Button>
              </div>
              <div className="bg-white border border-border-subtle rounded-xl overflow-hidden">
                <DataTable 
                  data={profile?.maintenance || []} 
                  columns={[
                    { header: 'Date', accessorKey: 'maintenance_date', cell: (i: any) => i.getValue() ? format(new Date(i.getValue()), 'MMM dd, yyyy') : '-' },
                    { header: 'Provider', accessorKey: 'service_provider' },
                    { header: 'Remarks', accessorKey: 'remarks' },
                    { header: 'Amount', accessorKey: 'amount', cell: (i: any) => formatCurrency(i.getValue()) }
                  ]}
                />
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" className="gap-2" onClick={() => setAssignOpen(true)}>
                  <Plus size={16} /> Assign to Employee
                </Button>
              </div>
              <div className="bg-white border border-border-subtle rounded-xl overflow-hidden">
                <DataTable 
                  data={profile?.assignments || []} 
                  columns={[
                    { header: 'Date', accessorKey: 'assigned_date', cell: (i: any) => i.getValue() ? format(new Date(i.getValue()), 'MMM dd, yyyy') : '-' },
                    { header: 'Employee', accessorKey: 'employee_name', cell: (i: any) => i.getValue() || 'Employee ID: ' + i.row.original.employee_id },
                    { header: 'Status', accessorKey: 'status' }
                  ]}
                />
              </div>
            </div>
          )}

        </div>
      </div>

      <AssignAssetModal 
        open={assignOpen} 
        onClose={() => setAssignOpen(false)} 
        asset={asset}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['asset-profile', asset?.id] })}
      />
      <AddMaintenanceModal 
        open={maintenanceOpen} 
        onClose={() => setMaintenanceOpen(false)} 
        asset={asset}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['asset-profile', asset?.id] })}
      />
    </Drawer>
  )
}
