import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Plus, Upload, SlidersHorizontal } from 'lucide-react'
import { useProducts } from './hooks'
import { ProductViewDrawer } from './components/ProductViewDrawer'
import { StockAdjustModal } from './components/StockAdjustModal'
import type { Product } from './types'
import { formatCurrency } from '@/lib/utils'
import { getFilteredRowModel, getCoreRowModel, useReactTable } from '@tanstack/react-table'

export default function ItemsPage() {
  const { data, isLoading, isError } = useProducts()
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      { accessorKey: 'product_name', header: 'Product Name' },
      { accessorKey: 'product_code', header: 'Code', cell: (c) => c.getValue() || '—' },
      { accessorKey: 'brand_name', header: 'Brand', cell: (c) => c.getValue() || '—' },
      { accessorKey: 'category_name', header: 'Category', cell: (c) => c.getValue() || '—' },
      {
        accessorKey: 'current_stock',
        header: 'Stock',
        cell: (c) => {
          const val = Number(c.getValue())
          return (
            <span className={`font-mono-figures font-medium ${val <= 0 ? 'text-danger-600' : 'text-ink-900'}`}>
              {val || 0}
            </span>
          )
        },
      },
      {
        accessorKey: 'mrp',
        header: 'MRP',
        cell: (c) => <span className="font-mono-figures">{formatCurrency(c.getValue() as number)}</span>,
      },
      {
        accessorKey: 'retail_rate',
        header: 'Retail Rate',
        cell: (c) => <span className="font-mono-figures">{formatCurrency(c.getValue() as number)}</span>,
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: (c) => {
          const v = c.getValue() as boolean
          return <Badge tone={v ? 'success' : 'neutral'}>{v ? 'Active' : 'Inactive'}</Badge>
        },
      },
    ],
    []
  )

  const handleRowClick = (row: Product) => {
    setEditing(row)
    setDrawerOpen(true)
  }

  const handleAddProduct = () => {
    setEditing(null)
    setDrawerOpen(true)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Products & Items"
        description="Manage your product catalog, pricing, and stock levels."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setAdjustModalOpen(true)}>
              <SlidersHorizontal className="h-4 w-4 mr-2" /> Adjust Stock
            </Button>
            <Button variant="secondary">
              <Upload className="h-4 w-4 mr-2" /> Import
            </Button>
            <Button onClick={handleAddProduct}>
              <Plus className="h-4 w-4 mr-2" /> New Product
            </Button>
          </div>
        }
      />

      <DataTable
        data={data || []}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        emptyTitle="No products found"
        emptyDescription="Add your first product or bulk import your catalog."
        onRowClick={handleRowClick}
        globalFilter={search}
        onGlobalFilterChange={setSearch}
        searchPlaceholder="Search by name, code, brand..."
      />

      {drawerOpen && (
        <ProductViewDrawer 
          open={drawerOpen} 
          onClose={() => setDrawerOpen(false)} 
          product={editing} 
        />
      )}

      {adjustModalOpen && (
        <StockAdjustModal
          open={adjustModalOpen}
          onClose={() => setAdjustModalOpen(false)}
        />
      )}
    </div>
  )
}
