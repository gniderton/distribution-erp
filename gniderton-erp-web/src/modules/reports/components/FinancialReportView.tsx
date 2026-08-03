import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../api'
import { DataTable } from '@/components/shared/DataTable'
import { Skeleton } from '@/components/ui/Skeleton'

type FinancialReportType = 'pnl' | 'balanceSheet' | 'cashFlow'

interface FinancialReportViewProps {
  type: FinancialReportType
}

export function FinancialReportView({ type }: FinancialReportViewProps) {
  // Determine which API to call based on the report type
  const fetchFn = {
    pnl: reportsApi.profitAndLoss,
    balanceSheet: reportsApi.balanceSheet,
    cashFlow: reportsApi.cashFlow,
  }[type]

  const { data, isLoading, error } = useQuery({
    queryKey: ['financial-report', type],
    queryFn: fetchFn
  })

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>
  if (error) return <div className="p-4 text-red-600 bg-red-50 rounded-lg">Failed to load report data.</div>

  const reportData = Array.isArray(data) ? data : data?.data || data?.results || []

  if (!reportData || reportData.length === 0) {
    return <div className="p-12 text-center text-ink-500 bg-surface rounded-lg">No data available for this report.</div>
  }

  // Derive columns from the first object
  const firstRow = reportData[0] || {}
  const columns = Object.keys(firstRow).map(key => ({
    header: key.replace(/_/g, ' ').toUpperCase(),
    accessorKey: key
  }))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-ink-900">
          {type === 'pnl' ? 'Profit & Loss Statement' : type === 'balanceSheet' ? 'Balance Sheet' : 'Cash Flow Statement'}
        </h3>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-sm font-medium text-ink-700 bg-white border border-border-subtle rounded hover:bg-surface transition">
            Export CSV
          </button>
        </div>
      </div>
      
      <div className="rounded-xl overflow-hidden border border-border-subtle bg-white">
        <DataTable 
          data={reportData} 
          columns={columns} 
        />
      </div>
    </div>
  )
}
