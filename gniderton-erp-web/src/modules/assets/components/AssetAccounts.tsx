import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/shared/DataTable'
import { assetsApi } from '../api'
import { CreateAccountModal } from './modals/CreateAccountModal'

export function AssetAccounts() {
  const [createOpen, setCreateOpen] = useState(false)

  const { data: accounts, isLoading, isError } = useQuery({
    queryKey: ['asset-accounts-list'],
    queryFn: () => assetsApi.getAssetsAccounts()
  })

  const columns = useMemo(() => [
    { header: 'Account Code', accessorKey: 'code' },
    { header: 'Account Name', accessorKey: 'name' }
  ], [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
        <h3 className="font-medium text-ink-900">Asset Accounts</h3>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          New Account
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border-subtle overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-ink-500">Loading accounts...</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500">Failed to load accounts.</div>
        ) : (
          <DataTable data={accounts || []} columns={columns} />
        )}
      </div>

      <CreateAccountModal 
        open={createOpen} 
        onClose={() => setCreateOpen(false)} 
      />
    </div>
  )
}
