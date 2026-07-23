import { useState, useEffect } from 'react'
import { FileText, PackageX, IndianRupee, FileDown, Box, AlertCircle } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useSyncDetails, useVerifySettle } from '../hooks'

export function SyncVerificationModal({ open, onClose, syncId }: { open: boolean, onClose: () => void, syncId: number | null }) {
  const { data, isLoading } = useSyncDetails(syncId)
  const settleMutation = useVerifySettle()
  
  const [activeTab, setActiveTab] = useState<'manifest' | 'returns' | 'payments' | 'expenses' | 'inventory'>('manifest')
  
  // Local state for approvals
  const [manifestApprovals, setManifestApprovals] = useState<Record<number, string>>({})
  const [returnApprovals, setReturnApprovals] = useState<Record<number, string>>({})
  
  // Initialize local approval states when data loads
  useEffect(() => {
    if (data && open) {
      const initialM: Record<number, string> = {}
      data.manifest?.forEach((m: any) => {
        initialM[m.invoice_id] = m.delivery_status === 'Delivered' ? 'Approved' : ''
      })
      setManifestApprovals(initialM)
      
      const initialR: Record<number, string> = {}
      data.returns?.forEach((r: any) => {
        initialR[r.id] = 'Approved' // Default approve all returns
      })
      setReturnApprovals(initialR)
      setActiveTab('manifest') // Reset to first tab
    }
  }, [data, open])

  const handleSettle = () => {
    if (!syncId) return
    const payload = {
      sync_id: syncId,
      verified_by: 1, // default admin
      manifest_verifications: Object.entries(manifestApprovals).map(([invoice_id, status]) => ({ invoice_id: Number(invoice_id), status })),
      return_verifications: Object.entries(returnApprovals).map(([return_id, status]) => ({ return_id: Number(return_id), status }))
    }
    settleMutation.mutate(payload, {
      onSuccess: () => {
        onClose()
      }
    })
  }

  const isAllVerified = Object.values(manifestApprovals).every(v => v !== '')

  const footer = (
    <div className="flex justify-end gap-2 w-full">
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button 
        onClick={handleSettle}
        loading={settleMutation.isPending}
        disabled={isLoading || !data || !isAllVerified}
      >
        Verify & Settle Trip
      </Button>
    </div>
  )

  const tabs = [
    { id: 'manifest', label: 'Manifest', count: data?.manifest?.length || 0, icon: <FileText size={16} /> },
    { id: 'returns', label: 'Returns', count: data?.returns?.length || 0, icon: <PackageX size={16} /> },
    { id: 'payments', label: 'Payments', count: data?.payments?.length || 0, icon: <IndianRupee size={16} /> },
    { id: 'expenses', label: 'Expenses', count: data?.expenses?.length || 0, icon: <FileDown size={16} /> },
    { id: 'inventory', label: 'Vehicle Inventory', count: (data?.undelivered_summary?.length || 0) + (data?.rejected_summary?.length || 0) + (data?.returns_summary?.length || 0), icon: <Box size={16} /> },
  ] as const

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Verify Sync #${syncId || ''}`}
      description="Approve or reject manifest statuses and returns before finalizing."
      widthClass="max-w-4xl"
      footer={footer}
    >
      {isLoading ? (
        <div className="py-12 flex justify-center text-ink-500">Loading sync details...</div>
      ) : !data ? (
        <div className="py-12 flex justify-center text-ink-500">No data found.</div>
      ) : (
        <div className="space-y-4 -mt-2 flex-1 flex flex-col min-h-0">
          {!isAllVerified && activeTab === 'manifest' && (
            <div className="bg-danger-50 text-danger-700 px-4 py-3 rounded-lg border border-danger-200 flex items-center gap-2 text-sm font-medium">
              <AlertCircle size={16} />
              Please verify all non-delivered invoices before settling the trip.
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-4 border-b border-border-subtle px-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-ink-500 hover:text-ink-700 hover:border-border-subtle'
                }`}
              >
                {tab.icon}
                {tab.label}
                <Badge tone={activeTab === tab.id ? 'brand' : 'neutral'} className="ml-1">
                  {tab.count}
                </Badge>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="py-2 flex-1 flex flex-col min-h-0 overflow-y-auto">
            {activeTab === 'manifest' && (
              <div className="glass-card rounded-xl border border-border-subtle overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface/50 text-ink-600 text-[10px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3 border-b border-border-subtle">Invoice</th>
                      <th className="px-4 py-3 border-b border-border-subtle">Customer</th>
                      <th className="px-4 py-3 border-b border-border-subtle">Amount</th>
                      <th className="px-4 py-3 border-b border-border-subtle">DSE Status</th>
                      <th className="px-4 py-3 border-b border-border-subtle text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {data.manifest?.map((m: any) => (
                      <tr key={m.invoice_id} className="bg-white">
                        <td className="px-4 py-3 font-medium">{m.invoice_number}</td>
                        <td className="px-4 py-3">{m.customer_name}</td>
                        <td className="px-4 py-3">₹{Number(m.grand_total).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <Badge tone={m.delivery_status === 'Delivered' ? 'success' : m.delivery_status === 'Returned' ? 'danger' : 'warn'}>
                            {m.delivery_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <select
                            className={`h-8 px-2 text-sm rounded-md border bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 ${!manifestApprovals[m.invoice_id] ? 'border-danger-400 bg-danger-50' : 'border-border-subtle'}`}
                            value={manifestApprovals[m.invoice_id] || ''}
                            onChange={(e) => setManifestApprovals({ ...manifestApprovals, [m.invoice_id]: e.target.value })}
                          >
                            <option value="" disabled>Select Verification</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Undelivered">Undelivered</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {data.manifest?.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-500">No invoices in this manifest.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'returns' && (
              <div className="glass-card rounded-xl border border-border-subtle overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface/50 text-ink-600 text-[10px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3 border-b border-border-subtle">Product</th>
                      <th className="px-4 py-3 border-b border-border-subtle">Customer</th>
                      <th className="px-4 py-3 border-b border-border-subtle">Qty</th>
                      <th className="px-4 py-3 border-b border-border-subtle">Reason</th>
                      <th className="px-4 py-3 border-b border-border-subtle text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {data.returns?.map((r: any) => (
                      <tr key={r.id} className="bg-white">
                        <td className="px-4 py-3 font-medium">{r.product_name}</td>
                        <td className="px-4 py-3">{r.customer_name}</td>
                        <td className="px-4 py-3">{r.qty}</td>
                        <td className="px-4 py-3 text-ink-600">{r.reason || r.return_type}</td>
                        <td className="px-4 py-3 text-right">
                          <select
                            className="h-8 px-2 text-sm rounded-md border border-border-subtle bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                            value={returnApprovals[r.id] || 'Rejected'}
                            onChange={(e) => setReturnApprovals({ ...returnApprovals, [r.id]: e.target.value })}
                          >
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {data.returns?.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-500">No returns recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="glass-card rounded-xl border border-border-subtle overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface/50 text-ink-600 text-[10px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3 border-b border-border-subtle">Receipt No</th>
                      <th className="px-4 py-3 border-b border-border-subtle">Customer</th>
                      <th className="px-4 py-3 border-b border-border-subtle">Mode</th>
                      <th className="px-4 py-3 border-b border-border-subtle text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {data.payments?.map((p: any) => (
                      <tr key={p.id} className="bg-white">
                        <td className="px-4 py-3 font-medium">{p.payment_number}</td>
                        <td className="px-4 py-3">{p.customer_name}</td>
                        <td className="px-4 py-3"><Badge tone="neutral">{p.payment_mode}</Badge></td>
                        <td className="px-4 py-3 text-right font-medium">₹{Number(p.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                    {data.payments?.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-ink-500">No payments collected.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'expenses' && (
              <div className="glass-card rounded-xl border border-border-subtle overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface/50 text-ink-600 text-[10px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3 border-b border-border-subtle">Type</th>
                      <th className="px-4 py-3 border-b border-border-subtle">Description</th>
                      <th className="px-4 py-3 border-b border-border-subtle text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {data.expenses?.map((e: any) => (
                      <tr key={e.id} className="bg-white">
                        <td className="px-4 py-3 font-medium">{e.expense_type}</td>
                        <td className="px-4 py-3 text-ink-600">{e.description}</td>
                        <td className="px-4 py-3 text-right font-medium">₹{Number(e.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                    {data.expenses?.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-ink-500">No expenses recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {activeTab === 'inventory' && (
              <div className="space-y-6">
                <div className="glass-card rounded-xl border border-border-subtle overflow-hidden bg-white shadow-sm">
                  <div className="px-4 py-3 border-b border-border-subtle bg-surface/30 font-medium text-sm text-ink-900">
                    Products from Undelivered & Rejected Invoices
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-surface/50 text-ink-600 text-[10px] uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="px-4 py-3 border-b border-border-subtle">Product</th>
                          <th className="px-4 py-3 border-b border-border-subtle text-right">MRP</th>
                          <th className="px-4 py-3 border-b border-border-subtle text-right">Qty in Vehicle</th>
                          <th className="px-4 py-3 border-b border-border-subtle text-right">Total Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {data.undelivered_summary?.map((p: any, i: number) => (
                          <tr key={`u-${i}`} className="bg-white hover:bg-surface/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-ink-900">{p.product_name}</td>
                            <td className="px-4 py-3 text-right">₹{Number(p.mrp).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-medium text-brand-600">{p.total_qty}</td>
                            <td className="px-4 py-3 text-right font-medium">₹{Number(p.total_amount).toFixed(2)}</td>
                          </tr>
                        ))}
                        {data.rejected_summary?.map((p: any, i: number) => (
                          <tr key={`r-${i}`} className="bg-white hover:bg-surface/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-ink-900">{p.product_name}</td>
                            <td className="px-4 py-3 text-right">₹{Number(p.mrp).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-medium text-brand-600">{p.total_qty}</td>
                            <td className="px-4 py-3 text-right font-medium">₹{Number(p.total_amount).toFixed(2)}</td>
                          </tr>
                        ))}
                        {(data.undelivered_summary?.length === 0 && data.rejected_summary?.length === 0) && (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-500 text-xs">No products from whole invoices returned.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="glass-card rounded-xl border border-border-subtle overflow-hidden bg-white shadow-sm">
                  <div className="px-4 py-3 border-b border-border-subtle bg-surface/30 font-medium text-sm text-ink-900">
                    Partial Returns / Expiry / Damage from Doorstep
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-surface/50 text-ink-600 text-[10px] uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="px-4 py-3 border-b border-border-subtle">Product</th>
                          <th className="px-4 py-3 border-b border-border-subtle text-right">Returned Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {data.returns_summary?.map((p: any, i: number) => (
                          <tr key={`ret-${i}`} className="bg-white hover:bg-surface/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-ink-900">{p.product_name}</td>
                            <td className="px-4 py-3 text-right font-medium text-brand-600">{p.total_qty}</td>
                          </tr>
                        ))}
                        {data.returns_summary?.length === 0 && (
                          <tr><td colSpan={2} className="px-4 py-8 text-center text-ink-500 text-xs">No partial returns recorded.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}
