import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/shared/DataTable'
import { assetsApi } from '../api'

export function AssetCategories() {
  const { data: entities, isLoading, isError } = useQuery({
    queryKey: ['asset-entities'],
    queryFn: () => assetsApi.getAssetEntities()
  })

  const columns = useMemo(() => [
    { header: 'Category Name', accessorKey: 'entity_name' },
    { header: 'Depreciation Rate (%)', accessorKey: 'depreciation_rate' },
    { header: 'Depreciation Method', accessorKey: 'depreciation_method' },
    { header: 'Status', accessorKey: 'status' }
  ], [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
        <h3 className="font-medium text-ink-900">Asset Categories</h3>
        <Button size="sm" className="gap-2">
          <Plus size={16} />
          New Category
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border-subtle overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-ink-500">Loading categories...</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500">Failed to load categories.</div>
        ) : (
          <DataTable data={entities || []} columns={columns} />
        )}
      </div>
    </div>
  )
}
