import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, User, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/shared/DataTable'
import { assetsApi } from '../api'
import { CreateAssetEntityModal } from './modals/CreateAssetEntityModal'
import { EditAssetEntityModal } from './modals/EditAssetEntityModal'
import { AssetVendorProfileDrawer } from './AssetVendorProfileDrawer'

export function AssetVendors() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<any>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  const { data: entities, isLoading, isError } = useQuery({
    queryKey: ['asset-entities'],
    queryFn: () => assetsApi.getAssetEntities()
  })

  const columns = useMemo(() => [
    { header: 'Vendor Name', accessorKey: 'entity_name' },
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
          <button 
            onClick={() => { setSelectedVendor(row.original); setEditOpen(true) }}
            className="p-1.5 text-amber-600 bg-amber-50 rounded hover:bg-amber-100 tooltip-trigger"
            title="Edit Vendor"
          >
            <Edit2 size={14} />
          </button>
        </div>
      )
    }
  ], [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
        <h3 className="font-medium text-ink-900">Asset Vendors</h3>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          New Vendor
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border-subtle overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-ink-500">Loading vendors...</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500">Failed to load vendors.</div>
        ) : (
          <DataTable data={entities || []} columns={columns} />
        )}
      </div>

      <CreateAssetEntityModal 
        open={createOpen} 
        onClose={() => setCreateOpen(false)} 
      />
      <EditAssetEntityModal 
        open={editOpen} 
        onClose={() => setEditOpen(false)} 
        entity={selectedVendor}
      />
      <AssetVendorProfileDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        vendor={selectedVendor}
      />
    </div>
  )
}
