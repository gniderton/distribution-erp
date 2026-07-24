import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProducts, useProductBatches, useCreateStockAdjustment } from '../hooks'
import toast from 'react-hot-toast'

const schema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  batch_id: z.string().optional(),
  adjusted_qty: z.coerce.number().refine(v => v > 0, 'Quantity must be greater than zero'),
  reason: z.enum(['Found', 'Damage', 'Expiry', 'Lost']),
  reference: z.string().optional(),
  date: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function FormGroup({ label, error, description, children }: { label: string, error?: string, description?: string, children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
      {description && !error && <p className="mt-1 text-xs text-ink-500">{description}</p>}
    </div>
  )
}

export function StockAdjustModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  const { data: products } = useProducts()
  const adjustMutation = useCreateStockAdjustment()
  
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      reason: 'Damage'
    }
  })

  const selectedProductId = watch('product_id')
  const { data: batches } = useProductBatches(selectedProductId || null)

  const onSubmit = async (data: FormValues) => {
    try {
      const selectedBatch = batches?.find((b: any) => b.id === data.batch_id || b.batch_code === data.batch_id)
      
      const payload = {
        date: data.date,
        notes: data.reference,
        items: [
          {
            product_id: data.product_id,
            qty: data.adjusted_qty,
            reason: data.reason,
            batch_code: selectedBatch ? selectedBatch.batch_code : undefined
          }
        ]
      }

      await adjustMutation.mutateAsync(payload)
      toast.success('Stock adjusted successfully')
      reset()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to adjust stock')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Adjust Stock">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        <div>
          <Label>Product</Label>
          <Select {...register('product_id')}>
            <option value="">-- Select Product --</option>
            {products?.map((p: any) => (
              <option key={p.id} value={p.id}>{p.product_name} (Stock: {p.current_stock})</option>
            ))}
          </Select>
          {errors.product_id && <p className="mt-1 text-xs text-danger-600">{errors.product_id?.message}</p>}
        </div>

        {selectedProductId && batches && batches.length > 0 && (
          <div>
            <Label>Batch</Label>
            <Select {...register('batch_id')}>
              <option value="">-- Select Batch (Optional) --</option>
              {batches.map((b: any) => (
                <option key={b.id} value={b.batch_code}>{b.batch_code} (Qty: {b.quantity_remaining})</option>
              ))}
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Adjustment Qty" error={errors.adjusted_qty?.message} description="Use positive values only. Reason determines direction.">
            <Input type="number" placeholder="10" {...register('adjusted_qty')} />
          </FormGroup>
          <FormGroup label="Adjustment Date (Optional)" error={errors.date?.message}>
            <Input type="date" {...register('date')} />
          </FormGroup>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Reason" error={errors.reason?.message}>
            <Select {...register('reason')}>
              <option value="Found">Found (Increases Stock)</option>
              <option value="Damage">Damage (Moves to Damaged Stock)</option>
              <option value="Expiry">Expiry (Moves to Expired Stock)</option>
              <option value="Lost">Lost / Theft (Books Financial Loss)</option>
            </Select>
          </FormGroup>
          <FormGroup label="Reference / Notes">
            <Input placeholder="E.g. Approved by Manager" {...register('reference')} />
          </FormGroup>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" loading={adjustMutation.isPending}>Submit Adjustment</Button>
        </div>
      </form>
    </Dialog>
  )
}
