import { useState, useEffect, useMemo } from 'react'
import { X, Loader2, CheckCircle2, XCircle, FileText, Wallet, CreditCard, Banknote, AlertCircle, Save, Receipt, ShieldCheck, Download } from 'lucide-react'
import { useReconciliationDetails, useBulkUpdateReconciliation, useUnconsumedCredits } from '../hooks'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { generatePaymentSettlementPDF } from '../utils/pdfGenerator'

export default function PaymentReconciliationDrawer({ reportId, onClose }: { reportId: string | number | null, onClose: () => void }) {
  const { data, isLoading, isError } = useReconciliationDetails(reportId)
  const { data: bankCredits } = useUnconsumedCredits()
  const { mutate: bulkUpdate, isPending: isUpdating } = useBulkUpdateReconciliation()

  const [activeTab, setActiveTab] = useState<'Payments' | 'Expenses' | 'Settlement'>('Payments')
  const [settlementSubTab, setSettlementSubTab] = useState<'Cash' | 'Cheque' | 'Online'>('Cash')
  
  // Local state for edits
  const [localPayments, setLocalPayments] = useState<any[]>([])
  const [localExpenses, setLocalExpenses] = useState<any[]>([])
  const [cashDenominations, setCashDenominations] = useState<{note: number, count: number}[]>([
    {note: 500, count: 0}, {note: 200, count: 0}, {note: 100, count: 0}, 
    {note: 50, count: 0}, {note: 20, count: 0}, {note: 10, count: 0}, {note: 1, count: 0}
  ])
  const [chequeAmounts, setChequeAmounts] = useState<Record<string, string>>({})

  useEffect(() => {
    if (data) {
      setLocalPayments(data?.payments?.map((p:any) => ({ ...p, _bank_stmt_id: null })) || [])
      setLocalExpenses(data?.expenses || [])
      if (data?.denominations && data?.denominations?.length > 0) {
        const denoms = data?.denominations
          ?.map((d:any) => ({ note: Number(d.note_value), count: Number(d.note_count) }))
          ?.filter((d:any) => !isNaN(d.note) && d.note > 0) || []
        // Fill in missing notes
        const defaultNotes = [500, 200, 100, 50, 20, 10, 1]
        defaultNotes.forEach(n => {
          if (!denoms.find((d:any) => d.note === n)) denoms.push({ note: n, count: 0 })
        })
        setCashDenominations(denoms.sort((a:any,b:any) => b.note - a.note))
      }
    } else {
      setLocalPayments([])
      setLocalExpenses([])
      setChequeAmounts({})
    }
  }, [data])

  useEffect(() => {
    if (!reportId) {
      setActiveTab('Payments')
      setSettlementSubTab('Cash')
    }
  }, [reportId])

  const isSettled = data?.summary?.settlement_status === 'Settled'

  // --- Handlers ---
  const updatePaymentStatus = (id: string | number, status: 'Verified' | 'Rejected' | 'Pending') => {
    if (isSettled) return
    setLocalPayments(prev => prev.map(p => String(p.id) === String(id) ? { ...p, verification_status: status } : p))
  }

  const updateExpenseStatus = (id: string | number, status: 'Approved' | 'Rejected') => {
    if (isSettled) return
    setLocalExpenses(prev => prev.map(e => String(e.id) === String(id) ? { ...e, status } : e))
  }

  const handleOnlineBankMap = (paymentId: string | number, bankStmtId: string) => {
    if (isSettled) return
    setLocalPayments(prev => prev.map(p => String(p.id) === String(paymentId) ? { ...p, _bank_stmt_id: bankStmtId, verification_status: bankStmtId ? 'Verified' : 'Pending' } : p))
  }

  // --- Validations ---
  const cashPayments = localPayments.filter(p => p.payment_mode === 'Cash' && p.verification_status !== 'Rejected')
  const approvedExpenses = localExpenses.filter(e => e.status === 'Approved')
  const totalExpectedCash = cashPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0) - approvedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  const totalEnteredCash = cashDenominations.reduce((sum, d) => sum + (d.note * d.count), 0)
  const isCashTallyValid = cashPayments.length === 0 || Math.abs(totalExpectedCash - totalEnteredCash) < 0.1

  const allCheques = localPayments.filter(p => p.payment_mode === 'Cheque')
  // Group system cheques
  const groupedCheques = useMemo(() => {
    const groups: Record<string, { total: number, customer: string, bank: string, date: string, invoices: string[], allRejected: boolean }> = {}
    allCheques.forEach(p => {
      const key = p.cheque_number || 'Unknown'
      if (!groups[key]) groups[key] = { total: 0, customer: p.customer_name, bank: p.bank_name, date: p.cheque_date || p.payment_date, invoices: [], allRejected: true }
      
      if (p.verification_status !== 'Rejected') {
        groups[key].total += Number(p.amount)
        groups[key].allRejected = false
      }
      
      if (p.selected_invoices) groups[key].invoices.push(p.selected_invoices)
    })
    return groups
  }, [allCheques])

  let isChequeValid = true
  Object.keys(groupedCheques).forEach(chkNo => {
    if (!groupedCheques[chkNo].allRejected) {
      const entered = Number(chequeAmounts[chkNo] || 0)
      if (Math.abs(entered - groupedCheques[chkNo].total) > 0.1) isChequeValid = false
    }
  })
  if (allCheques.filter(c => c.verification_status !== 'Rejected').length === 0) isChequeValid = true

  const onlinePayments = localPayments.filter(p => ['UPI', 'NEFT/RTGS', 'Bank Transfer'].includes(p.payment_mode))
  let isOnlineValid = true
  const bankStmtUsage: Record<string, number> = {}
  onlinePayments.forEach(p => {
    if (p.verification_status !== 'Rejected') {
      if (!p._bank_stmt_id) isOnlineValid = false // must be mapped
      else {
        bankStmtUsage[p._bank_stmt_id] = (bankStmtUsage[p._bank_stmt_id] || 0) + Number(p.amount)
      }
    }
  })
  
  if (bankCredits) {
    Object.keys(bankStmtUsage).forEach(stmtId => {
      const credit = bankCredits.find((c:any) => String(c.id) === stmtId)
      if (credit) {
        const balance = Number(credit.credit_amount) - Number(credit.consumed_amount)
        if (bankStmtUsage[stmtId] > balance) isOnlineValid = false
      }
    })
  }

  const canSave = isCashTallyValid && isChequeValid && isOnlineValid && !isSettled

  const handleSave = () => {
    const userString = localStorage.getItem('gniderton_user')
    const user = userString ? JSON.parse(userString) : null

    const payload = {
      action: 'Verified', // Bulk status
      report_id: reportId,
      user_id: user?.id || 1, // Fix Postgres undefined error for verified_by
      payments: localPayments.map(p => ({
        ...p,
        bank_stmt_id: p._bank_stmt_id || p.bank_stmt_id,
        type: 'payment',
        action: p.verification_status === 'Rejected' ? 'Rejected' : 'Verified'
      })),
      expenses: localExpenses.map(e => ({
        ...e,
        type: 'expense',
        action: e.status === 'Rejected' ? 'Rejected' : 'Verified'
      })),
      denominations: cashDenominations.reduce((acc, d) => {
        if (d.note === 500) acc.note_500 = d.count
        if (d.note === 200) acc.note_200 = d.count
        if (d.note === 100) acc.note_100 = d.count
        if (d.note === 50) acc.note_50 = d.count
        if (d.note === 20) acc.note_20 = d.count
        if (d.note === 10) acc.note_10 = d.count
        if (d.note === 1) acc.coins = d.count
        return acc
      }, {} as any)
    }

    bulkUpdate(payload, {
      onSuccess: () => {
        toast.success("Report settled successfully!")
        onClose()
      },
      onError: (err: any) => {
        toast.error("Failed to settle report: " + err.message)
      }
    })
  }

  if (!reportId) return null

  return (
    <>
      <div className="fixed inset-0 bg-ink-900/30 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[900px] max-w-[95vw] bg-surface shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="bg-white border-b border-border-subtle p-6 flex-shrink-0">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-ink-900">Report #{reportId}</h2>
                {isSettled && <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold uppercase">Settled</span>}
              </div>
              {data && (
                <p className="text-sm text-ink-600 mt-1">
                  {data?.summary?.dse_name} • {dayjs(data?.summary?.report_date).format('MMMM D, YYYY')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  try {
                    generatePaymentSettlementPDF(data, reportId || undefined)
                  } catch(e) {
                    toast.error("Failed to generate PDF")
                  }
                }} 
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 rounded-lg transition text-white font-semibold text-sm shadow-sm"
              >
                <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download PDF</span>
              </button>
              <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition text-ink-500">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Statboxes */}
          {data && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex justify-between items-end">
                <div>
                  <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Cash</div>
                  <div className="text-xl font-black text-emerald-900">₹{Number(data?.summary?.total_collection_cash || 0).toFixed(2)}</div>
                </div>
                {!isSettled && <button onClick={() => { setActiveTab('Settlement'); setSettlementSubTab('Cash'); }} className="text-emerald-700 bg-emerald-100 hover:bg-emerald-200 text-xs px-3 py-1 rounded-md font-bold transition">Verify →</button>}
              </div>
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex justify-between items-end">
                <div>
                  <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Total Cheque</div>
                  <div className="text-xl font-black text-blue-900">₹{Number(data?.summary?.total_collection_cheque || 0).toFixed(2)}</div>
                </div>
                {!isSettled && <button onClick={() => { setActiveTab('Settlement'); setSettlementSubTab('Cheque'); }} className="text-blue-700 bg-blue-100 hover:bg-blue-200 text-xs px-3 py-1 rounded-md font-bold transition">Verify →</button>}
              </div>
              <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 flex justify-between items-end">
                <div>
                  <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Total Online</div>
                  <div className="text-xl font-black text-purple-900">₹{Number(data?.summary?.total_collection_online || 0).toFixed(2)}</div>
                </div>
                {!isSettled && <button onClick={() => { setActiveTab('Settlement'); setSettlementSubTab('Online'); }} className="text-purple-700 bg-purple-100 hover:bg-purple-200 text-xs px-3 py-1 rounded-md font-bold transition">Verify →</button>}
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
                {(isSettled ? [
                  { name: 'Payments', icon: <FileText className="w-4 h-4" /> },
                  { name: 'Expenses', icon: <Receipt className="w-4 h-4" /> }
                ] : [
                  { name: 'Payments', icon: <FileText className="w-4 h-4" /> },
                  { name: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
                  { name: 'Settlement', icon: <ShieldCheck className="w-4 h-4" /> }
                ]).map(tab => (
                  <button
                    key={tab.name}
                    onClick={() => setActiveTab(tab.name as any)}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                      activeTab === tab.name ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-500 hover:text-ink-700'
                    }`}
                  >
                    {tab.icon} {tab.name}
                  </button>
                ))}
              </div>

              {/* Scrollable Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {activeTab === 'Payments' && (
                  <div className="bg-white border border-border-subtle rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-border-subtle bg-surface/50">
                      <h3 className="font-bold text-ink-900 flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-brand-500" /> All Collection Entries
                      </h3>
                    </div>
                    <table className="w-full text-left text-xs divide-y divide-border-subtle">
                      <thead className="bg-surface text-ink-600 font-semibold uppercase text-[9px] tracking-wider">
                        <tr>
                          <th className="px-4 py-2">Customer</th>
                          <th className="px-4 py-2">Amount</th>
                          <th className="px-4 py-2">Mode</th>
                          <th className="px-4 py-2">Invoices</th>
                          <th className="px-4 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {localPayments.length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">No payments found.</td></tr>
                        )}
                        {localPayments.map((p: any) => {
                          let displayStatus = p.verification_status
                          if (displayStatus === 'Pending') {
                            if (p.payment_mode === 'Cash' && isCashTallyValid && totalExpectedCash > 0) {
                               displayStatus = 'Verified'
                            } else if (p.payment_mode === 'Cheque') {
                               const chkNo = p.cheque_number || 'Unknown'
                               const group = groupedCheques[chkNo]
                               if (group && !group.allRejected) {
                                 const entered = Number(chequeAmounts[chkNo] || 0)
                                 if (entered > 0 && Math.abs(entered - group.total) < 0.1) {
                                   displayStatus = 'Verified'
                                 }
                               }
                            }
                          }

                          return (
                            <tr key={p.id} className="hover:bg-surface/50 transition">
                              <td className="px-4 py-2 font-medium">{p.customer_name}</td>
                              <td className="px-4 py-2 font-bold">₹{Number(p.amount).toFixed(2)}</td>
                              <td className="px-4 py-2">{p.payment_mode}</td>
                              <td className="px-4 py-2 text-[10px] text-ink-500">{p.selected_invoices || '-'}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  displayStatus === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
                                  displayStatus === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>{displayStatus}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'Expenses' && (
                  <div className="bg-white border border-border-subtle rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-border-subtle bg-surface/50">
                      <h3 className="font-bold text-ink-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-500" /> DSE Expenses
                      </h3>
                    </div>
                    
                    <div className="p-4 bg-amber-50/50 border-b border-amber-100 grid grid-cols-2 gap-4 text-sm">
                       <div>
                         <span className="text-ink-500">Daily Total:</span> <strong className="text-ink-900">₹{data?.expense_stats?.daily_total || 0}</strong> 
                         <span className="text-ink-400 text-xs ml-1">(Limit: ₹{data?.expense_stats?.daily_limit || 250})</span>
                       </div>
                       <div>
                         <span className="text-ink-500">Weekly Total:</span> <strong className="text-ink-900">₹{data?.expense_stats?.weekly_total || 0}</strong>
                       </div>
                    </div>

                    <table className="w-full text-left text-xs divide-y divide-border-subtle">
                      <thead className="bg-surface text-ink-600 font-semibold uppercase text-[9px] tracking-wider">
                        <tr>
                          <th className="px-4 py-2">Type</th>
                          <th className="px-4 py-2">Amount</th>
                          <th className="px-4 py-2">Description</th>
                          <th className="px-4 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {localExpenses.length === 0 && (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-500">No expenses submitted.</td></tr>
                        )}
                        {localExpenses.map((e: any) => (
                          <tr key={e.id} className="hover:bg-surface/50 transition">
                            <td className="px-4 py-2 font-medium">{e.expense_type}</td>
                            <td className="px-4 py-2 font-bold">₹{Number(e.amount).toFixed(2)}</td>
                            <td className="px-4 py-2 text-ink-600">{e.description || '-'}</td>
                            <td className="px-4 py-2">
                              {isSettled ? (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  e.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>{e.status}</span>
                              ) : (
                                <div className="flex gap-1">
                                  <button onClick={() => updateExpenseStatus(e.id, 'Approved')} className={`px-2 py-1 rounded-md text-[10px] font-bold ${e.status === 'Approved' ? 'bg-emerald-500 text-white' : 'bg-surface border border-border-subtle text-ink-500 hover:bg-emerald-50'}`}>Approve</button>
                                  <button onClick={() => updateExpenseStatus(e.id, 'Rejected')} className={`px-2 py-1 rounded-md text-[10px] font-bold ${e.status === 'Rejected' ? 'bg-rose-500 text-white' : 'bg-surface border border-border-subtle text-ink-500 hover:bg-rose-50'}`}>Reject</button>
                                </div>
                              )}
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
                        {['Cash', 'Cheque', 'Online'].map(st => (
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
                     <div className="p-4 flex-1 overflow-y-auto">
                       {settlementSubTab === 'Cash' && (
                         <div className="grid grid-cols-2 gap-6">
                           <div>
                             <h4 className="text-sm font-bold text-ink-900 mb-4 flex items-center gap-2"><Wallet className="w-4 h-4"/> Cash System Entries</h4>
                             <table className="w-full text-left text-xs divide-y divide-border-subtle">
                               <thead className="bg-surface">
                                 <tr>
                                   <th className="px-4 py-2">Customer</th>
                                   <th className="px-4 py-2">Amount</th>
                                   <th className="px-4 py-2">Action</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-border-subtle">
                                 {localPayments.filter((p:any) => p.payment_mode === 'Cash').map((p:any) => (
                                   <tr key={p.id} className={p.verification_status === 'Rejected' ? 'opacity-50 line-through' : ''}>
                                     <td className="px-4 py-2">{p.customer_name}</td>
                                     <td className="px-4 py-2 font-bold">₹{Number(p.amount).toFixed(2)}</td>
                                     <td className="px-4 py-2">
                                       {!isSettled && (
                                         <button onClick={() => updatePaymentStatus(p.id, p.verification_status === 'Rejected' ? 'Pending' : 'Rejected')} className="text-[10px] font-bold text-rose-500 hover:underline">
                                           {p.verification_status === 'Rejected' ? 'Undo Reject' : 'Reject'}
                                         </button>
                                       )}
                                       {isSettled && p.verification_status}
                                     </td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                           <div>
                             <h4 className="text-sm font-bold text-ink-900 mb-4 flex justify-between items-center">
                               Physical Denomination Entry
                               <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isCashTallyValid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                 Expected: ₹{totalExpectedCash.toFixed(2)}
                               </span>
                             </h4>
                             <div className="bg-surface p-4 rounded-xl border border-border-subtle">
                                <table className="w-full text-right text-xs">
                                  <thead>
                                    <tr className="border-b border-border-subtle">
                                      <th className="pb-2 font-medium">Notes</th>
                                      <th className="pb-2 font-medium text-center">Count</th>
                                      <th className="pb-2 font-medium">Total (₹)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {cashDenominations.map((d, i) => (
                                      <tr key={d.note} className="border-b border-border-subtle/50 last:border-0">
                                        <td className="py-2">₹{d.note}</td>
                                        <td className="py-2 text-center w-24">
                                          {isSettled ? (
                                            <span className="font-semibold text-ink-900">{d.count || '-'}</span>
                                          ) : (
                                            <input 
                                              type="number" 
                                              min={0}
                                              value={d.count || ''} 
                                              onChange={e => {
                                                const newDenoms = [...cashDenominations]
                                                newDenoms[i].count = parseInt(e.target.value) || 0
                                                setCashDenominations(newDenoms)
                                              }}
                                              className="w-16 px-2 py-1 text-center bg-white border border-border-subtle rounded-md text-xs focus:outline-none focus:border-brand-500"
                                            />
                                          )}
                                        </td>
                                        <td className="py-2 font-bold">₹{(d.note * d.count).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                    <tr>
                                      <td colSpan={2} className="py-3 font-bold text-ink-600">Entered Total:</td>
                                      <td className={`py-3 font-black text-sm ${isCashTallyValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        ₹{totalEnteredCash.toFixed(2)}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                             </div>
                           </div>
                         </div>
                       )}

                       {settlementSubTab === 'Cheque' && (
                         <div>
                           <h4 className="text-sm font-bold text-ink-900 mb-4 flex items-center justify-between gap-2">
                             <span className="flex items-center gap-2"><CreditCard className="w-4 h-4"/> Cheque Physical Entry</span>
                             <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isChequeValid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                               All Matches: {isChequeValid ? 'Yes' : 'No'}
                             </span>
                           </h4>
                           <table className="w-full text-left text-xs divide-y divide-border-subtle">
                             <thead className="bg-surface">
                               <tr>
                                 <th className="px-4 py-2">Customer</th>
                                 <th className="px-4 py-2">Cheque No</th>
                                 <th className="px-4 py-2">Bank</th>
                                 <th className="px-4 py-2">Expected Amount</th>
                                 <th className="px-4 py-2 bg-brand-50/50">Entered Amount</th>
                                 <th className="px-4 py-2">Action</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-border-subtle">
                               {Object.keys(groupedCheques).map(chkNo => {
                                 const group = groupedCheques[chkNo]
                                 const entered = Number(chequeAmounts[chkNo] || 0)
                                 const isMatch = Math.abs(entered - group.total) < 0.1
                                 
                                 return (
                                   <tr key={chkNo}>
                                     <td className="px-4 py-2 font-medium">{group.customer}</td>
                                     <td className="px-4 py-2">{chkNo}</td>
                                     <td className="px-4 py-2">{group.bank}</td>
                                     <td className="px-4 py-2 font-bold text-ink-600">₹{group.total.toFixed(2)}</td>
                                     <td className="px-4 py-2 bg-brand-50/30">
                                       {!group.allRejected ? (
                                         <div className="flex items-center gap-2">
                                            {isSettled ? (
                                              <span className="font-bold text-ink-900 px-2 py-1 w-24 border border-transparent">₹{entered.toFixed(2)}</span>
                                            ) : (
                                              <input 
                                                type="number"
                                                value={chequeAmounts[chkNo] || ''}
                                                onChange={e => setChequeAmounts({...chequeAmounts, [chkNo]: e.target.value})}
                                                className={`w-24 px-2 py-1 bg-white border rounded-md text-xs focus:outline-none ${entered > 0 ? (isMatch ? 'border-emerald-300 focus:border-emerald-500' : 'border-rose-300 focus:border-rose-500') : 'border-border-subtle focus:border-brand-500'}`}
                                                placeholder="0.00"
                                              />
                                            )}
                                            {entered > 0 && isMatch && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                            {entered > 0 && !isMatch && <AlertCircle className="w-4 h-4 text-rose-500" />}
                                         </div>
                                       ) : (
                                         <span className="text-ink-500 italic">Rejected</span>
                                       )}
                                     </td>
                                     <td className="px-4 py-2">
                                       {!isSettled && (
                                         <button onClick={() => {
                                            const paymentsInGroup = localPayments.filter(p => p.payment_mode === 'Cheque' && (p.cheque_number || 'Unknown') === chkNo)
                                            paymentsInGroup.forEach(p => {
                                              updatePaymentStatus(p.id, group.allRejected ? 'Pending' : 'Rejected')
                                            })
                                         }} className="text-[10px] font-bold text-rose-500 hover:underline">
                                           {group.allRejected ? 'Undo Reject' : 'Reject'}
                                         </button>
                                       )}
                                       {isSettled && group.allRejected && 'Rejected'}
                                     </td>
                                   </tr>
                                 )
                               })}
                               {Object.keys(groupedCheques).length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-center text-ink-500">No cheque payments.</td></tr>}
                             </tbody>
                           </table>
                           <p className="text-[10px] text-ink-500 mt-2">* Cheque system entries are automatically grouped by Cheque Number.</p>
                         </div>
                       )}

                       {settlementSubTab === 'Online' && (
                         <div>
                           <h4 className="text-sm font-bold text-ink-900 mb-4 flex items-center justify-between gap-2">
                             <span className="flex items-center gap-2"><CreditCard className="w-4 h-4"/> Online Payments Mapping</span>
                             <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isOnlineValid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                               All Mapped & Within Limit: {isOnlineValid ? 'Yes' : 'No'}
                             </span>
                           </h4>
                           <table className="w-full text-left text-xs divide-y divide-border-subtle">
                             <thead className="bg-surface">
                               <tr>
                                 <th className="px-4 py-2">Customer</th>
                                 <th className="px-4 py-2">Ref ID</th>
                                 <th className="px-4 py-2">Amount</th>
                                 <th className="px-4 py-2">Map to Bank Statement</th>
                                 <th className="px-4 py-2">Action</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-border-subtle">
                               {onlinePayments.map((p:any) => (
                                 <tr key={p.id} className={p.verification_status === 'Rejected' ? 'opacity-50 line-through' : ''}>
                                   <td className="px-4 py-2">{p.customer_name}</td>
                                   <td className="px-4 py-2">{p.transaction_reference}</td>
                                   <td className="px-4 py-2 font-bold">₹{Number(p.amount).toFixed(2)}</td>
                                   <td className="px-4 py-2">
                                     {isSettled ? (
                                       <span className="font-semibold text-ink-900 px-2 py-1">
                                         {p._bank_stmt_id ? `Mapped to Bank ID: ${p._bank_stmt_id}` : p.verification_status === 'Rejected' ? 'Rejected' : 'Unmapped'}
                                       </span>
                                     ) : p.verification_status !== 'Rejected' ? (
                                       <select
                                         value={p._bank_stmt_id || ''}
                                         onChange={(e) => handleOnlineBankMap(p.id, e.target.value)}
                                         className={`w-full px-2 py-1 bg-white border rounded-md text-xs focus:outline-none ${p._bank_stmt_id ? 'border-emerald-300' : 'border-rose-300'}`}
                                       >
                                         <option value="">-- Select Bank Credit --</option>
                                         {bankCredits?.map((c:any) => {
                                           const mappedTotal = bankStmtUsage[c.id] || 0
                                           const isCurrent = p._bank_stmt_id === String(c.id)
                                           const balance = Number(c.credit_amount) - Number(c.consumed_amount)
                                           const isOverUsed = mappedTotal > balance
                                           return (
                                             <option key={c.id} value={c.id} disabled={isOverUsed && !isCurrent}>
                                               [ID: {c.id}] Amt: ₹{c.credit_amount} | Bal: ₹{balance.toFixed(2)} | Ref: {c.bank_ref_id || c.particulars}
                                             </option>
                                           )
                                         })}
                                       </select>
                                     ) : null}
                                     {p.verification_status === 'Rejected' && <span className="text-ink-500 italic">Rejected</span>}
                                   </td>
                                   <td className="px-4 py-2">
                                     {!isSettled && (
                                       <button onClick={() => updatePaymentStatus(p.id, p.verification_status === 'Rejected' ? 'Pending' : 'Rejected')} className="text-[10px] font-bold text-rose-500 hover:underline">
                                         {p.verification_status === 'Rejected' ? 'Undo Reject' : 'Reject'}
                                       </button>
                                     )}
                                     {isSettled && p.verification_status}
                                   </td>
                                 </tr>
                               ))}
                               {onlinePayments.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-center text-ink-500">No online payments.</td></tr>}
                             </tbody>
                           </table>
                         </div>
                       )}
                     </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              {!isSettled && (
                <div className="bg-white border-t border-border-subtle p-4 flex justify-between items-center">
                  <div className="text-xs font-medium text-ink-600 flex gap-4">
                    <span className="flex items-center gap-1">
                      {isCashTallyValid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                      Cash Tally
                    </span>
                    <span className="flex items-center gap-1">
                      {isChequeValid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                      Cheque Match
                    </span>
                    <span className="flex items-center gap-1">
                      {isOnlineValid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                      Online Maps
                    </span>
                  </div>
                  <button 
                    disabled={!canSave || isUpdating}
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-2 bg-brand-500 text-white rounded-lg font-bold hover:bg-brand-600 transition disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Finalize & Save
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
