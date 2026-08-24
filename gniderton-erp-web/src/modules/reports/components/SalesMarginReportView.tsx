import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/shared/DataTable'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/Button'
import { Input, Select, Label } from '@/components/ui/Input'
import { Download, TrendingUp, DollarSign, Package, PieChart } from 'lucide-react'
import { reportsApi } from '../api'
import { useBrands, useCategories } from '@/modules/items/hooks'

export function SalesMarginReportView() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [brandId, setBrandId] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const { data: brands = [] } = useBrands()
  const { data: categories = [] } = useCategories()

  // limit: 0 to fetch all for aggregation
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['sales-margin', startDate, endDate, brandId, categoryId],
    queryFn: () => reportsApi.salesInvoiceLines({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      brand_id: brandId === 'all' ? undefined : brandId || undefined,
      category_id: categoryId === 'all' ? undefined : categoryId || undefined,
      limit: 0
    })
  })

  // Ensure data is array
  const rows = Array.isArray(data) ? data : []

  const stats = useMemo(() => {
    let taxable = 0
    let cogs = 0
    let marginAmt = 0

    rows.forEach((r: any) => {
      taxable += Number(r.taxable_sales_value || 0)
      cogs += Number(r.cogs || 0)
      marginAmt += Number(r.margin_amount || 0)
    })

    const marginPct = taxable > 0 ? (marginAmt / taxable) * 100 : 0

    return {
      taxable,
      cogs,
      marginAmt,
      marginPct
    }
  }, [rows])

  const brandMargins = useMemo(() => {
    const map = new Map<string, { brand: string, net_sales: number, margin: number }>()
    rows.forEach((r: any) => {
      const b = r.brand_name || 'Unknown'
      const existing = map.get(b) || { brand: b, net_sales: 0, margin: 0 }
      existing.net_sales += Number(r.taxable_sales_value || 0)
      existing.margin += Number(r.margin_amount || 0)
      map.set(b, existing)
    })
    return Array.from(map.values()).map(x => ({
      brand: x.brand,
      net_sales: x.net_sales.toFixed(2),
      margin_amount: x.margin.toFixed(2),
      margin_percent: x.net_sales > 0 ? ((x.margin / x.net_sales) * 100).toFixed(2) + '%' : '0%'
    }))
  }, [rows])

  const categoryMargins = useMemo(() => {
    const map = new Map<string, { category: string, net_sales: number, margin: number }>()
    rows.forEach((r: any) => {
      const c = r.category_name || 'Unknown'
      const existing = map.get(c) || { category: c, net_sales: 0, margin: 0 }
      existing.net_sales += Number(r.taxable_sales_value || 0)
      existing.margin += Number(r.margin_amount || 0)
      map.set(c, existing)
    })
    return Array.from(map.values()).map(x => ({
      category: x.category,
      net_sales: x.net_sales.toFixed(2),
      margin_amount: x.margin.toFixed(2),
      margin_percent: x.net_sales > 0 ? ((x.margin / x.net_sales) * 100).toFixed(2) + '%' : '0%'
    }))
  }, [rows])

  const top10Amt = useMemo(() => {
    const map = new Map<string, { product: string, margin: number }>()
    rows.forEach((r: any) => {
      const p = r.product_name || 'Unknown'
      const existing = map.get(p) || { product: p, margin: 0 }
      existing.margin += Number(r.margin_amount || 0)
      map.set(p, existing)
    })
    return Array.from(map.values())
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10)
      .map(x => ({
        product: x.product,
        margin_amount: x.margin.toFixed(2)
      }))
  }, [rows])

  const top10Pct = useMemo(() => {
    const map = new Map<string, { product: string, net_sales: number, margin: number }>()
    rows.forEach((r: any) => {
      const p = r.product_name || 'Unknown'
      const existing = map.get(p) || { product: p, net_sales: 0, margin: 0 }
      existing.net_sales += Number(r.taxable_sales_value || 0)
      existing.margin += Number(r.margin_amount || 0)
      map.set(p, existing)
    })
    return Array.from(map.values())
      .filter(x => x.net_sales > 0)
      .map(x => ({ product: x.product, pct: (x.margin / x.net_sales) * 100 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 10)
      .map(x => ({
        product: x.product,
        margin_percent: x.pct.toFixed(2) + '%'
      }))
  }, [rows])

  const handleDownloadCSV = () => {
    if (!rows.length) return
    const headers = Object.keys(rows[0]).join(',')
    const csvRows = rows.map((r: any) => Object.values(r).map(v => `"${v}"`).join(','))
    const csvContent = [headers, ...csvRows].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `sales_margin_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return <div className="p-4 text-red-500 bg-red-50 rounded-md">Error loading report data.</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <Label>Start Date</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="flex-1">
          <Label>End Date</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="flex-1">
          <Label>Brand</Label>
          <Select value={brandId} onChange={e => setBrandId(e.target.value)}>
            <option value="all">All Brands</option>
            {brands.map((b: any) => (
              <option key={b.id} value={b.id}>{b.brand_name}</option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <Label>Category</Label>
          <Select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.category_name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Button variant="secondary" onClick={handleDownloadCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Taxable Sales"
          value={`₹${stats.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
        />
        <StatCard
          label="Total COGS"
          value={`₹${stats.cogs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Package}
        />
        <StatCard
          label="Total Margin Amt"
          value={`₹${stats.marginAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={TrendingUp}
        />
        <StatCard
          label="Overall Margin %"
          value={`${stats.marginPct.toFixed(2)}%`}
          icon={PieChart}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-4 overflow-hidden">
          <h3 className="font-semibold text-ink-900 mb-4">Margin by Brand</h3>
          <DataTable 
            columns={[{ header: 'Brand', accessorKey: 'brand' }, { header: 'Net Sales', accessorKey: 'net_sales' }, { header: 'Margin Amt', accessorKey: 'margin_amount' }, { header: 'Margin %', accessorKey: 'margin_percent' }]} 
            data={brandMargins} 
          />
        </div>
        
        <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-4 overflow-hidden">
          <h3 className="font-semibold text-ink-900 mb-4">Margin by Category</h3>
          <DataTable 
            columns={[{ header: 'Category', accessorKey: 'category' }, { header: 'Net Sales', accessorKey: 'net_sales' }, { header: 'Margin Amt', accessorKey: 'margin_amount' }, { header: 'Margin %', accessorKey: 'margin_percent' }]} 
            data={categoryMargins} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-4 overflow-hidden">
          <h3 className="font-semibold text-ink-900 mb-4">Top 10 Highest Margin Products (By Amount)</h3>
          <DataTable 
            columns={[{ header: 'Product', accessorKey: 'product' }, { header: 'Margin Amt', accessorKey: 'margin_amount' }]} 
            data={top10Amt} 
          />
        </div>
        
        <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-4 overflow-hidden">
          <h3 className="font-semibold text-ink-900 mb-4">Top 10 Highest Margin Products (By Percentage)</h3>
          <DataTable 
            columns={[{ header: 'Product', accessorKey: 'product' }, { header: 'Margin %', accessorKey: 'margin_percent' }]} 
            data={top10Pct} 
          />
        </div>
      </div>

    </div>
  )
}
