import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
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

  // Fetch all lines (up to 5000) for the date period. We filter the rest client-side.
  const { data: rawLines, isLoading, error } = useQuery({
    queryKey: ['sales-lines', dateParams],
    queryFn: () => reportsApi.salesLines(dateParams)
  })

  // Apply Client-Side Filters
  const filteredLines = useMemo(() => {
    if (!rawLines) return []
    return rawLines.filter((line: any) => {
      if (brandFilter !== 'all' && line.brand !== brandFilter) return false
      if (categoryFilter !== 'all' && line.category !== categoryFilter) return false
      if (dseFilter !== 'all' && line.dse_name !== dseFilter) return false
      if (routeFilter !== 'all' && line.route_name !== routeFilter) return false
      
      if (search) {
        const query = search.toLowerCase()
        const matches = (
          line.invoice_no?.toLowerCase().includes(query) ||
          line.customer?.toLowerCase().includes(query) ||
          line.product?.toLowerCase().includes(query) ||
          line.sku?.toLowerCase().includes(query)
        )
        if (!matches) return false
      }
      return true
    })
  }, [rawLines, search, brandFilter, categoryFilter, dseFilter, routeFilter])

  // Compute Cards
  const stats = useMemo(() => {
    let totalTaxable = 0
    const brandSales: Record<string, number> = {}
    const dseSales: Record<string, number> = {}

    filteredLines.forEach((line: any) => {
      const val = Number(line.taxable) || 0
      totalTaxable += val

      if (line.brand) {
        brandSales[line.brand] = (brandSales[line.brand] || 0) + val
      }
      if (line.dse_name) {
        dseSales[line.dse_name] = (dseSales[line.dse_name] || 0) + val
      }
    })

    // Find top brand
    const topBrand = Object.entries(brandSales).sort((a, b) => b[1] - a[1])[0]
    // Find top DSE
    const topDse = Object.entries(dseSales).sort((a, b) => b[1] - a[1])[0]

    return {
      totalTaxable,
      topBrandName: topBrand ? topBrand[0] : 'N/A',
      topBrandValue: topBrand ? topBrand[1] : 0,
      topDseName: topDse ? topDse[0] : 'N/A',
      topDseValue: topDse ? topDse[1] : 0
    }
  }, [filteredLines])

  // Derive Table Columns
  const columns = useMemo(() => {
    if (!filteredLines || filteredLines.length === 0) return []
    return Object.keys(filteredLines[0])
      .filter(key => key !== 'status')
      .map(key => ({
        header: key.replace(/_/g, ' ').toUpperCase(),
        accessorKey: key
      }))
  }, [filteredLines])

  const handleExportCSV = () => {
    if (filteredLines.length === 0) return
    const headers = Object.keys(filteredLines[0]).filter(k => k !== 'status').join(',')
    const rows = filteredLines.map((row: any) => 
      Object.keys(row)
        .filter(k => k !== 'status')
        .map(key => {
          const val = row[key]
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
        }).join(',')
    )
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `sales_lines_export.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>
  if (error) return <div className="p-4 text-red-600 bg-red-50 rounded-lg">Failed to load sales lines data.</div>

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Taxable Sales (Filtered)" value={formatCurrency(stats.totalTaxable)} icon={DollarSign} tone="success" />
        <StatCard label={`Top Brand: ${stats.topBrandName}`} value={formatCurrency(stats.topBrandValue)} icon={Tag} tone="neutral" />
        <StatCard label={`Top DSE: ${stats.topDseName}`} value={formatCurrency(stats.topDseValue)} icon={Users} tone="neutral" />
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
        {filteredLines.length > 0 ? (
          <DataTable 
            data={filteredLines} 
            columns={columns} 
          />
        ) : (
          <div className="p-12 text-center text-ink-500 bg-surface">No sales lines match your filters.</div>
        )}
      </div>
    </div>
  )
}
