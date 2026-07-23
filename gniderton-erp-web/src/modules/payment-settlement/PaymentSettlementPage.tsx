import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useList } from './hooks'
import { Search, Loader2 } from 'lucide-react'
import PaymentReconciliationDrawer from './components/PaymentReconciliationDrawer'
import dayjs from 'dayjs'

export default function PaymentSettlementPage() {
  const { data: rawData, isLoading, isError } = useList()
  const [selectedReportId, setSelectedReportId] = useState<string | number | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Pending')

  const data = useMemo(() => {
    if (!rawData) return []
    return rawData.filter((r: any) => {
      const matchStatus = statusFilter === 'All' || r.settlement_status === statusFilter
      const matchSearch = r.dse_name?.toLowerCase().includes(search.toLowerCase()) || String(r.report_id).includes(search)
      return matchStatus && matchSearch
    })
  }, [rawData, search, statusFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="PST · Finance"
        title="Payment Settlement"
        description="DSE / field collection reconciliation."
      />

      <div className="bg-white rounded-xl shadow-sm border border-border-subtle">
        <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex bg-surface rounded-lg p-1 border border-border-subtle">
            {['Pending', 'Settled', 'All'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
                  statusFilter === s ? 'bg-white shadow text-ink-900' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Search by DSE or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface border border-border-subtle rounded-lg text-sm focus:outline-none focus:border-brand-500 transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-border-subtle">
            <thead className="bg-surface text-ink-600 font-semibold uppercase text-[9px] tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Report ID</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">DSE Name</th>
                <th className="px-6 py-3.5">Collection (₹)</th>
                <th className="px-6 py-3.5">Pending Payments</th>
                <th className="px-6 py-3.5">Pending Expenses</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-ink-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-ink-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading reports...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-rose-500">Failed to load reports.</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-ink-500 bg-surface/30">
                    No reports found matching your criteria.
                  </td>
                </tr>
              ) : (
                data.map((r: any) => (
                  <tr 
                    key={r.report_id} 
                    onClick={() => setSelectedReportId(r.report_id)}
                    className="hover:bg-brand-50/30 transition cursor-pointer"
                  >
                    <td className="px-6 py-3.5 font-medium">#{r.report_id}</td>
                    <td className="px-6 py-3.5">{dayjs(r.report_date).format('DD/MM/YYYY')}</td>
                    <td className="px-6 py-3.5 font-bold text-ink-900">{r.dse_name}</td>
                    <td className="px-6 py-3.5 font-semibold text-emerald-600">
                      ₹{Number(r.total_payment_collection || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.pending_payment_count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-surface text-ink-500'
                      }`}>
                        {r.pending_payment_count}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.pending_expense_count > 0 ? 'bg-rose-100 text-rose-800' : 'bg-surface text-ink-500'
                      }`}>
                        {r.pending_expense_count}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                        r.settlement_status === 'Pending' ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20' : 
                        r.settlement_status === 'Settled' ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' : 
                        'bg-surface text-ink-600 border border-border-subtle'
                      }`}>
                        {r.settlement_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentReconciliationDrawer 
        reportId={selectedReportId} 
        onClose={() => setSelectedReportId(null)} 
      />
    </div>
  )
}
