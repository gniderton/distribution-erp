import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Drawer } from '@/components/ui/Drawer'
import { Input, Label } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useCreateProduct, useUpdateProduct } from '../hooks'
import type { Product } from '../types'

const schema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  hsn: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
})
type FormValues = z.input<typeof schema>

export function ProductFormDrawer({ open, onClose, product }: { open: boolean; onClose: () => void; product?: Product | null }) {
  const isEdit = !!product
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', sku: '', brand: '', category: '', hsn: '', price: 0 },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: product?.name ?? '',
        sku: product?.sku ?? '',
        brand: product?.brand ?? '',
        category: product?.category ?? '',
        hsn: product?.hsn ?? '',
        price: product?.price ?? 0,
      })
    }
  }, [open, product, reset])

  async function onSubmit(values: FormValues) {
    const payload = { ...values, price: values.price !== undefined ? Number(values.price) : undefined }
    if (isEdit && product) await update.mutateAsync({ id: product.id, payload })
    else await create.mutateAsync(payload)
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit product' : 'New product'}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={saving} onClick={handleSubmit(onSubmit)}>
            {isEdit ? 'Save changes' : 'Create product'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Label>Product name</Label>
          <Input {...register('name')} placeholder="e.g. 1L Sunflower Oil" />
          {errors.name && <p className="text-xs text-danger-600 mt-1">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>SKU</Label><Input {...register('sku')} /></div>
          <div><Label>HSN code</Label><Input {...register('hsn')} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Brand</Label><Input {...register('brand')} /></div>
          <div><Label>Category</Label><Input {...register('category')} /></div>
        </div>
        <div>
          <Label>Base price</Label>
          <Input type="number" step="0.01" {...register('price')} />
        </div>
      </form>
    </Drawer>
  )
}
