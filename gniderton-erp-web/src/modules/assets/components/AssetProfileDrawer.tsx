import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Wrench, UserPlus, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { assetsApi } from '../api'

interface Props {
  open: boolean
  onClose: () => void
  asset: any
}

export function AssetProfileDrawer({ open, onClose, asset }: Props) {
  const [activeTab, setActiveTab] = useState<'custody' | 'maintenance' | 'documents'>('custody')

  const { data: profile, isLoading } = useQuery({
    queryKey: ['asset-profile', asset?.id],
    queryFn: () => assetsApi.getAssetProfile(asset.id),
    enabled: !!asset?.id && open
  })

  if (!asset) return null

  return (
    <Drawer 
      open={open} 
      onClose={onClose} 
      title={
        <div className="flex items-center gap-2">
          {asset.asset_name}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-50 text-brand-700 border border-brand-200">
            {asset.status}
          </span>
        </div>
      }
      description={asset.category}
      widthClass="max-w-2xl"
    >
      <div className="flex flex-col h-full -mx-6 -my-5">
        
        {/* Custom Header Stats */}
        <div className="px-6 pb-4 bg-white border-b border-border-subtle shrink-0">
          <div className="flex gap-6 mt-2">
            <div>
              <p className="text-xs text-ink-500 font-medium mb-1">Current Value</p>
              <p className="text-base font-semibold text-ink-900">{formatCurrency(asset.net_book_value)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-500 font-medium mb-1">Custodian</p>
              <p className="text-sm font-medium text-ink-900 mt-1">{asset.custodian || 'Unassigned'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 bg-white border-b border-border-subtle shrink-0 flex gap-6">
          <button
            onClick={() => setActiveTab('custody')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'custody' ? 'border-brand-500 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-900'
            }`}
          >
            Custody
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'maintenance' ? 'border-brand-500 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-900'
            }`}
          >
            Maintenance
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'documents' ? 'border-brand-500 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-900'
            }`}
          >
            Documents
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
          ) : (
            <>
              {/* Custody Tab */}
              {activeTab === 'custody' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-ink-900">Assignment History</h3>
                    <Button size="sm" variant="secondary" className="gap-2">
                      <UserPlus size={14} /> Assign Asset
                    </Button>
                  </div>
                  
                  {profile?.assignments?.length > 0 ? (
                    <div className="space-y-3">
                      {profile.assignments.map((a: any) => (
                        <div key={a.id} className="p-4 bg-white rounded-lg border border-border-subtle flex justify-between items-center">
                          <div>
                            <p className="font-medium text-ink-900">{a.assigned_to}</p>
                            <p className="text-xs text-ink-500 mt-1">
                              {format(new Date(a.assigned_date), 'MMM dd, yyyy')} - {a.return_date ? format(new Date(a.return_date), 'MMM dd, yyyy') : 'Present'}
                            </p>
                          </div>
                          {a.status === 'Active' ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle2 size={12}/> Active</span>
                          ) : (
                            <span className="text-xs font-medium text-ink-500 bg-surface px-2 py-1 rounded-full border border-border-subtle">Returned</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white border border-dashed border-border-subtle rounded-lg text-ink-500">
                      No assignment history.
                    </div>
                  )}
                </div>
              )}

              {/* Maintenance Tab */}
              {activeTab === 'maintenance' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-ink-900">Maintenance & Repairs</h3>
                    <Button size="sm" variant="secondary" className="gap-2">
                      <Wrench size={14} /> Log Maintenance
                    </Button>
                  </div>

                  {profile?.maintenance?.length > 0 ? (
                    <div className="space-y-3">
                      {profile.maintenance.map((m: any) => (
                        <div key={m.id} className="p-4 bg-white rounded-lg border border-border-subtle">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-ink-900">{m.service_provider || 'Unknown Provider'}</p>
                              <p className="text-xs text-ink-500 mt-0.5">{format(new Date(m.maintenance_date), 'MMM dd, yyyy')}</p>
                            </div>
                            <span className="font-semibold text-rose-600">{formatCurrency(m.amount)}</span>
                          </div>
                          {m.remarks && <p className="text-sm text-ink-700 mt-2 bg-surface p-2 rounded">{m.remarks}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white border border-dashed border-border-subtle rounded-lg text-ink-500">
                      No maintenance records found.
                    </div>
                  )}
                </div>
              )}

              {/* Documents Tab (Coming Soon) */}
              {activeTab === 'documents' && (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-border-subtle text-center">
                  <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4">
                    <FileText className="text-brand-600" size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-ink-900 mb-2">Document Storage</h3>
                  <p className="text-sm text-ink-600 max-w-sm mb-6">
                    Upload and manage purchase invoices, warranty certificates, and insurance policies directly on the asset profile.
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-600 bg-amber-50 px-4 py-2 rounded-full border border-amber-200">
                    <AlertCircle size={16} />
                    Feature Coming Soon (Phase 2)
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </Drawer>
  )
}
