import { useState, useMemo } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/Badge'
import type { Product } from '../types'
import type { ColumnDef } from '@tanstack/react-table'
import { itemsApi } from '../api'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  products: Product[]
}

export function BulkStatusModal({ open, onClose, products }: Props) {
  const qc = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (filterStatus === 'active') return p.is_active
      if (filterStatus === 'inactive') return !p.is_active
      return true
    })
  }, [products, filterStatus])

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="rounded border-border-subtle"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="rounded border-border-subtle"
          />
        ),
      },
      { accessorKey: 'product_name', header: 'Product Name' },
      { accessorKey: 'brand_name', header: 'Brand' },
      { 
        accessorKey: 'purchase_rate', 
        header: 'Purchase Price',
        cell: (c) => `₹${Number(c.getValue() || 0).toFixed(2)}`
      },
      {
        accessorKey: 'is_active',
        header: 'Current Status',
        cell: (c) => {
          const v = c.getValue() as boolean
          return <Badge tone={v ? 'success' : 'neutral'}>{v ? 'Active' : 'Inactive'}</Badge>
        },
      }
    ],
    []
  )

  const selectedIdsList = Object.keys(selectedIds).filter(k => selectedIds[k])
  const selectedCount = selectedIdsList.length
  
  // Determine smart action based on selected products (using row index from the filtered array)
  const selectedProducts = selectedIdsList.map(index => filteredProducts[parseInt(index)])
  const hasActive = selectedProducts.some(p => p?.is_active)
  const targetAction = hasActive ? 'inactive' : 'active'
  const buttonText = hasActive ? 'Deactivate Selected' : 'Activate Selected'
  
  const handleToggle = async () => {
    if (selectedCount === 0) return
    
    // We need the actual product IDs to send to the backend
    const actualIds = selectedProducts.map(p => p.id)
    
    setLoading(true)
    try {
      await itemsApi.bulkStatus({ ids: actualIds, status: targetAction })
      toast.success(`Successfully marked ${selectedCount} products as ${targetAction}`)
      qc.invalidateQueries({ queryKey: ['products'] })
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Bulk Status Edit" widthClass="max-w-4xl">
      <div className="mb-4 text-sm text-ink-600 flex justify-between items-center">
        <span>Select products below to bulk activate or deactivate them.</span>
        <div className="flex bg-ink-100 rounded-lg p-1">
          <button 
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterStatus === 'all' ? 'bg-white shadow text-ink-900' : 'text-ink-500 hover:text-ink-700'}`}
            onClick={() => setFilterStatus('all')}
          >
            All
          </button>
          <button 
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterStatus === 'active' ? 'bg-white shadow text-ink-900' : 'text-ink-500 hover:text-ink-700'}`}
            onClick={() => setFilterStatus('active')}
          >
            Active
          </button>
          <button 
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterStatus === 'inactive' ? 'bg-white shadow text-ink-900' : 'text-ink-500 hover:text-ink-700'}`}
            onClick={() => setFilterStatus('inactive')}
          >
            Inactive
          </button>
        </div>
      </div>
      
      <div className="max-h-[50vh] overflow-auto border border-border-subtle rounded-lg">
        <DataTable
          data={filteredProducts}
          columns={columns}
          rowSelection={selectedIds}
          onRowSelectionChange={setSelectedIds}
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm font-medium text-ink-700">
          {selectedCount} product{selectedCount !== 1 && 's'} selected
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button 
            onClick={handleToggle} 
            disabled={loading || selectedCount === 0}
            loading={loading}
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
