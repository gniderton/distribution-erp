import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, DollarSign, TrendingUp, Receipt, Tag, Users, Map, Package } from 'lucide-react'
import { reportsApi } from '../api'
import { StatCard } from '@/components/shared/StatCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308']

export function SalesAnalyticsDashboard() {
  const now = new Date()
  const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  
  const [fy, setFy] = useState(currentFY.toString())
  const [month, setMonth] = useState('')

  const queryParams = {
    fy: fy || undefined,
    month: month || undefined
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['sales-summary-detailed', queryParams],
    queryFn: () => reportsApi.salesSummaryDetailed(queryParams)
  })

  // Format data for Recharts Pie
  const categoryData = useMemo(() => {
    if (!data?.by_category) return []
    return data.by_category.slice(0, 10).map((c: any) => ({ name: c.category_name, value: c.amount }))
  }, [data])

  // Format data for Brand Bar
  const brandData = useMemo(() => {
    if (!data?.by_brand) return []
    return data.by_brand.slice(0, 10).map((b: any) => ({ name: b.brand_name, amount: b.amount }))
  }, [data])

  // Top Products
  const productData = useMemo(() => {
    if (!data?.by_product) return []
    return data.by_product.slice(0, 5).map((p: any) => ({ name: p.product_name, amount: p.amount }))
  }, [data])

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
  if (error) return <div className="p-4 text-red-600 bg-red-50 rounded-lg">Failed to load analytics data.</div>

  const overall = data?.overall || { total_amount: 0, total_taxable: 0, total_tax: 0, total_lines: 0 }

  return (
    <div className="space-y-6">
      
      {/* Header Filters */}
      <div className="glass-card p-4 rounded-xl border border-[#e6e9ee] bg-white shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between w-full">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Executive Sales Dashboard</h2>
          <p className="text-xs text-ink-500">Comprehensive breakdown of sales performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
            <Calendar size={14} className="text-ink-600" />
            <select
              value={fy}
              onChange={e => setFy(e.target.value)}
              className="bg-transparent text-sm font-medium text-ink-900 focus:outline-none pr-2 cursor-pointer"
            >
              {[currentFY, currentFY - 1, currentFY - 2].map(year => (
                <option key={year} value={year}>FY {year}-{year + 1}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="bg-transparent text-sm font-medium text-ink-900 focus:outline-none pr-2 cursor-pointer"
            >
              <option value="">Full Year</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Gross Revenue" value={formatCurrency(overall.total_amount)} icon={DollarSign} tone="success" />
        <StatCard label="Taxable Value" value={formatCurrency(overall.total_taxable)} icon={TrendingUp} tone="success" />
        <StatCard label="Tax Collected" value={formatCurrency(overall.total_tax)} icon={Receipt} tone="neutral" />
        <StatCard label="Total Invoices" value={String(overall.total_lines)} icon={Tag} tone="neutral" />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Brand Performance */}
        <div className="bg-white border border-[#e6e9ee] rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2"><Tag size={16} className="text-brand-500" /> Top Brands by Revenue</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={brandData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                <XAxis type="number" tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#4b5563' }} width={100} />
                <RechartsTooltip 
                  formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white border border-[#e6e9ee] rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2"><Package size={16} className="text-fuchsia-500" /> Revenue by Category</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any) => formatCurrency(Number(value) || 0)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Products */}
        <div className="bg-white border border-[#e6e9ee] rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-green-500" /> Top 5 Products</h3>
          <div className="space-y-4">
            {data?.by_product?.slice(0, 5).map((p: any, i: number) => (
              <div key={i} className="flex justify-between items-center pb-3 border-b border-border-subtle last:border-0 last:pb-0">
                <div className="truncate pr-4">
                  <p className="text-xs font-medium text-ink-900 truncate">{p.product_name}</p>
                  <p className="text-[10px] text-ink-500">{p.qty} units sold</p>
                </div>
                <div className="font-semibold text-xs text-ink-900">{formatCurrency(p.amount)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top DSEs */}
        <div className="bg-white border border-[#e6e9ee] rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2"><Users size={16} className="text-amber-500" /> Sales Exec Leaderboard</h3>
          <div className="space-y-4">
            {data?.by_dse?.slice(0, 5).map((d: any, i: number) => (
              <div key={i} className="flex justify-between items-center pb-3 border-b border-border-subtle last:border-0 last:pb-0">
                <div className="truncate pr-4">
                  <p className="text-xs font-medium text-ink-900 truncate">{d.dse_name}</p>
                  <p className="text-[10px] text-ink-500">{d.qty} items moved</p>
                </div>
                <div className="font-semibold text-xs text-ink-900">{formatCurrency(d.amount)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Routes */}
        <div className="bg-white border border-[#e6e9ee] rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2"><Map size={16} className="text-indigo-500" /> Route Performance</h3>
          <div className="space-y-4">
            {data?.by_route?.slice(0, 5).map((r: any, i: number) => (
              <div key={i} className="flex justify-between items-center pb-3 border-b border-border-subtle last:border-0 last:pb-0">
                <div className="truncate pr-4">
                  <p className="text-xs font-medium text-ink-900 truncate">{r.route_name}</p>
                </div>
                <div className="font-semibold text-xs text-ink-900">{formatCurrency(r.amount)}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
