import { useEffect } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUpdateBatch } from '../hooks'
import toast from 'react-hot-toast'

const batchSchema = z.object({
  batch_code: z.string().min(1, 'Batch Code is required'),
  expiry_date: z.string().optional(),
  mrp: z.coerce.number().optional(),
  purchase_rate: z.coerce.number().optional(),
  retail_rate: z.coerce.number().optional(),
  wholesale_rate: z.coerce.number().optional(),
  dealer_rate: z.coerce.number().optional(),
  distributor_rate: z.coerce.number().optional(),
})

type BatchFormValues = z.infer<typeof batchSchema>

interface Props {
  open: boolean
  onClose: () => void
  batch: any | null
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

export function BatchEditModal({ open, onClose, batch }: Props) {
  const updateBatch = useUpdateBatch()

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema) as any,
  })

  useEffect(() => {
    if (open && batch) {
      reset({
        batch_code: batch.batch_number || batch.batch_code,
        expiry_date: batch.expiry_date ? new Date(batch.expiry_date).toISOString().split('T')[0] : '',
        mrp: batch.mrp,
        purchase_rate: batch.purchase_rate,
        retail_rate: batch.retail_rate,
        wholesale_rate: batch.wholesale_rate,
        dealer_rate: batch.dealer_rate,
        distributor_rate: batch.distributor_rate,
      })
    }
  }, [open, batch, reset])

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

  const onSubmit = async (data: BatchFormValues) => {
    if (!batch?.id) return
    try {
      await updateBatch.mutateAsync({ id: batch.id, payload: data })
      toast.success('Batch updated successfully')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update batch')
    }
  }

  if (!batch) return null

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      title={`Edit Batch: ${batch.batch_number || batch.batch_code || ''}`}
      widthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Batch Code" error={errors.batch_code?.message}>
            <Input {...register('batch_code')} />
          </FormGroup>
          <FormGroup label="Expiry Date" error={errors.expiry_date?.message}>
            <Input type="date" {...register('expiry_date')} />
          </FormGroup>
        </div>

        <h3 className="text-sm font-semibold text-ink-900 pt-4 border-t border-border-subtle">Pricing & Rates</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="MRP" error={errors.mrp?.message}>
            <Input type="number" step="0.01" {...register('mrp')} />
          </FormGroup>
          <FormGroup label="Purchase Rate" error={errors.purchase_rate?.message}>
            <Input type="number" step="0.01" {...register('purchase_rate')} />
          </FormGroup>
          <FormGroup label={<div className="flex items-center">Retail Rate {calculateMargin(retailRate)}</div>} error={errors.retail_rate?.message}>
            <Input type="number" step="0.01" {...register('retail_rate')} />
          </FormGroup>
          <FormGroup label={<div className="flex items-center">Wholesale Rate {calculateMargin(wholesaleRate)}</div>} error={errors.wholesale_rate?.message}>
            <Input type="number" step="0.01" {...register('wholesale_rate')} />
          </FormGroup>
          <FormGroup label={<div className="flex items-center">Dealer Rate {calculateMargin(dealerRate)}</div>} error={errors.dealer_rate?.message}>
            <Input type="number" step="0.01" {...register('dealer_rate')} />
          </FormGroup>
          <FormGroup label={<div className="flex items-center">Distributor Rate {calculateMargin(distributorRate)}</div>} error={errors.distributor_rate?.message}>
            <Input type="number" step="0.01" {...register('distributor_rate')} />
          </FormGroup>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Dialog>
  )
}
