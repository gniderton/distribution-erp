import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Search, Users, DollarSign, CheckCircle2, Download, FileSpreadsheet, Filter, X } from 'lucide-react'
import { reportsApi } from '../api'
import { DataTable } from '@/components/shared/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import * as XLSX from 'xlsx'

export function PaymentAllocationsReportView() {
  const [search, setSearch] = useState('')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const { data: rawAllocations, isLoading, error } = useQuery({
    queryKey: ['payment-allocations'],
    queryFn: () => reportsApi.paymentAllocations()
  })

  const getDates = useCallback(() => {
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
  }, [dateFilter, customStartDate, customEndDate])

  // Client-side mapping & filtering
  const filteredData = useMemo(() => {
    if (!rawAllocations) return []
    let list = [...rawAllocations]

    if (dateFilter !== 'all') {
      const { start_date, end_date } = getDates()
      if (start_date && end_date) {
        list = list.filter((a: any) => {
          if (!a.payment_date) return true
          const rawDate = new Date(a.payment_date)
          rawDate.setHours(0,0,0,0)
          const s = new Date(start_date)
          s.setHours(0,0,0,0)
          const e = new Date(end_date)
          e.setHours(23,59,59,999)
          
          return rawDate >= s && rawDate <= e
        })
      }
    }

    if (customerFilter !== 'all') {
      list = list.filter((a: any) => a.customer_name === customerFilter)
    }

    if (search) {
      const q = search.toLowerCase()
      list = list.filter((a: any) => 
        a.customer_name?.toLowerCase().includes(q) ||
        a.payment_number?.toLowerCase().includes(q) ||
        a.invoice_number?.toLowerCase().includes(q) ||
        a.transaction_ref?.toLowerCase().includes(q) ||
        a.bank_name?.toLowerCase().includes(q)
      )
    }
    
    return list.map((a: any) => ({
      ...a,
      payment_date: a.payment_date ? format(new Date(a.payment_date), 'MMM dd, yyyy') : a.payment_date,
      invoice_date: a.invoice_date ? format(new Date(a.invoice_date), 'MMM dd, yyyy') : a.invoice_date,
      allocated_at: a.allocated_at ? format(new Date(a.allocated_at), 'MMM dd, yyyy HH:mm') : a.allocated_at
    }))
  }, [rawAllocations, search, customerFilter, dateFilter, getDates])

  // Derive Summary Stats from filtered lines
  const stats = useMemo(() => {
    let totalAllocated = 0
    let totalInvoices = new Set()
    let totalCustomers = new Set()
    let totalLines = filteredData.length

    filteredData.forEach((a: any) => {
      totalAllocated += Number(a.allocated_amount || 0)
      if (a.invoice_number) totalInvoices.add(a.invoice_number)
      if (a.customer_name) totalCustomers.add(a.customer_name)
    })

    return { totalAllocated, totalInvoices: totalInvoices.size, totalCustomers: totalCustomers.size, totalLines }
  }, [filteredData])

  // Derive Table Columns
  const columns = useMemo(() => {
    return [
      { header: 'CUSTOMER', accessorKey: 'customer_name' },
      { header: 'PAYMENT REF', accessorKey: 'payment_number' },
      { header: 'PAYMENT DATE', accessorKey: 'payment_date' },
      { header: 'INVOICE REF', accessorKey: 'invoice_number' },
      { header: 'INVOICE AMT', accessorKey: 'invoice_amount' },
      { header: 'ALLOCATED AMT', accessorKey: 'allocated_amount' },
      { header: 'MODE', accessorKey: 'payment_mode' },
      { header: 'STATUS', accessorKey: 'allocation_status' }
    ]
  }, [])

  const handleExportExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      alert("No data to export")
      return
    }

    const exportData = filteredData.map((r: any) => ({
      'Customer Name': r.customer_name,
      'Payment #': r.payment_number,
      'Payment Date': r.payment_date,
      'Payment Mode': r.payment_mode,
      'Bank Name': r.bank_name,
      'Transaction Ref': r.transaction_ref,
      'Invoice #': r.invoice_number,
      'Invoice Date': r.invoice_date,
      'Invoice Amount': Number(r.invoice_amount),
      'Allocated Amount': Number(r.allocated_amount),
      'Allocation Status': r.allocation_status,
      'Allocated At': r.allocated_at
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Payment Allocations")
    XLSX.writeFile(wb, "Payment_Allocations_Report.xlsx")
  }

  const handleClearFilters = () => {
    setSearch('')
    setCustomerFilter('all')
    setDateFilter('all')
    setCustomStartDate('')
    setCustomEndDate('')
  }

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>
  if (error) return <div className="p-4 text-red-600 bg-red-50 rounded-lg">Failed to load allocation data.</div>

  // Create unique list of customers from raw data for dropdown
  const uniqueCustomers = Array.from(new Set((rawAllocations || []).map((a: any) => a.customer_name))).filter(Boolean).sort()
  const customerOptions = [
    { value: 'all', label: 'All Customers' },
    ...uniqueCustomers.map((c: any) => ({ value: c, label: c as string }))
  ]

  const hasActiveFilters = search || customerFilter !== 'all' || dateFilter !== 'all'

  return (
    <div className="space-y-6">
      
      <div className="glass-card p-4 rounded-xl border border-[#e6e9ee] bg-white shadow-sm flex flex-col xl:flex-row gap-4 items-center justify-between w-full">
        <div className="relative w-full xl:max-w-[280px]">
          <Search className="absolute left-3.5 top-3 text-ink-600" size={15} />
          <input 
            type="text" 
            placeholder="Search by invoice, payment ref, customer..." 
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

          <div className="w-[200px]">
             <SearchableSelect
                options={customerOptions}
                value={customerFilter}
                onChange={(val) => setCustomerFilter(val as string)}
                placeholder="All Customers"
             />
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-600 hover:text-ink-900 bg-surface border border-border-subtle rounded-lg hover:bg-ink-50 transition"
            >
              <X size={12} />
              Clear
            </button>
          )}
          
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
          >
            <Download size={12} />
            Export Excel
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Allocations" value={String(stats.totalLines)} icon={FileSpreadsheet} tone="neutral" />
        <StatCard label="Allocated Value" value={formatCurrency(stats.totalAllocated)} icon={DollarSign} tone="success" />
        <StatCard label="Unique Invoices Settled" value={String(stats.totalInvoices)} icon={CheckCircle2} tone="neutral" />
        <StatCard label="Customers Covered" value={String(stats.totalCustomers)} icon={Users} tone="neutral" />
      </div>

      <div className="rounded-xl overflow-hidden border border-border-subtle bg-white">
        {filteredData.length > 0 ? (
          <>
            <div className="px-4 py-2 bg-emerald-50 border-b border-border-subtle text-xs text-emerald-700 font-medium flex justify-between">
              <span>Showing {filteredData.length} filtered payment allocations.</span>
              <span>Use Export Excel to download the complete raw dataset.</span>
            </div>
            <DataTable 
              data={filteredData} 
              columns={columns} 
            />
          </>
        ) : (
          <div className="p-12 text-center text-ink-500 bg-surface">No allocations match your filters.</div>
        )}
      </div>
    </div>
  )
}
