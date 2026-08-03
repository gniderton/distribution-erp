import { useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/shared/DataTable'
import { Skeleton } from '@/components/ui/Skeleton'

interface GenericReportViewProps {
  title: string
  queryKey: string
  fetchFn: () => Promise<any>
}

export function GenericReportView({ title, queryKey, fetchFn }: GenericReportViewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['generic-report', queryKey],
    queryFn: fetchFn
  })

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>
  if (error) return <div className="p-4 text-red-600 bg-red-50 rounded-lg">Failed to load {title.toLowerCase()} data.</div>

  const reportData = Array.isArray(data) ? data : data?.data || data?.results || []

  if (!reportData || reportData.length === 0) {
    return <div className="p-12 text-center text-ink-500 bg-surface rounded-lg border border-border-subtle">No data available for {title}.</div>
  }

  // Derive columns from the first object
  const firstRow = reportData[0] || {}
  const columns = Object.keys(firstRow).map(key => ({
    header: key.replace(/_/g, ' ').toUpperCase(),
    accessorKey: key
  }))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
        <h3 className="text-lg font-display font-medium text-ink-900">
          {title}
        </h3>
        <button className="px-3 py-1.5 text-sm font-medium text-ink-700 bg-white border border-border-subtle rounded hover:bg-surface transition">
          Export CSV
        </button>
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
