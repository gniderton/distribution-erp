import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus, Settings2, FileText, User, ShoppingCart, DollarSign, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/shared/DataTable'
import { formatCurrency } from '@/lib/utils'
import { assetsApi } from '../api'
import { AssetProfileDrawer } from './AssetProfileDrawer'
import { ScrapAssetModal } from './modals/ScrapAssetModal'

import { PurchaseAssetModal } from './modals/PurchaseAssetModal'
import { DepreciationModal } from './modals/DepreciationModal'
import { SellAssetModal } from './modals/SellAssetModal'

export function AssetRegister() {
  const { data: assets, isLoading, isError, refetch } = useQuery({
    queryKey: ['assets'],
    queryFn: () => assetsApi.getAssets()
  })

  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [scrapOpen, setScrapOpen] = useState(false)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [depreciationOpen, setDepreciationOpen] = useState(false)
  const [sellOpen, setSellOpen] = useState(false)

  const columns = useMemo(() => [
    { header: 'Asset Name', accessorKey: 'asset_name' },
    { header: 'Category', accessorKey: 'category' },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: (info: any) => {
        const val = info.getValue()
        const color = val === 'Active' ? 'bg-emerald-100 text-emerald-800' : 
                      val === 'Sold' ? 'bg-amber-100 text-amber-800' : 
                      val === 'Scrapped' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{val}</span>
      }
    },
    { header: 'Custodian', accessorKey: 'custodian', cell: (i: any) => i.getValue() || <span className="text-ink-400">Unassigned</span> },
    { header: 'Purchase Date', accessorKey: 'purchase_date', cell: (i: any) => i.getValue() ? format(new Date(i.getValue()), 'MMM dd, yyyy') : '-' },
    { header: 'Purchase Cost', accessorKey: 'purchase_cost', cell: (i: any) => formatCurrency(i.getValue()) },
    { header: 'Current Value', accessorKey: 'net_book_value', cell: (i: any) => formatCurrency(i.getValue()) },
    { header: 'Payable', accessorKey: 'balance_payable', cell: (i: any) => <span className={i.getValue() > 0 ? "text-red-600 font-medium" : ""}>{formatCurrency(i.getValue())}</span> },
    { 
      header: 'Actions', 
      id: 'actions',
      cell: ({ row }: any) => {
        const asset = row.original
        return (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setSelectedAsset(asset); setProfileOpen(true) }}
              className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 tooltip-trigger"
              title="Profile & Documents"
            >
              <User size={14} />
            </button>
            {asset.balance_payable > 0 && (
              <button className="p-1.5 text-rose-600 bg-rose-50 rounded hover:bg-rose-100" title="Make Payment">
                <DollarSign size={14} />
              </button>
            )}
            {asset.status === 'Active' && (
              <>
                <button 
                  onClick={() => { setSelectedAsset(asset); setSellOpen(true) }}
                  className="p-1.5 text-amber-600 bg-amber-50 rounded hover:bg-amber-100" 
                  title="Sell Asset"
                >
                  <ShoppingCart size={14} />
                </button>
                <button 
                  onClick={() => { setSelectedAsset(asset); setScrapOpen(true) }}
                  className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100" 
                  title="Scrap Asset"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        )
      }
    }
  ], [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
        <h3 className="font-medium text-ink-900 flex items-center gap-2">
          Asset Register 
          <span className="bg-ink-100 text-ink-600 px-2 py-0.5 rounded-full text-xs font-semibold">
            {assets?.length || 0}
          </span>
        </h3>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" className="gap-2" onClick={() => setDepreciationOpen(true)}>
            <Settings2 size={16} />
            Run Depreciation
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setPurchaseOpen(true)}>
            <Plus size={16} />
            Purchase Asset
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border-subtle overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-ink-500">Loading assets...</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500">Failed to load assets.</div>
        ) : (
          <DataTable data={assets || []} columns={columns} />
        )}
      </div>

      <AssetProfileDrawer 
        open={profileOpen} 
        onClose={() => { setProfileOpen(false); setSelectedAsset(null); }} 
        asset={selectedAsset} 
      />

      <ScrapAssetModal 
        open={scrapOpen} 
        onClose={() => { setScrapOpen(false); setSelectedAsset(null); }} 
        asset={selectedAsset} 
        onSuccess={() => refetch()}
      />

      <PurchaseAssetModal
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        onSuccess={() => refetch()}
      />

      <DepreciationModal
        open={depreciationOpen}
        onClose={() => setDepreciationOpen(false)}
        onSuccess={() => refetch()}
      />

      <SellAssetModal
        open={sellOpen}
        onClose={() => { setSellOpen(false); setSelectedAsset(null); }}
        asset={selectedAsset}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
