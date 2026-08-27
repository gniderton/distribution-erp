import { useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/shared/DataTable'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { assetsApi } from '../api'
import { CalendarDays } from 'lucide-react'

export function AssetDepreciations() {
  const { data: depreciations, isLoading, isError } = useQuery({
    queryKey: ['asset-depreciations'],
    queryFn: () => assetsApi.getAssetsDepreciations()
  })

  const columns = [
    { 
      header: 'Date', 
      accessorKey: 'transaction_date', 
      cell: (i: any) => i.getValue() ? format(new Date(i.getValue()), 'MMM dd, yyyy') : '-' 
    },
    { header: 'Asset Name', accessorKey: 'asset_name' },
    { header: 'Category', accessorKey: 'category' },
    { 
      header: 'Depreciation Amount', 
      accessorKey: 'amount', 
      cell: (i: any) => <span className="font-medium text-amber-600">{formatCurrency(i.getValue())}</span> 
    },
    { header: 'Remarks', accessorKey: 'remarks', cell: (i: any) => i.getValue() || '-' },
  ]

  if (isLoading) return <div className="p-8 text-center text-ink-500">Loading depreciation history...</div>
  if (isError) return <div className="p-8 text-center text-red-500">Failed to load depreciation history.</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
        <h3 className="font-medium text-ink-900 flex items-center gap-2">
          Depreciation History
          <span className="bg-ink-100 text-ink-600 px-2 py-0.5 rounded-full text-xs font-semibold">
            {depreciations?.length || 0}
          </span>
        </h3>
      </div>

      <div className="bg-white rounded-xl border border-border-subtle overflow-hidden">
        <DataTable data={depreciations || []} columns={columns} />
      </div>
    </div>
  )
}
