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

  const selectedCount = Object.keys(selectedIds).filter(k => selectedIds[k]).length

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

  const handleToggle = async (status: 'active' | 'inactive') => {
    if (selectedCount === 0) return
    const ids = Object.keys(selectedIds).filter(k => selectedIds[k])
    
    setLoading(true)
    try {
      await itemsApi.bulkStatus({ ids, status })
      toast.success(`Successfully marked ${ids.length} products as ${status}`)
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
      <div className="mb-4 text-sm text-ink-600">
        Select products below to bulk activate or deactivate them. This will affect their visibility across the system (e.g. Sales Orders, Invoices).
      </div>
      
      <div className="max-h-[50vh] overflow-auto border border-border-subtle rounded-lg">
        <DataTable
          data={products}
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
            variant="secondary" 
            onClick={() => handleToggle('inactive')} 
            disabled={loading || selectedCount === 0}
          >
            Mark Inactive
          </Button>
          <Button 
            onClick={() => handleToggle('active')} 
            disabled={loading || selectedCount === 0}
          >
            Mark Active
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
