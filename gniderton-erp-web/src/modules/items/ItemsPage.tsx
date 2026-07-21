import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Plus, Upload, SlidersHorizontal, CheckSquare, Edit3 } from 'lucide-react'
import { useProducts, useBrands, useCategories } from './hooks'
import { ProductViewDrawer } from './components/ProductViewDrawer'
import { StockAdjustModal } from './components/StockAdjustModal'
import { BulkStatusModal } from './components/BulkStatusModal'
import { BulkPriceEditModal } from './components/BulkPriceEditModal'
import { BulkImportModal } from './components/BulkImportModal'
import type { Product } from './types'
import { formatCurrency } from '@/lib/utils'

export default function ItemsPage() {
  const { data: allProducts, isLoading, isError } = useProducts()
  const { data: brandsList } = useBrands()
  const { data: categoriesList } = useCategories()

  const [search, setSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false)
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false)
  const [bulkImportOpen, setBulkImportOpen] = useState(false)

  const [editing, setEditing] = useState<Product | null>(null)

  const filteredProducts = useMemo(() => {
    if (!allProducts) return []
    return allProducts.filter((p: Product) => {
      const matchBrand = selectedBrand ? p.brand_name === selectedBrand : true
      const matchCat = selectedCategory ? p.category_name === selectedCategory : true
      const matchStatus = statusFilter === 'all' ? true : statusFilter === 'active' ? p.is_active : !p.is_active
      return matchBrand && matchCat && matchStatus
    })
  }, [allProducts, selectedBrand, selectedCategory, statusFilter])

  const stockValuation = useMemo(() => {
    if (!filteredProducts) return 0
    return filteredProducts.reduce((sum: number, p: Product) => sum + (Number(p.current_stock) || 0) * (Number(p.retail_rate) || 0), 0)
  }, [filteredProducts])

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

  return (
    <div className="pb-12">
      <PageHeader
        eyebrow="Inventory"
        title="Products & Items"
        description="Manage your product catalog, pricing, and stock levels."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setBulkStatusOpen(true)}>
              <CheckSquare className="h-4 w-4 mr-2" /> Bulk Status
            </Button>
            <Button variant="secondary" onClick={() => setBulkPriceOpen(true)}>
              <Edit3 className="h-4 w-4 mr-2" /> Bulk Pricing
            </Button>
            <Button variant="secondary" onClick={() => setBulkImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Import
            </Button>
            <Button variant="secondary" onClick={() => setAdjustModalOpen(true)}>
              <SlidersHorizontal className="h-4 w-4 mr-2" /> Adjust Stock
            </Button>
            <Button onClick={() => { setEditing(null); setDrawerOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" /> New Product
            </Button>
          </div>
        }
      />

      {/* Analytics & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-center">
          <p className="text-sm text-ink-600 font-medium mb-1">Total Stock Valuation (Retail)</p>
          <p className="text-2xl font-bold text-ink-900 font-mono-figures">{formatCurrency(stockValuation)}</p>
          <p className="text-xs text-ink-500 mt-1">For {filteredProducts.length} filtered items</p>
        </div>
        
        <div className="md:col-span-2 flex items-center gap-4 bg-white p-5 rounded-xl border border-border-subtle shadow-sm">
          <div className="flex-1">
            <label className="block text-xs font-medium text-ink-700 mb-1">Status</label>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </Select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-ink-700 mb-1">Brand</label>
            <Select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}>
              <option value="">All Brands</option>
              {(brandsList?.data || []).map((b: any) => (
                <option key={b.id} value={b.brand_name}>{b.brand_name}</option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-ink-700 mb-1">Category</label>
            <Select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
              <option value="">All Categories</option>
              {(categoriesList?.data || []).map((c: any) => (
                <option key={c.id} value={c.category_name}>{c.category_name}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <DataTable
        data={filteredProducts}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        emptyTitle="No products found"
        emptyDescription="Add your first product or bulk import your catalog."
        onRowClick={(row) => { setEditing(row); setDrawerOpen(true) }}
        globalFilter={search}
        onGlobalFilterChange={setSearch}
        searchPlaceholder="Search by name, code, brand..."
      />

      {drawerOpen && (
        <ProductViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} product={editing} />
      )}
      {adjustModalOpen && (
        <StockAdjustModal open={adjustModalOpen} onClose={() => setAdjustModalOpen(false)} />
      )}
      {bulkStatusOpen && (
        <BulkStatusModal open={bulkStatusOpen} onClose={() => setBulkStatusOpen(false)} products={filteredProducts} />
      )}
      {bulkPriceOpen && (
        <BulkPriceEditModal open={bulkPriceOpen} onClose={() => setBulkPriceOpen(false)} products={filteredProducts} />
      )}
      {bulkImportOpen && (
        <BulkImportModal open={bulkImportOpen} onClose={() => setBulkImportOpen(false)} />
      )}
    </div>
  )
}
