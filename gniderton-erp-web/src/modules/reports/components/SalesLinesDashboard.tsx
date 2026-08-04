import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Search, Filter, Tag, Users, Map, DollarSign, CheckCircle2, TrendingUp, Download } from 'lucide-react'
import { reportsApi } from '../api'
import { customerApi } from '@/modules/customer/api'
import { itemsApi } from '@/modules/items/api'
import { DataTable } from '@/components/shared/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'

export function SalesLinesDashboard() {
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [brandFilter, setBrandFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dseFilter, setDseFilter] = useState('all')
  const [routeFilter, setRouteFilter] = useState('all')

  // Fetch Lookups
  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: itemsApi.brands })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: itemsApi.categories })
  const { data: dses } = useQuery({ queryKey: ['employees'], queryFn: customerApi.employees })
  const { data: routes } = useQuery({ queryKey: ['routes'], queryFn: customerApi.routes })

  // Determine date bounds
  const getDates = () => {
    const today = new Date()
    let start = ''
    let end = today.toISOString().split('T')[0]

    if (dateFilter === 'today') {
      start = end
    } else if (dateFilter === 'this_week') {
      const firstDay = new Date(today.setDate(today.getDate() - today.getDay()))
      start = firstDay.toISOString().split('T')[0]
    } else if (dateFilter === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
    } else if (dateFilter === 'custom') {
      start = customStartDate
      end = customEndDate
    }
    return { start_date: start || undefined, end_date: end || undefined }
  }

  const dateParams = getDates()
  
  const queryParams = {
    ...dateParams,
    brand_name: brandFilter !== 'all' ? brandFilter : undefined,
    category_name: categoryFilter !== 'all' ? categoryFilter : undefined,
    dse_name: dseFilter !== 'all' ? dseFilter : undefined,
    route_name: routeFilter !== 'all' ? routeFilter : undefined,
    search: search || undefined
  }

  // Fetch from backend (automatically limits to 50 lines, but summary is 100% accurate)
  const { data: rawResponse, isLoading, error } = useQuery({
    queryKey: ['sales-lines', queryParams],
    queryFn: () => reportsApi.salesLines(queryParams)
  })

  // Extract lines and format dates neatly
  const lines = useMemo(() => {
    if (!rawResponse?.lines) return []
    return rawResponse.lines.map((line: any) => ({
      ...line,
      date: line.date ? format(new Date(line.date), 'MMM dd, yyyy') : line.date
    }))
  }, [rawResponse])

  // Extract accurate summary from backend
  const stats = useMemo(() => {
    if (!rawResponse?.summary) return { totalTaxable: 0, totalTax: 0, totalGrand: 0, totalLines: 0 }
    return {
      totalTaxable: Number(rawResponse.summary.total_taxable) || 0,
      totalTax: Number(rawResponse.summary.total_tax) || 0,
      totalGrand: Number(rawResponse.summary.total_grand) || 0,
      totalLines: Number(rawResponse.summary.total_lines) || 0
    }
  }, [rawResponse])

  // Derive Table Columns
  const columns = useMemo(() => {
    if (!lines || lines.length === 0) return []
    return Object.keys(lines[0])
      .filter(key => key !== 'status')
      .map(key => ({
        header: key.replace(/_/g, ' ').toUpperCase(),
        accessorKey: key
      }))
  }, [lines])

  const handleExportCSV = () => {
    const p = new URLSearchParams()
    if (queryParams.start_date) p.append('start_date', queryParams.start_date)
    if (queryParams.end_date) p.append('end_date', queryParams.end_date)
    if (queryParams.brand_name) p.append('brand_name', queryParams.brand_name)
    if (queryParams.category_name) p.append('category_name', queryParams.category_name)
    if (queryParams.dse_name) p.append('dse_name', queryParams.dse_name)
    if (queryParams.route_name) p.append('route_name', queryParams.route_name)
    if (queryParams.search) p.append('search', queryParams.search)
    
    window.open(`https://distribution-erp.onrender.com/api/analytics/reports/sales-lines/export?${p.toString()}`, '_blank')
  }

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>
  if (error) return <div className="p-4 text-red-600 bg-red-50 rounded-lg">Failed to load sales lines data.</div>

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Lines (All Filtered)" value={String(stats.totalLines)} icon={Tag} tone="neutral" />
        <StatCard label="Total Taxable Sales" value={formatCurrency(stats.totalTaxable)} icon={DollarSign} tone="success" />
        <StatCard label="Total Tax Amount" value={formatCurrency(stats.totalTax)} icon={TrendingUp} tone="neutral" />
        <StatCard label="Grand Total Value" value={formatCurrency(stats.totalGrand)} icon={CheckCircle2} tone="success" />
      </div>

      <div className="glass-card p-4 rounded-xl border border-[#e6e9ee] bg-white shadow-sm flex flex-col xl:flex-row gap-4 items-center justify-between w-full">
        <div className="relative w-full xl:max-w-md">
          <Search className="absolute left-3.5 top-3 text-ink-600" size={15} />
          <input 
            type="text" 
            placeholder="Search lines by invoice, customer, product, SKU..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface border border-[#e6e9ee] rounded-lg pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-brand-400 text-ink-900 placeholder:text-ink-600"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center justify-end">
          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
            <Filter size={12} className="text-ink-600" />
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="bg-transparent text-xs text-ink-900 focus:outline-none pr-2 cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={customStartDate} 
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-surface border border-[#e6e9ee] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-400"
              />
              <span className="text-xs text-ink-500">to</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-surface border border-[#e6e9ee] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-400"
              />
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
            <Tag size={12} className="text-ink-600" />
            <select
              value={brandFilter}
              onChange={e => setBrandFilter(e.target.value)}
              className="bg-transparent text-xs text-ink-900 focus:outline-none pr-2 cursor-pointer max-w-[120px] truncate"
            >
              <option value="all">All Brands</option>
              {brands?.map((b: any) => <option key={b.id} value={b.brand_name}>{b.brand_name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-transparent text-xs text-ink-900 focus:outline-none pr-2 cursor-pointer max-w-[120px] truncate"
            >
              <option value="all">All Categories</option>
              {categories?.map((c: any) => <option key={c.id} value={c.category_name}>{c.category_name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
            <Users size={12} className="text-ink-600" />
            <select
              value={dseFilter}
              onChange={e => setDseFilter(e.target.value)}
              className="bg-transparent text-xs text-ink-900 focus:outline-none pr-2 cursor-pointer max-w-[120px] truncate"
            >
              <option value="all">All DSEs</option>
              {dses?.map((d: any) => <option key={d.id} value={d.full_name}>{d.full_name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
            <Map size={12} className="text-ink-600" />
            <select
              value={routeFilter}
              onChange={e => setRouteFilter(e.target.value)}
              className="bg-transparent text-xs text-ink-900 focus:outline-none pr-2 cursor-pointer max-w-[120px] truncate"
            >
              <option value="all">All Routes</option>
              {routes?.map((r: any) => <option key={r.id} value={r.route_name}>{r.route_name}</option>)}
            </select>
          </div>
          
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-border-subtle bg-white">
        {lines.length > 0 ? (
          <>
            <div className="px-4 py-2 bg-brand-50 border-b border-border-subtle text-xs text-brand-700 font-medium flex justify-between">
              <span>Showing latest {lines.length} lines of {stats.totalLines} total matches.</span>
              <span>Use Export CSV to download the complete dataset.</span>
            </div>
            <DataTable 
              data={lines} 
              columns={columns} 
            />
          </>
        ) : (
          <div className="p-12 text-center text-ink-500 bg-surface">No sales lines match your filters.</div>
        )}
      </div>
    </div>
  )
}
