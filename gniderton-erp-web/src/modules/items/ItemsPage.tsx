import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Plus, Upload } from 'lucide-react'
import { useProducts } from './hooks'
import { ProductFormDrawer } from './components/ProductFormDrawer'
import type { Product } from './types'
import { formatCurrency } from '@/lib/utils'

export default function ItemsPage() {
  const { data, isLoading, isError } = useProducts()
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      { accessorKey: 'name', header: 'Product' },
      { accessorKey: 'sku', header: 'SKU', cell: (c) => c.getValue() || '—' },
      { accessorKey: 'brand', header: 'Brand', cell: (c) => c.getValue() || '—' },
      { accessorKey: 'category', header: 'Category', cell: (c) => c.getValue() || '—' },
      {
        accessorKey: 'stock_qty',
        header: 'Stock',
        cell: (c) => <span className="font-mono-figures">{(c.getValue() as number) ?? 0}</span>,
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: (c) => <span className="font-mono-figures">{formatCurrency(c.getValue() as number)}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (c) => {
          const v = (c.getValue() as string) || 'active'
          return <Badge tone={v === 'active' ? 'success' : 'neutral'}>{v}</Badge>
        },
      },
    ],
    []
  )

  return (
    <div>
      <PageHeader
        eyebrow="ITM · Stock"
        title="Items"
        description="Product catalog, stock levels, and batch tracking."
        actions={
          <>
            <Button variant="secondary"><Upload className="h-4 w-4" /> Bulk import</Button>
            <Button onClick={() => { setEditing(null); setDrawerOpen(true) }}>
              <Plus className="h-4 w-4" /> New product
            </Button>
          </>
        }
      />

      <DataTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        emptyTitle="No products yet"
        emptyDescription="Add your first product or bulk import your catalog."
        onRowClick={(row) => { setEditing(row); setDrawerOpen(true) }}
        globalFilter={search}
        onGlobalFilterChange={setSearch}
        searchPlaceholder="Search products…"
      />

      <ProductFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} product={editing} />
    </div>
  )
}
