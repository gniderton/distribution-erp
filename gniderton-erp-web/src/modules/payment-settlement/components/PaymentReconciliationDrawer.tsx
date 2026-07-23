import { useState, useEffect } from 'react'
import { X, Loader2, CheckCircle2, XCircle, FileText, Download, DollarSign, Wallet, CreditCard } from 'lucide-react'
import { useReconciliationDetails, useBulkUpdateReconciliation } from '../hooks'
import dayjs from 'dayjs'

export default function PaymentReconciliationDrawer({ reportId, onClose }: { reportId: string | number | null, onClose: () => void }) {
  const { data, isLoading, isError } = useReconciliationDetails(reportId)
  const { mutate: bulkUpdate, isPending: isUpdating } = useBulkUpdateReconciliation()

  const [activeTab, setActiveTab] = useState<'Payments' | 'Expenses' | 'Settlement'>('Payments')
  const [settlementSubTab, setSettlementSubTab] = useState<'Cash' | 'Cheque' | 'Online' | 'Denomination'>('Cash')
  
  // Selection states for bulk actions
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([])

  useEffect(() => {
    if (!reportId) {
      setActiveTab('Payments')
      setSettlementSubTab('Cash')
      setSelectedPayments([])
      setSelectedExpenses([])
    }
  }, [reportId])

  if (!reportId) return null

  const handleBulkAction = (action: 'Verified' | 'Rejected', type: 'Payments' | 'Expenses') => {
    const payload = {
      action,
      report_id: reportId,
      payments: type === 'Payments' ? selectedPayments.map(id => {
        const p = data?.payments.find((x: any) => String(x.id) === id)
        return { ...p, verification_status: action, type: 'payment' }
      }) : undefined,
      expenses: type === 'Expenses' ? selectedExpenses.map(id => {
        const e = data?.expenses.find((x: any) => String(x.id) === id)
        return { ...e, status: action === 'Verified' ? 'Approved' : 'Rejected', type: 'expense' }
      }) : undefined
    }

    bulkUpdate(payload, {
      onSuccess: () => {
        if (type === 'Payments') setSelectedPayments([])
        if (type === 'Expenses') setSelectedExpenses([])
      }
    })
  }

  const togglePayment = (id: string) => {
    setSelectedPayments(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const toggleExpense = (id: string) => {
    setSelectedExpenses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleAllPayments = () => {
    if (selectedPayments.length === data?.payments?.length) setSelectedPayments([])
    else setSelectedPayments(data?.payments?.map((p: any) => String(p.id)) || [])
  }
  
  const toggleAllExpenses = () => {
    if (selectedExpenses.length === data?.expenses?.length) setSelectedExpenses([])
    else setSelectedExpenses(data?.expenses?.map((e: any) => String(e.id)) || [])
  }

  return (
    <>
      <div className="fixed inset-0 bg-ink-900/30 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[800px] max-w-[95vw] bg-surface shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="bg-white border-b border-border-subtle p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-ink-900">Report #{reportId}</h2>
              {data && (
                <p className="text-sm text-ink-600 mt-1">
                  {data.summary.dse_name} • {dayjs(data.summary.report_date).format('MMMM D, YYYY')}
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition text-ink-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Statboxes */}
          {data && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Cash</div>
                <div className="text-xl font-black text-emerald-900">₹{Number(data.summary.total_collection_cash || 0).toFixed(2)}</div>
              </div>
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Total Cheque</div>
                <div className="text-xl font-black text-blue-900">₹{Number(data.summary.total_collection_cheque || 0).toFixed(2)}</div>
              </div>
              <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4">
                <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Total Online</div>
                <div className="text-xl font-black text-purple-900">₹{Number(data.summary.total_collection_online || 0).toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-surface">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Loading details...</p>
            </div>
          ) : isError || !data ? (
            <div className="flex-1 flex items-center justify-center text-rose-500">
              Failed to load report details.
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex px-6 pt-4 gap-6 border-b border-border-subtle bg-white">
                {['Payments', 'Expenses', 'Settlement'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                      activeTab === tab ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-500 hover:text-ink-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Scrollable Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {activeTab === 'Payments' && (
                  <div className="bg-white border border-border-subtle rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-border-subtle bg-surface/50 flex justify-between items-center">
                      <h3 className="font-bold text-ink-900 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-brand-500" /> Collection Entries
                      </h3>
                      <div className="flex gap-2">
                        <button 
                          disabled={selectedPayments.length === 0 || isUpdating}
                          onClick={() => handleBulkAction('Verified', 'Payments')}
                          className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition disabled:opacity-50"
                        >
                          Verify Selected ({selectedPayments.length})
                        </button>
                        <button 
                          disabled={selectedPayments.length === 0 || isUpdating}
                          onClick={() => handleBulkAction('Rejected', 'Payments')}
                          className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                    <table className="w-full text-left text-xs divide-y divide-border-subtle">
                      <thead className="bg-surface text-ink-600 font-semibold uppercase text-[9px] tracking-wider">
                        <tr>
                          <th className="px-4 py-2 w-10 text-center">
                            <input 
                              type="checkbox" 
                              checked={data.payments.length > 0 && selectedPayments.length === data.payments.length}
                              onChange={toggleAllPayments}
                              className="rounded border-ink-300 text-brand-500 focus:ring-brand-500" 
                            />
                          </th>
                          <th className="px-4 py-2">Customer</th>
                          <th className="px-4 py-2">Amount</th>
                          <th className="px-4 py-2">Mode</th>
                          <th className="px-4 py-2">Bank Status</th>
                          <th className="px-4 py-2">Invoices</th>
                          <th className="px-4 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {data.payments.length === 0 && (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-500">No payments found.</td></tr>
                        )}
                        {data.payments.map((p: any) => (
                          <tr key={p.id} className="hover:bg-surface/50 transition">
                            <td className="px-4 py-2 text-center">
                              <input 
                                type="checkbox" 
                                checked={selectedPayments.includes(String(p.id))}
                                onChange={() => togglePayment(String(p.id))}
                                className="rounded border-ink-300 text-brand-500 focus:ring-brand-500" 
                              />
                            </td>
                            <td className="px-4 py-2 font-medium">{p.customer_name}</td>
                            <td className="px-4 py-2 font-bold">₹{Number(p.amount).toFixed(2)}</td>
                            <td className="px-4 py-2">{p.payment_mode}</td>
                            <td className="px-4 py-2">
                              {p.bank_match_status === 'Matched' ? (
                                <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Matched</span>
                              ) : (
                                <span className="text-ink-400 font-medium">{p.bank_match_status || '-'}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-[10px] text-ink-500">{p.selected_invoices || '-'}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                p.verification_status === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
                                p.verification_status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>{p.verification_status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'Expenses' && (
                  <div className="bg-white border border-border-subtle rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-border-subtle bg-surface/50 flex justify-between items-center">
                      <h3 className="font-bold text-ink-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-500" /> DSE Expenses
                      </h3>
                      <div className="flex gap-2">
                        <button 
                          disabled={selectedExpenses.length === 0 || isUpdating}
                          onClick={() => handleBulkAction('Verified', 'Expenses')}
                          className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition disabled:opacity-50"
                        >
                          Approve ({selectedExpenses.length})
                        </button>
                        <button 
                          disabled={selectedExpenses.length === 0 || isUpdating}
                          onClick={() => handleBulkAction('Rejected', 'Expenses')}
                          className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                    
                    {/* Expense Stats Context */}
                    <div className="p-4 bg-amber-50/50 border-b border-amber-100 grid grid-cols-2 gap-4 text-sm">
                       <div>
                         <span className="text-ink-500">Daily Total:</span> <strong className="text-ink-900">₹{data.expense_stats.daily_total}</strong> 
                         <span className="text-ink-400 text-xs ml-1">(Limit: ₹{data.expense_stats.daily_limit})</span>
                       </div>
                       <div>
                         <span className="text-ink-500">Weekly Total:</span> <strong className="text-ink-900">₹{data.expense_stats.weekly_total}</strong>
                       </div>
                       {data.expense_stats.requires_auth && (
                         <div className="col-span-2 text-rose-600 text-xs font-bold flex items-center gap-1 mt-1">
                           <XCircle className="w-3 h-3" /> Exceeds daily limit. Requires admin authorization.
                         </div>
                       )}
                    </div>

                    <table className="w-full text-left text-xs divide-y divide-border-subtle">
                      <thead className="bg-surface text-ink-600 font-semibold uppercase text-[9px] tracking-wider">
                        <tr>
                          <th className="px-4 py-2 w-10 text-center">
                            <input 
                              type="checkbox" 
                              checked={data.expenses.length > 0 && selectedExpenses.length === data.expenses.length}
                              onChange={toggleAllExpenses}
                              className="rounded border-ink-300 text-brand-500 focus:ring-brand-500" 
                            />
                          </th>
                          <th className="px-4 py-2">Type</th>
                          <th className="px-4 py-2">Amount</th>
                          <th className="px-4 py-2">Description</th>
                          <th className="px-4 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {data.expenses.length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">No expenses submitted.</td></tr>
                        )}
                        {data.expenses.map((e: any) => (
                          <tr key={e.id} className="hover:bg-surface/50 transition">
                            <td className="px-4 py-2 text-center">
                              <input 
                                type="checkbox" 
                                checked={selectedExpenses.includes(String(e.id))}
                                onChange={() => toggleExpense(String(e.id))}
                                className="rounded border-ink-300 text-brand-500 focus:ring-brand-500" 
                              />
                            </td>
                            <td className="px-4 py-2 font-medium">{e.expense_type}</td>
                            <td className="px-4 py-2 font-bold">₹{Number(e.amount).toFixed(2)}</td>
                            <td className="px-4 py-2 text-ink-600">{e.description || '-'}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                e.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                e.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>{e.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'Settlement' && (
                  <div className="bg-white border border-border-subtle rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
                     <div className="flex border-b border-border-subtle bg-surface/50">
                        {['Cash', 'Cheque', 'Online', 'Denomination'].map(st => (
                          <button
                            key={st}
                            onClick={() => setSettlementSubTab(st as any)}
                            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${
                              settlementSubTab === st ? 'border-brand-500 text-brand-700 bg-white' : 'border-transparent text-ink-500 hover:text-ink-700 hover:bg-surface'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                     </div>
                     <div className="p-4">
                       {settlementSubTab === 'Cash' && (
                         <div>
                           <h4 className="text-sm font-bold text-ink-900 mb-4 flex items-center gap-2"><Wallet className="w-4 h-4"/> Cash Payments</h4>
                           <table className="w-full text-left text-xs divide-y divide-border-subtle border">
                             <thead className="bg-surface">
                               <tr>
                                 <th className="px-4 py-2">Customer</th>
                                 <th className="px-4 py-2">Amount</th>
                                 <th className="px-4 py-2">Status</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-border-subtle">
                               {data.payments.filter((p:any) => p.payment_mode === 'Cash').map((p:any) => (
                                 <tr key={p.id}>
                                   <td className="px-4 py-2">{p.customer_name}</td>
                                   <td className="px-4 py-2 font-bold">₹{Number(p.amount).toFixed(2)}</td>
                                   <td className="px-4 py-2">{p.verification_status}</td>
                                 </tr>
                               ))}
                               {data.payments.filter((p:any) => p.payment_mode === 'Cash').length === 0 && <tr><td colSpan={3} className="px-4 py-4 text-center text-ink-500">No cash payments.</td></tr>}
                             </tbody>
                           </table>
                         </div>
                       )}

                       {settlementSubTab === 'Cheque' && (
                         <div>
                           <h4 className="text-sm font-bold text-ink-900 mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4"/> Cheque Payments</h4>
                           <table className="w-full text-left text-xs divide-y divide-border-subtle border">
                             <thead className="bg-surface">
                               <tr>
                                 <th className="px-4 py-2">Customer</th>
                                 <th className="px-4 py-2">Cheque No</th>
                                 <th className="px-4 py-2">Bank</th>
                                 <th className="px-4 py-2">Amount</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-border-subtle">
                               {data.payments.filter((p:any) => p.payment_mode === 'Cheque').map((p:any) => (
                                 <tr key={p.id}>
                                   <td className="px-4 py-2">{p.customer_name}</td>
                                   <td className="px-4 py-2">{p.cheque_number}</td>
                                   <td className="px-4 py-2">{p.bank_name}</td>
                                   <td className="px-4 py-2 font-bold">₹{Number(p.amount).toFixed(2)}</td>
                                 </tr>
                               ))}
                               {data.payments.filter((p:any) => p.payment_mode === 'Cheque').length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-center text-ink-500">No cheque payments.</td></tr>}
                             </tbody>
                           </table>
                         </div>
                       )}

                       {settlementSubTab === 'Online' && (
                         <div>
                           <h4 className="text-sm font-bold text-ink-900 mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4"/> Online Payments</h4>
                           <table className="w-full text-left text-xs divide-y divide-border-subtle border">
                             <thead className="bg-surface">
                               <tr>
                                 <th className="px-4 py-2">Customer</th>
                                 <th className="px-4 py-2">Ref ID</th>
                                 <th className="px-4 py-2">Amount</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-border-subtle">
                               {data.payments.filter((p:any) => ['UPI', 'NEFT/RTGS'].includes(p.payment_mode)).map((p:any) => (
                                 <tr key={p.id}>
                                   <td className="px-4 py-2">{p.customer_name}</td>
                                   <td className="px-4 py-2">{p.transaction_reference}</td>
                                   <td className="px-4 py-2 font-bold">₹{Number(p.amount).toFixed(2)}</td>
                                 </tr>
                               ))}
                               {data.payments.filter((p:any) => ['UPI', 'NEFT/RTGS'].includes(p.payment_mode)).length === 0 && <tr><td colSpan={3} className="px-4 py-4 text-center text-ink-500">No online payments.</td></tr>}
                             </tbody>
                           </table>
                         </div>
                       )}

                       {settlementSubTab === 'Denomination' && (
                         <div>
                           <h4 className="text-sm font-bold text-ink-900 mb-4">Cash Denominations</h4>
                           <div className="max-w-md mx-auto bg-surface p-4 rounded-xl border border-border-subtle">
                              <table className="w-full text-right text-xs">
                                <thead>
                                  <tr className="border-b border-border-subtle">
                                    <th className="pb-2 font-medium">Notes</th>
                                    <th className="pb-2 font-medium">Count</th>
                                    <th className="pb-2 font-medium">Total (₹)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {data.denominations.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-ink-500">No denomination data provided.</td></tr>}
                                  {data.denominations.map((d: any) => (
                                    <tr key={d.id} className="border-b border-border-subtle/50 last:border-0">
                                      <td className="py-2">₹{d.note_value}</td>
                                      <td className="py-2">x {d.note_count}</td>
                                      <td className="py-2 font-bold">₹{Number(d.note_value * d.note_count).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                           </div>
                         </div>
                       )}
                     </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
