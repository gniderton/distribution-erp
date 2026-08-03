import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../api'
import { DataTable } from '@/components/shared/DataTable'
import { Skeleton } from '@/components/ui/Skeleton'

type SalesReportType = 'lines' | 'summary'

interface SalesReportViewProps {
  type: SalesReportType
}

export function SalesReportView({ type }: SalesReportViewProps) {
  const fetchFn = {
    lines: reportsApi.salesLines,
    summary: reportsApi.salesSummaryDetailed,
  }[type]

  const { data, isLoading, error } = useQuery({
    queryKey: ['sales-report', type],
    queryFn: fetchFn
  })

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>
  if (error) return <div className="p-4 text-red-600 bg-red-50 rounded-lg">Failed to load sales report data.</div>

  const reportData = Array.isArray(data) ? data : data?.data || data?.results || []

  if (!reportData || reportData.length === 0) {
    return <div className="p-12 text-center text-ink-500 bg-surface rounded-lg">No sales data available for this report.</div>
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
          {type === 'lines' ? 'Sales Lines Details' : 'Sales Summary'}
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
