import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useSalesSummary, useCashFlow, usePnL } from './hooks'
import { formatCurrency } from '@/lib/utils'
import { BarChart3, TrendingUp, Wallet, FileBarChart } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from 'recharts'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { key: 'financial', label: 'Financial statements', code: 'FIN' },
  { key: 'ledgers', label: 'Ledgers', code: 'LDG' },
  { key: 'sales', label: 'Sales', code: 'SAL' },
  { key: 'payroll', label: 'Payroll', code: 'PAY' },
  { key: 'reconciliation', label: 'Reconciliation', code: 'REC' },
  { key: 'audit', label: 'Audit', code: 'AUD' },
]

/** Normalizes an unknown API shape into a simple chartable array. Adjust once the real response shape is confirmed. */
function normalizeSeries(raw: any): { label: string; value: number }[] {
  if (!raw) return []
  const arr = Array.isArray(raw) ? raw : raw?.data ?? raw?.results ?? []
  if (!Array.isArray(arr)) return []
  return arr.slice(0, 12).map((item: any, i: number) => ({
    label: item.label ?? item.month ?? item.date ?? `#${i + 1}`,
    value: Number(item.value ?? item.amount ?? item.total ?? 0),
  }))
}

export default function ReportsPage() {
  const [category, setCategory] = useState('financial')
  const sales = useSalesSummary()
  const cash = useCashFlow()
  const pnl = usePnL()

  const salesSeries = normalizeSeries(sales.data)
  const cashSeries = normalizeSeries(cash.data)
  const isLoading = sales.isLoading || cash.isLoading || pnl.isLoading

  const totalSales = salesSeries.reduce((s, d) => s + d.value, 0)
  const totalCash = cashSeries.reduce((s, d) => s + d.value, 0)

  return (
    <div>
      <PageHeader
        eyebrow="RPT · Finance"
        title="Reports"
        description="Financial statements, ledgers, sales, payroll, reconciliation, and audit — all in one hub."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Sales (period)" value={formatCurrency(totalSales)} icon={TrendingUp} />
        <StatCard label="Net cash flow" value={formatCurrency(totalCash)} icon={Wallet} />
        <StatCard label="Reports available" value="33" icon={FileBarChart} />
        <StatCard label="Data points loaded" value={String(salesSeries.length + cashSeries.length)} icon={BarChart3} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-3">
          <div className="rounded-card border border-border-subtle bg-white p-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={cn(
                  'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-left transition',
                  category === c.key ? 'bg-brand-500/10 text-brand-700 font-medium' : 'text-ink-700 hover:bg-surface'
                )}
              >
                {c.label}
                <span className="font-mono-figures text-[10px] text-ink-600/50">{c.code}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-9 space-y-4">
          <div className="rounded-card border border-border-subtle bg-white p-5">
            <p className="font-display font-medium text-ink-900 mb-4">Sales summary</p>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : salesSeries.length === 0 ? (
              <EmptyState title="No sales data for this period" description="Once /api/analytics/reports/sales-summary-detailed returns data, it renders here." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={salesSeries}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2f7f74" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2f7f74" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ee" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  <Area type="monotone" dataKey="value" stroke="#2f7f74" fill="url(#salesFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-card border border-border-subtle bg-white p-5">
            <p className="font-display font-medium text-ink-900 mb-4">Cash flow</p>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : cashSeries.length === 0 ? (
              <EmptyState title="No cash flow data for this period" description="Once /api/analytics/reports/cash-flow returns data, it renders here." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={cashSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ee" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  <Bar dataKey="value" fill="#dc9530" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
