import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/shared/DataTable'
import { assetsApi } from '../api'
import { CreateAssetEntityModal } from './modals/CreateAssetEntityModal'
import { AssetVendorProfileDrawer } from './AssetVendorProfileDrawer'

export function AssetVendors() {
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<any>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  const { data: entities, isLoading, isError } = useQuery({
    queryKey: ['asset-entities'],
    queryFn: () => assetsApi.getAssetEntities()
  })

  const columns = useMemo(() => [
    { header: 'Entity Name', accessorKey: 'entity_name' },
    { header: 'Type', accessorKey: 'entity_type' },
    { header: 'Email', accessorKey: 'email' },
    { header: 'Contact', accessorKey: 'contact_number' },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <button 
            onClick={() => { setSelectedVendor(row.original); setProfileOpen(true) }}
            className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 tooltip-trigger"
            title="View Ledger & Profile"
          >
            <User size={14} />
          </button>
        </div>
      )
    }
  ], [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
        <h3 className="font-medium text-ink-900">Asset Entities</h3>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          New Entity
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border-subtle overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-ink-500">Loading entities...</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500">Failed to load entities.</div>
        ) : (
          <DataTable data={entities || []} columns={columns} />
        )}
      </div>

      <CreateAssetEntityModal 
        open={createOpen} 
        onClose={() => setCreateOpen(false)} 
      />
      <AssetVendorProfileDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        vendor={selectedVendor}
      />
    </div>
  )
}
