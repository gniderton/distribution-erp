import { useState, useEffect } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { DataTable } from '@/components/shared/DataTable'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProductBatches, useInventoryLedger, useUpdateProduct, useCreateProduct } from '../hooks'
import type { Product } from '../types'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const productSchema = z.object({
  product_name: z.string().min(1, 'Product Name is required'),
  product_code: z.string().optional(),
  ean_code: z.string().optional(),
  brand_name: z.string().optional(),
  category_name: z.string().optional(),
  hsn_code: z.string().optional(),
  tax_name: z.string().optional(),
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

function FormGroup({ label, error, children }: { label: string, error?: string, children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  )
}

export function ProductViewDrawer({ open, onClose, product }: Props) {
  const [activeTab, setActiveTab] = useState<'details' | 'batches' | 'ledger'>('details')
  const isEditing = !!product

  const { data: batches, isLoading: batchesLoading } = useProductBatches(product?.id || null)
  const { data: ledger, isLoading: ledgerLoading } = useInventoryLedger(product?.id || null)
  
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      is_active: true
    }
  })

  useEffect(() => {
    if (open && product) {
      reset({ ...product })
    } else if (open && !product) {
      reset({ is_active: true })
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
      widthClass="max-w-3xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit as any)}>Save Changes</Button>
        </div>
      }
    >
      {isEditing && (
        <div className="flex border-b border-border-subtle mb-6">
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

      {activeTab === 'details' && (
        <form className="space-y-6 pb-8">
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Product Name" error={errors.product_name?.message}>
              <Input {...register('product_name')} />
            </FormGroup>
            <FormGroup label="Product Code"><Input {...register('product_code')} /></FormGroup>
            <FormGroup label="Brand"><Input {...register('brand_name')} /></FormGroup>
            <FormGroup label="Category"><Input {...register('category_name')} /></FormGroup>
            <FormGroup label="EAN / Barcode"><Input {...register('ean_code')} /></FormGroup>
            <FormGroup label="HSN Code"><Input {...register('hsn_code')} /></FormGroup>
          </div>

          <h3 className="text-sm font-semibold text-ink-900 pt-4 border-t border-border-subtle">Pricing & Rates</h3>
          <div className="grid grid-cols-3 gap-4">
            <FormGroup label="MRP"><Input type="number" step="0.01" {...register('mrp')} /></FormGroup>
            <FormGroup label="Purchase Rate"><Input type="number" step="0.01" {...register('purchase_rate')} /></FormGroup>
            <FormGroup label="Retail Rate"><Input type="number" step="0.01" {...register('retail_rate')} /></FormGroup>
            <FormGroup label="Wholesale Rate"><Input type="number" step="0.01" {...register('wholesale_rate')} /></FormGroup>
            <FormGroup label="Dealer Rate"><Input type="number" step="0.01" {...register('dealer_rate')} /></FormGroup>
            <FormGroup label="Distributor Rate"><Input type="number" step="0.01" {...register('distributor_rate')} /></FormGroup>
          </div>

          <h3 className="text-sm font-semibold text-ink-900 pt-4 border-t border-border-subtle">Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Minimum Stock Level"><Input type="number" {...register('min_stock_level')} /></FormGroup>
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
                    className="h-4 w-4 rounded border-border-subtle text-brand-600 focus:ring-brand-500"
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
              { accessorKey: 'batch_number', header: 'Batch Number' },
              { accessorKey: 'expiry_date', header: 'Expiry Date', cell: (c) => formatDate(c.getValue() as string) },
              { accessorKey: 'mrp', header: 'MRP', cell: (c) => formatCurrency(c.getValue() as number) },
              { accessorKey: 'stock_qty', header: 'Stock Qty', cell: (c) => <span className="font-mono-figures font-bold">{c.getValue() as number}</span> }
            ]}
          />
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <DataTable 
            data={ledger || []}
            isLoading={ledgerLoading}
            columns={[
              { accessorKey: 'transaction_date', header: 'Date', cell: (c) => formatDate(c.getValue() as string) },
              { accessorKey: 'transaction_type', header: 'Type' },
              { accessorKey: 'reference_number', header: 'Reference' },
              { accessorKey: 'quantity_change', header: 'Qty Change', cell: (c) => {
                const val = c.getValue() as number
                return <span className={`font-mono-figures font-bold ${val > 0 ? 'text-success-600' : 'text-danger-600'}`}>{val > 0 ? `+${val}` : val}</span>
              }},
              { accessorKey: 'closing_stock', header: 'Closing Stock' }
            ]}
          />
        </div>
      )}
    </Drawer>
  )
}
