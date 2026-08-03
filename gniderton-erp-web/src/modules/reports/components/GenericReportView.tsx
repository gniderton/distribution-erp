import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/shared/DataTable'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/shared/StatCard'
import { Hash, Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'

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

  const [globalFilter, setGlobalFilter] = useState('')

  // Derive columns from the first object
  const firstRow = reportData[0] || {}
  const columns = Object.keys(firstRow).map(key => ({
    header: key.replace(/_/g, ' ').toUpperCase(),
    accessorKey: key
  }))

  // Auto-generate some stats
  const stats = useMemo(() => {
    if (!reportData.length) return []
    const summary = [
      { label: 'Total Rows', value: reportData.length.toString(), icon: Hash }
    ]
    
    // Find first numeric column to sum (e.g., amount, total, balance)
    const numericKey = Object.keys(firstRow).find(key => 
      ['amount', 'total', 'balance', 'qty', 'quantity'].some(term => key.toLowerCase().includes(term)) && 
      !isNaN(parseFloat(firstRow[key]))
    )

    if (numericKey) {
      const sum = reportData.reduce((acc: number, row: any) => acc + (parseFloat(row[numericKey]) || 0), 0)
      summary.push({ 
        label: `Total ${numericKey.replace(/_/g, ' ')}`, 
        value: sum.toLocaleString(undefined, { maximumFractionDigits: 2 }), 
        icon: Hash 
      })
    }
    return summary
  }, [reportData, firstRow])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
        <h3 className="text-lg font-display font-medium text-ink-900">
          {title}
        </h3>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-ink-400" />
            <Input 
              placeholder="Search all columns..." 
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <button className="px-3 py-1.5 h-9 text-sm font-medium text-ink-700 bg-white border border-border-subtle rounded hover:bg-surface transition whitespace-nowrap">
            Export CSV
          </button>
        </div>
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat, idx) => (
            <StatCard key={idx} label={stat.label} value={stat.value} icon={stat.icon} />
          ))}
        </div>
      )}
      
      <div className="rounded-xl overflow-hidden border border-border-subtle bg-white">
        <DataTable 
          data={reportData} 
          columns={columns} 
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          hideSearchBar={true} // We built a custom one above
        />
      </div>
    </div>
  )
}
