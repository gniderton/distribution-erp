import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useSyncHistoryDetails } from '../hooks'
import { FileText, Truck, XCircle, IndianRupee, LayoutList, CheckCircle2, Clock, Download } from 'lucide-react'
import { generateTripHistoryPDF } from '../utils/pdfHistoryGenerator'

export function SyncHistoryModal({ open, onClose, syncId }: { open: boolean, onClose: () => void, syncId: number | null }) {
  const { data, isLoading } = useSyncHistoryDetails(syncId)
  
  const [activeTab, setActiveTab] = useState<'summary' | 'invoices' | 'returns' | 'financials'>('summary')
  
  const footer = (
    <div className="flex justify-end gap-2 w-full">
      <Button variant="secondary" onClick={onClose}>Close</Button>
      <Button 
        onClick={() => {
          if (data && syncId) {
            generateTripHistoryPDF(syncId, data)
          }
        }}
        disabled={!data || isLoading}
        className="flex items-center gap-2"
      >
        <Download size={16} />
        Download PDF
      </Button>
    </div>
  )

  const allInvoices = [
    ...(data?.delivered || []),
    ...(data?.rejected || []),
    ...(data?.undelivered || [])
  ]

  const tabs = [
    { id: 'summary', label: 'Trip Summary', icon: LayoutList },
    { id: 'invoices', label: `Invoices (${allInvoices.length})`, icon: Truck },
    { id: 'returns', label: `Returns (${data?.returns?.length || 0})`, icon: XCircle },
    { id: 'financials', label: `Financials`, icon: IndianRupee },
  ] as const

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Trip History #${syncId || ''}`}
      description="View detailed historic data for this settled trip sync."
      widthClass="max-w-5xl"
      footer={footer}
    >
      {isLoading ? (
        <div className="py-12 flex justify-center text-ink-500">Loading trip details...</div>
      ) : !data ? (
        <div className="py-12 flex justify-center text-ink-500">No data found.</div>
      ) : (
        <div className="space-y-4 -mt-2">
          {/* Tabs */}
          <div className="flex gap-4 border-b border-border-subtle mt-4 px-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-ink-500 hover:text-ink-700'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="py-2">
            {activeTab === 'summary' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="glass-card p-4 rounded-xl border border-border-subtle bg-white shadow-sm">
                    <div className="text-[10px] uppercase font-bold text-ink-500 tracking-wider">Total Delivered</div>
                    <div className="text-xl font-bold text-ink-900 mt-1">₹{data.delivered?.reduce((acc: number, val: any) => acc + Number(val.grand_total), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="glass-card p-4 rounded-xl border border-border-subtle bg-white shadow-sm">
                    <div className="text-[10px] uppercase font-bold text-ink-500 tracking-wider">Collected Cash</div>
                    <div className="text-xl font-bold text-ink-900 mt-1">₹{data.payments?.reduce((acc: number, val: any) => acc + Number(val.amount), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="glass-card p-4 rounded-xl border border-border-subtle bg-white shadow-sm">
                    <div className="text-[10px] uppercase font-bold text-ink-500 tracking-wider">Trip Expenses</div>
                    <div className="text-xl font-bold text-ink-900 mt-1">₹{data.expenses?.reduce((acc: number, val: any) => acc + Number(val.amount), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="glass-card p-4 rounded-xl border border-border-subtle bg-white shadow-sm">
                    <div className="text-[10px] uppercase font-bold text-ink-500 tracking-wider">Net Settled</div>
                    <div className="text-xl font-bold text-success-600 mt-1">₹{(data.payments?.reduce((acc: number, val: any) => acc + Number(val.amount), 0) - data.expenses?.reduce((acc: number, val: any) => acc + Number(val.amount), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>

                <div className="glass-card rounded-xl border border-border-subtle overflow-hidden bg-white shadow-sm">
                  <div className="px-4 py-3 border-b border-border-subtle bg-surface/30 font-medium text-sm text-ink-900">
                    Product Delivery Summary
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-surface/50 text-ink-600 text-[10px] uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="px-4 py-3">Product Name</th>
                          <th className="px-4 py-3">MRP</th>
                          <th className="px-4 py-3 text-right">Delivered Qty</th>
                          <th className="px-4 py-3 text-right">Returned Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {data.delivered_summary?.map((m: any, idx: number) => {
                           const returnMatch = data.returns_summary?.find((rs: any) => rs.product_name === m.product_name);
                           return (
                            <tr key={idx} className="bg-white hover:bg-surface/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-ink-900">{m.product_name}</td>
                              <td className="px-4 py-3 text-ink-600">₹{Number(m.mrp).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-medium text-success-600">{m.total_qty}</td>
                              <td className="px-4 py-3 text-right font-medium text-danger-600">{returnMatch?.total_qty || 0}</td>
                            </tr>
                           )
                        })}
                        {data.delivered_summary?.length === 0 && (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-500 text-xs">No products delivered in this trip.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="glass-card rounded-xl border border-border-subtle overflow-hidden bg-white shadow-sm mt-6">
                  <div className="px-4 py-3 border-b border-border-subtle bg-surface/30 font-medium text-sm text-ink-900">
                    Products from Undelivered / Rejected Invoices
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-surface/50 text-ink-600 text-[10px] uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="px-4 py-3">Product Name</th>
                          <th className="px-4 py-3">MRP</th>
                          <th className="px-4 py-3 text-right">Undelivered Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {[...(data.rejected_summary || []), ...(data.undelivered_summary || [])].map((m: any, idx: number) => (
                          <tr key={idx} className="bg-white hover:bg-surface/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-ink-900">{m.product_name}</td>
                            <td className="px-4 py-3 text-ink-600">₹{Number(m.mrp).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-medium text-danger-600">{m.total_qty}</td>
                          </tr>
                        ))}
                        {(!data.rejected_summary?.length && !data.undelivered_summary?.length) && (
                          <tr><td colSpan={3} className="px-4 py-8 text-center text-ink-500 text-xs">No products from undelivered invoices.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'invoices' && (
              <div className="glass-card rounded-xl border border-border-subtle overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-surface/50 text-ink-600 text-[10px] uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-4 py-3">Invoice</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-center">DSE Status</th>
                        <th className="px-4 py-3 text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {allInvoices.map((m: any) => (
                        <tr key={m.invoice_id} className="bg-white hover:bg-surface/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-ink-900">
                            <div className="flex items-center gap-2">
                              <FileText size={14} className="text-ink-400" />
                              {m.invoice_number}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-ink-700">{m.customer_name}</td>
                          <td className="px-4 py-3 text-right font-medium">₹{Number(m.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-center">
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
                      {allInvoices.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500 text-xs">No invoices found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'returns' && (
              <div className="space-y-6">
                <div className="glass-card rounded-xl border border-border-subtle overflow-hidden bg-white shadow-sm">
                  <div className="px-4 py-3 border-b border-border-subtle bg-surface/30 font-medium text-sm text-ink-900">
                    Products Returned
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-surface/50 text-ink-600 text-[10px] uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3 text-right">Qty</th>
                          <th className="px-4 py-3">Reason</th>
                          <th className="px-4 py-3 text-right">Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {data.returns?.map((r: any) => (
                          <tr key={r.id} className="bg-white hover:bg-surface/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-ink-900">{r.product_name}</td>
                            <td className="px-4 py-3 text-ink-700">{r.customer_name}</td>
                            <td className="px-4 py-3 text-right font-medium text-danger-600">{r.qty}</td>
                            <td className="px-4 py-3 text-ink-600">{r.reason || r.return_type}</td>
                            <td className="px-4 py-3 text-right">
                              <Badge tone={r.verification_status === 'Approved' ? 'success' : r.verification_status === 'Rejected' ? 'danger' : 'neutral'}>
                                {r.verification_status || 'Unknown'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        {data.returns?.length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500 text-xs">No returns recorded.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="glass-card rounded-xl border border-border-subtle overflow-hidden bg-white shadow-sm">
                  <div className="px-4 py-3 border-b border-border-subtle bg-surface/30 font-medium text-sm text-ink-900 flex justify-between items-center">
                    <span>Generated Credit Notes</span>
                    <Badge tone="neutral">{data.credit_notes?.length || 0}</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-surface/50 text-ink-600 text-[10px] uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="px-4 py-3">Credit Note #</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {data.credit_notes?.map((c: any) => (
                          <tr key={c.id} className="bg-white hover:bg-surface/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-ink-900">{c.return_number}</td>
                            <td className="px-4 py-3 text-ink-700">{c.customer_name}</td>
                            <td className="px-4 py-3 text-right font-medium">₹{Number(c.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                        {data.credit_notes?.length === 0 && (
                          <tr><td colSpan={3} className="px-4 py-8 text-center text-ink-500 text-xs">No credit notes generated.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'financials' && (
              <div className="space-y-6">
                <div className="glass-card rounded-xl border border-border-subtle overflow-hidden bg-white shadow-sm">
                  <div className="px-4 py-3 border-b border-border-subtle bg-surface/30 font-medium text-sm text-ink-900">
                    Collections
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-surface/50 text-ink-600 text-[10px] uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="px-4 py-3">Receipt No</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Mode</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {data.payments?.map((p: any) => (
                          <tr key={p.id} className="bg-white hover:bg-surface/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-ink-900">{p.payment_number}</td>
                            <td className="px-4 py-3 text-ink-700">{p.customer_name}</td>
                            <td className="px-4 py-3"><Badge tone="neutral">{p.payment_mode}</Badge></td>
                            <td className="px-4 py-3 text-right font-medium">₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                        {data.payments?.length === 0 && (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-500 text-xs">No payments collected.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="glass-card rounded-xl border border-border-subtle overflow-hidden bg-white shadow-sm">
                  <div className="px-4 py-3 border-b border-border-subtle bg-surface/30 font-medium text-sm text-ink-900">
                    DSE Expenses
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-surface/50 text-ink-600 text-[10px] uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {data.expenses?.map((e: any) => (
                          <tr key={e.id} className="bg-white hover:bg-surface/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-ink-900">{e.expense_type}</td>
                            <td className="px-4 py-3 text-ink-600">{e.description}</td>
                            <td className="px-4 py-3 text-right font-medium text-danger-600">₹{Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                        {data.expenses?.length === 0 && (
                          <tr><td colSpan={3} className="px-4 py-8 text-center text-ink-500 text-xs">No expenses recorded.</td></tr>
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
