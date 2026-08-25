import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Search, Filter, Store, DollarSign, CheckCircle2, TrendingUp, Download, Tag } from 'lucide-react'
import { reportsApi } from '../api'
import { itemsApi } from '@/modules/items/api'
import { DataTable } from '@/components/shared/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import * as XLSX from 'xlsx'

export function PurchaseAnalyticsDashboard() {
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [vendorFilter, setVendorFilter] = useState('all')

  // Fetch Lookups
  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: itemsApi.vendors })

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
    vendor_id: vendorFilter !== 'all' ? vendorFilter : undefined,
  }

  // Fetch from backend
  const { data: rawLines, isLoading, error } = useQuery({
    queryKey: ['purchase-lines', queryParams],
    queryFn: () => reportsApi.purchaseInvoiceLines(queryParams)
  })

  // Client-side search and mapping
  const filteredLines = useMemo(() => {
    if (!rawLines) return []
    let list = rawLines.map((line: any) => ({
      ...line,
      received_date: line.received_date ? format(new Date(line.received_date), 'MMM dd, yyyy') : line.received_date,
      vendor_invoice_date: line.vendor_invoice_date ? format(new Date(line.vendor_invoice_date), 'MMM dd, yyyy') : line.vendor_invoice_date,
    }))

    if (search) {
      const q = search.toLowerCase()
      list = list.filter((l: any) => 
        l.product_name?.toLowerCase().includes(q) ||
        l.invoice_number?.toLowerCase().includes(q) ||
        l.vendor_invoice_number?.toLowerCase().includes(q) ||
        l.product_code?.toLowerCase().includes(q) ||
        l.vendor_name?.toLowerCase().includes(q) ||
        l.brand_name?.toLowerCase().includes(q)
      )
    }
    return list
  }, [rawLines, search])

  // Derive Summary Stats from filtered lines
  const stats = useMemo(() => {
    let totalTaxable = 0
    let totalTax = 0
    let totalGrand = 0
    let totalLines = filteredLines.length

    filteredLines.forEach((l: any) => {
      totalTaxable += Number(l.taxable_amount || 0)
      totalTax += Number(l.tax_amount || 0)
      totalGrand += Number(l.net_amount || 0)
    })

    return { totalTaxable, totalTax, totalGrand, totalLines }
  }, [filteredLines])

  // Derive Table Columns
  const columns = useMemo(() => {
    return [
      { header: 'INVOICE', accessorKey: 'invoice_number' },
      { header: 'VENDOR', accessorKey: 'vendor_name' },
      { header: 'RECEIVED DATE', accessorKey: 'received_date' },
      { header: 'PRODUCT', accessorKey: 'product_name' },
      { header: 'BRAND', accessorKey: 'brand_name' },
      { header: 'QTY', accessorKey: 'accepted_qty' },
      { header: 'RATE', accessorKey: 'rate' },
      { header: 'TAX', accessorKey: 'tax_amount' },
      { header: 'NET AMOUNT', accessorKey: 'net_amount' }
    ]
  }, [])

  const handleExportExcel = () => {
    if (!filteredLines || filteredLines.length === 0) {
      alert("No data to export")
      return
    }

    const exportData = filteredLines.map((r: any) => ({
      'Invoice #': r.invoice_number,
      'Vendor Invoice #': r.vendor_invoice_number,
      'Received Date': r.received_date,
      'Vendor Invoice Date': r.vendor_invoice_date,
      'Vendor Name': r.vendor_name,
      'Product Code': r.product_code,
      'Product Name': r.product_name,
      'Brand': r.brand_name,
      'Batch Code': r.batch_code,
      'Accepted Qty': Number(r.accepted_qty),
      'Rate': Number(r.rate),
      'Taxable Amount': Number(r.taxable_amount),
      'Tax %': Number(r.tax_percentage),
      'Tax Amount': Number(r.tax_amount),
      'Net Amount': Number(r.net_amount)
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Lines")
    XLSX.writeFile(wb, "Purchase_Analytics_Raw_Data.xlsx")
  }

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>
  if (error) return <div className="p-4 text-red-600 bg-red-50 rounded-lg">Failed to load purchase lines data.</div>

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Items (Lines)" value={String(stats.totalLines)} icon={Tag} tone="neutral" />
        <StatCard label="Total Taxable" value={formatCurrency(stats.totalTaxable)} icon={DollarSign} tone="success" />
        <StatCard label="Total Tax" value={formatCurrency(stats.totalTax)} icon={TrendingUp} tone="neutral" />
        <StatCard label="Grand Total Value" value={formatCurrency(stats.totalGrand)} icon={CheckCircle2} tone="success" />
      </div>

      <div className="glass-card p-4 rounded-xl border border-[#e6e9ee] bg-white shadow-sm flex flex-col xl:flex-row gap-4 items-center justify-between w-full">
        <div className="relative w-full xl:max-w-md">
          <Search className="absolute left-3.5 top-3 text-ink-600" size={15} />
          <input 
            type="text" 
            placeholder="Search lines by invoice, vendor, product, brand..." 
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
            <Store size={12} className="text-ink-600" />
            <select
              value={vendorFilter}
              onChange={e => setVendorFilter(e.target.value)}
              className="bg-transparent text-xs text-ink-900 focus:outline-none pr-2 cursor-pointer max-w-[120px] truncate"
            >
              <option value="all">All Vendors</option>
              {vendors?.map((v: any) => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
            </select>
          </div>
          
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
          >
            <Download size={12} />
            Export Excel
          </button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-border-subtle bg-white">
        {filteredLines.length > 0 ? (
          <>
            <div className="px-4 py-2 bg-emerald-50 border-b border-border-subtle text-xs text-emerald-700 font-medium flex justify-between">
              <span>Showing {filteredLines.length} filtered purchase lines.</span>
              <span>Use Export Excel to download the complete raw dataset.</span>
            </div>
            <DataTable 
              data={filteredLines} 
              columns={columns} 
            />
          </>
        ) : (
          <div className="p-12 text-center text-ink-500 bg-surface">No purchase lines match your filters.</div>
        )}
      </div>
    </div>
  )
}
