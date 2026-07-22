import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useSyncHistoryDetails } from '../hooks'

export function SyncHistoryModal({ open, onClose, syncId }: { open: boolean, onClose: () => void, syncId: number | null }) {
  const { data, isLoading } = useSyncHistoryDetails(syncId)
  
  const [activeTab, setActiveTab] = useState<'manifest' | 'returns' | 'payments' | 'expenses'>('manifest')
  
  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>Close</Button>
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
      title={`Sync History #${syncId || ''}`}
      description="View detailed historic data for this settled trip sync."
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
                          <Badge tone={m.verification_status === 'Approved' ? 'success' : m.verification_status === 'Rejected' ? 'danger' : 'neutral'}>
                            {m.verification_status || 'Unknown'}
                          </Badge>
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
                          <Badge tone={r.verification_status === 'Approved' ? 'success' : r.verification_status === 'Rejected' ? 'danger' : 'neutral'}>
                            {r.verification_status || 'Unknown'}
                          </Badge>
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
