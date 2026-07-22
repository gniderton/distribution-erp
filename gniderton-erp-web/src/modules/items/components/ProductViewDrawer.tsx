import { useState, useEffect } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { DataTable } from '@/components/shared/DataTable'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProductBatches, useInventoryLedger, useUpdateProduct, useCreateProduct, useBrands, useCategories, useHsn, useTaxes, useVendors } from '../hooks'
import type { Product } from '../types'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { BatchEditModal } from './BatchEditModal'
import { ProductDashboardTab } from './ProductDashboardTab'
import { Pencil } from 'lucide-react'

const productSchema = z.object({
  product_name: z.string().min(1, 'Product Name is required'),
  product_code: z.string().optional(),
  ean_code: z.string().optional(),
  vendor_id: z.coerce.string().min(1, 'Vendor is required'),
  brand_id: z.coerce.string().min(1, 'Brand is required'),
  category_id: z.coerce.string().min(1, 'Category is required'),
  hsn_id: z.coerce.string().optional(),
  tax_id: z.coerce.string().optional(),
  mrp: z.coerce.number().optional(),
  retail_rate: z.coerce.number().optional(),
  wholesale_rate: z.coerce.number().optional(),
  dealer_rate: z.coerce.number().optional(),
  distributor_rate: z.coerce.number().optional(),
  purchase_rate: z.coerce.number().optional(),
  is_active: z.boolean().default(true),
  min_stock_level: z.coerce.number().optional(),
  description: z.string().optional()
})

type ProductFormValues = z.infer<typeof productSchema>

interface Props {
  open: boolean
  onClose: () => void
  product: Product | null
}

function FormGroup({ label, error, children }: { label: React.ReactNode | string, error?: string, children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  )
}

export function ProductViewDrawer({ open, onClose, product }: Props) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'details' | 'batches' | 'ledger'>('dashboard')
  const isEditing = !!product
  const [isEditMode, setIsEditMode] = useState(!product)
  const [editingBatch, setEditingBatch] = useState<any | null>(null)

  const { data: batches, isLoading: batchesLoading } = useProductBatches(product?.id || null)
  const { data: ledger, isLoading: ledgerLoading } = useInventoryLedger(product?.id || null)
  
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  
  const { data: brands } = useBrands()
  const { data: categories } = useCategories()
  const { data: hsn } = useHsn()
  const { data: taxes } = useTaxes()
  const { data: vendors } = useVendors()

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      is_active: true
    }
  })

  const purchaseRate = useWatch({ control, name: 'purchase_rate' })
  const retailRate = useWatch({ control, name: 'retail_rate' })
  const wholesaleRate = useWatch({ control, name: 'wholesale_rate' })
  const dealerRate = useWatch({ control, name: 'dealer_rate' })
  const distributorRate = useWatch({ control, name: 'distributor_rate' })

  const calculateMargin = (price: number | undefined) => {
    if (!purchaseRate || !price || purchaseRate === 0) return null
    const margin = (((price - purchaseRate) / purchaseRate) * 100)
    return <span className={`ml-2 text-xs font-mono font-bold ${margin > 0 ? 'text-success-600' : 'text-danger-600'}`}>{margin.toFixed(2)}%</span>
  }

  useEffect(() => {
    if (open && product) {
      reset({ ...product } as any)
    } else if (open && !product) {
      reset({ is_active: true } as any)
    }
  }, [open, product, reset])

  const onSubmit = async (data: ProductFormValues) => {
    try {
      if (isEditing) {
        await updateProduct.mutateAsync({ id: product.id, payload: data })
        toast.success('Product updated successfully')
      } else {
        await createProduct.mutateAsync(data)
        toast.success('Product created successfully')
      }
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save product')
    }
  }

  return (
    <Drawer 
      open={open} 
      onClose={onClose} 
      title={isEditing ? `Product: ${product.product_name}` : 'New Product'}
      widthClass="max-w-5xl"
      footer={
        <div className="flex justify-between items-center gap-3 w-full">
          <div>
            {!isEditMode && isEditing && activeTab === 'details' && (
              <Button onClick={() => setIsEditMode(true)}>Edit Product</Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            {isEditMode && (
              <Button onClick={handleSubmit(onSubmit as any)}>Save Changes</Button>
            )}
          </div>
        </div>
      }
    >
      {isEditing && (
        <div className="flex space-x-1 mt-4 border-b border-border-subtle overflow-x-auto">
          {product && (
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'dashboard' ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-500 hover:text-ink-700'}`}
            >
              Dashboard
            </button>
          )}
          <button 
            className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors ${activeTab === 'details' ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-600 hover:text-ink-900'}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button 
            className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors ${activeTab === 'batches' ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-600 hover:text-ink-900'}`}
            onClick={() => setActiveTab('batches')}
          >
            Batches
          </button>
          <button 
            className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors ${activeTab === 'ledger' ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-600 hover:text-ink-900'}`}
            onClick={() => setActiveTab('ledger')}
          >
            Inventory Ledger
          </button>
        </div>
      )}

      {activeTab === 'dashboard' && product && (
        <div className="py-4">
          <ProductDashboardTab productId={product.id} />
        </div>
      )}

      {activeTab === 'details' && (
        <form className="space-y-6 pb-8">
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Product Name" error={errors.product_name?.message}>
              <Input {...register('product_name')} disabled={!isEditMode} />
            </FormGroup>
            {isEditing ? (
              <FormGroup label="Product Code"><Input {...register('product_code')} disabled /></FormGroup>
            ) : (
              <div className="flex flex-col justify-center text-sm text-ink-500">Product Code will be auto-generated upon creation.</div>
            )}
            <FormGroup label="Vendor" error={errors.vendor_id?.message}>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" {...register('vendor_id')} disabled={!isEditMode}>
                <option value="">-- Select Vendor --</option>
                {vendors?.map((v: any) => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Brand" error={errors.brand_id?.message}>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" {...register('brand_id')} disabled={!isEditMode}>
                <option value="">-- Select Brand --</option>
                {brands?.map((b: any) => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Category" error={errors.category_id?.message}>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" {...register('category_id')} disabled={!isEditMode}>
                <option value="">-- Select Category --</option>
                {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.category_name}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="EAN / Barcode"><Input {...register('ean_code')} disabled={!isEditMode} /></FormGroup>
            <FormGroup label="HSN Code" error={errors.hsn_id?.message}>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" {...register('hsn_id')} disabled={!isEditMode}>
                <option value="">-- Select HSN --</option>
                {hsn?.map((h: any) => <option key={h.id} value={h.id}>{h.hsn_code}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Tax Rate" error={errors.tax_id?.message}>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" {...register('tax_id')} disabled={!isEditMode}>
                <option value="">-- Select Tax --</option>
                {taxes?.map((t: any) => <option key={t.id} value={t.id}>{t.tax_name} ({t.tax_percentage}%)</option>)}
              </select>
            </FormGroup>
          </div>

          <h3 className="text-sm font-semibold text-ink-900 pt-4 border-t border-border-subtle">Pricing & Rates</h3>
          <div className="grid grid-cols-3 gap-4">
            <FormGroup label="MRP"><Input type="number" step="0.01" {...register('mrp')} disabled={!isEditMode} /></FormGroup>
            <FormGroup label="Purchase Rate"><Input type="number" step="0.01" {...register('purchase_rate')} disabled={!isEditMode} /></FormGroup>
            <FormGroup label={<div className="flex items-center">Retail Rate {calculateMargin(retailRate)}</div>}><Input type="number" step="0.01" {...register('retail_rate')} disabled={!isEditMode} /></FormGroup>
            <FormGroup label={<div className="flex items-center">Wholesale Rate {calculateMargin(wholesaleRate)}</div>}><Input type="number" step="0.01" {...register('wholesale_rate')} disabled={!isEditMode} /></FormGroup>
            <FormGroup label={<div className="flex items-center">Dealer Rate {calculateMargin(dealerRate)}</div>}><Input type="number" step="0.01" {...register('dealer_rate')} disabled={!isEditMode} /></FormGroup>
            <FormGroup label={<div className="flex items-center">Distributor Rate {calculateMargin(distributorRate)}</div>}><Input type="number" step="0.01" {...register('distributor_rate')} disabled={!isEditMode} /></FormGroup>
          </div>

          <h3 className="text-sm font-semibold text-ink-900 pt-4 border-t border-border-subtle">Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Minimum Stock Level"><Input type="number" {...register('min_stock_level')} disabled={!isEditMode} /></FormGroup>
            <div className="flex items-center space-x-2 pt-8">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <input 
                    type="checkbox"
                    id="is_active" 
                    checked={field.value} 
                    onChange={field.onChange} 
                    disabled={!isEditMode}
                    className="h-4 w-4 rounded border-border-subtle text-brand-600 focus:ring-brand-500 disabled:opacity-50"
                  />
                )}
              />
              <label htmlFor="is_active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Active Product (Visible in Sales)
              </label>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'batches' && (
        <div className="space-y-4">
          <DataTable 
            data={batches || []}
            isLoading={batchesLoading}
            columns={[
              { accessorKey: 'batch_code', header: 'Batch Number' },
              { accessorKey: 'expiry_date', header: 'Expiry Date', cell: (c) => formatDate(c.getValue() as string) },
              { accessorKey: 'mrp', header: 'MRP', cell: (c) => formatCurrency(c.getValue() as number) },
              { accessorKey: 'quantity_remaining', header: 'Stock Qty', cell: (c) => <span className="font-mono-figures font-bold">{c.getValue() as number}</span> },
              { 
                id: 'actions', 
                header: '',
                cell: ({ row }) => (
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingBatch(row.original)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )
              }
            ]}
          />
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <DataTable 
            data={ledger?.movements || []}
            isLoading={ledgerLoading}
            columns={[
              { accessorKey: 'date', header: 'Date', cell: (c) => formatDate(c.getValue() as string) },
              { accessorKey: 'transaction_type', header: 'Type' },
              { accessorKey: 'reference_number', header: 'Reference' },
              { accessorKey: 'quantity_change', header: 'Qty Change', cell: (c) => {
                const val = c.getValue() as number
                return <span className={`font-mono-figures font-bold ${val > 0 ? 'text-success-600' : 'text-danger-600'}`}>{val > 0 ? `+${val}` : val}</span>
              }},
              { accessorKey: 'running_balance', header: 'Closing Stock' }
            ]}
          />
        </div>
      )}

      {editingBatch && (
        <BatchEditModal 
          open={!!editingBatch} 
          onClose={() => setEditingBatch(null)} 
          batch={editingBatch} 
        />
      )}
    </Drawer>
  )
}
