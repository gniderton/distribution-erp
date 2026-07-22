import { useState, useEffect } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useSyncDetails, useVerifySettle } from '../hooks'

export function SyncVerificationModal({ open, onClose, syncId }: { open: boolean, onClose: () => void, syncId: number | null }) {
  const { data, isLoading } = useSyncDetails(syncId)
  const settleMutation = useVerifySettle()
  
  const [activeTab, setActiveTab] = useState<'manifest' | 'returns' | 'payments' | 'expenses'>('manifest')
  
  // Local state for approvals
  const [manifestApprovals, setManifestApprovals] = useState<Record<number, string>>({})
  const [returnApprovals, setReturnApprovals] = useState<Record<number, string>>({})
  
  // Initialize local approval states when data loads
  useEffect(() => {
    if (data && open) {
      const initialM: Record<number, string> = {}
      data.manifest?.forEach((m: any) => {
        initialM[m.invoice_id] = m.delivery_status === 'Delivered' ? 'Approved' : m.delivery_status === 'Returned' ? 'Rejected' : 'Undelivered'
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

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button 
        onClick={handleSettle}
        loading={settleMutation.isPending}
        disabled={isLoading || !data}
      >
        Verify & Settle Trip
      </Button>
    </>
  )

  const tabs = [
    { id: 'manifest', label: `Manifest (${data?.manifest?.length || 0})` },
    { id: 'returns', label: `Returns (${data?.returns?.length || 0})` },
    { id: 'payments', label: `Payments (${data?.payments?.length || 0})` },
    { id: 'expenses', label: `Expenses (${data?.expenses?.length || 0})` },
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
        <div className="space-y-4 -mt-2">
          {/* Tabs */}
          <div className="flex space-x-1 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-ink-600 hover:text-ink-900 hover:border-border-subtle'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="py-2">
            {activeTab === 'manifest' && (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface text-ink-700 text-xs uppercase font-medium">
                    <tr>
                      <th className="px-4 py-3 border-b">Invoice</th>
                      <th className="px-4 py-3 border-b">Customer</th>
                      <th className="px-4 py-3 border-b">Amount</th>
                      <th className="px-4 py-3 border-b">DSE Status</th>
                      <th className="px-4 py-3 border-b text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
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
                            className="h-8 px-2 text-sm rounded-md border border-border bg-white"
                            value={manifestApprovals[m.invoice_id] || 'Undelivered'}
                            onChange={(e) => setManifestApprovals({ ...manifestApprovals, [m.invoice_id]: e.target.value })}
                          >
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
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface text-ink-700 text-xs uppercase font-medium">
                    <tr>
                      <th className="px-4 py-3 border-b">Product</th>
                      <th className="px-4 py-3 border-b">Customer</th>
                      <th className="px-4 py-3 border-b">Qty</th>
                      <th className="px-4 py-3 border-b">Reason</th>
                      <th className="px-4 py-3 border-b text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.returns?.map((r: any) => (
                      <tr key={r.id} className="bg-white">
                        <td className="px-4 py-3 font-medium">{r.product_name}</td>
                        <td className="px-4 py-3">{r.customer_name}</td>
                        <td className="px-4 py-3">{r.qty}</td>
                        <td className="px-4 py-3 text-ink-600">{r.reason || r.return_type}</td>
                        <td className="px-4 py-3 text-right">
                          <select
                            className="h-8 px-2 text-sm rounded-md border border-border bg-white"
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
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface text-ink-700 text-xs uppercase font-medium">
                    <tr>
                      <th className="px-4 py-3 border-b">Receipt No</th>
                      <th className="px-4 py-3 border-b">Customer</th>
                      <th className="px-4 py-3 border-b">Mode</th>
                      <th className="px-4 py-3 border-b text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
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
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface text-ink-700 text-xs uppercase font-medium">
                    <tr>
                      <th className="px-4 py-3 border-b">Type</th>
                      <th className="px-4 py-3 border-b">Description</th>
                      <th className="px-4 py-3 border-b text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
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
          </div>
        </div>
      )}
    </Drawer>
  )
}
