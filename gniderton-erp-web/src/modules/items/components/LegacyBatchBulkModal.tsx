import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProducts, useCreateLegacyBatchesBulk } from '../hooks'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const batchSchema = z.object({
  product_id: z.coerce.number().min(1, 'Product is required'),
  batch_code: z.string().min(1, 'Batch Code is required'),
  expiry_date: z.string().optional(),
  mrp: z.coerce.number().min(0),
  purchase_rate: z.coerce.number().min(0),
  retail_rate: z.coerce.number().min(0),
  wholesale_rate: z.coerce.number().min(0),
  dealer_rate: z.coerce.number().min(0),
  distributor_rate: z.coerce.number().min(0),
})

const bulkSchema = z.object({
  batches: z.array(batchSchema).min(1, 'At least one batch is required')
})

type BulkFormValues = z.infer<typeof bulkSchema>

interface Props {
  open: boolean
  onClose: () => void
}

export default function LegacyBatchBulkModal({ open, onClose }: Props) {
  const { data: products } = useProducts()
  const createMutation = useCreateLegacyBatchesBulk()

  const { register, control, handleSubmit, formState: { errors } } = useForm<BulkFormValues>({
    resolver: zodResolver(bulkSchema) as any,
    defaultValues: {
      batches: [{
        product_id: 0,
        batch_code: '',
        expiry_date: '',
        mrp: 0,
        purchase_rate: 0,
        retail_rate: 0,
        wholesale_rate: 0,
        dealer_rate: 0,
        distributor_rate: 0,
      }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'batches'
  })

  const onSubmit = async (data: BulkFormValues) => {
    try {
      await createMutation.mutateAsync(data)
      toast.success('Legacy batches created successfully!')
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.error || 'Failed to create legacy batches')
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      title="Create Legacy Batches (0 Qty)" 
      widthClass="max-w-[95vw]"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit(onSubmit)} 
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
          >
            Create {fields.length} Batches
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-lg">
          <strong>Note:</strong> These batches are created with exactly <strong>0 initial quantity</strong>. They will not affect your inventory valuation or opening balances. They exist solely so you can process returns against them.
        </div>

        <div className="overflow-x-auto rounded-xl border border-border-subtle bg-surface min-h-[400px] flex flex-col">
          <table className="w-full text-left text-sm divide-y divide-border-subtle min-w-[1300px] flex-1">
            <thead className="bg-ink-50">
              <tr>
                <th className="p-3 font-medium text-ink-700 min-w-[350px]">Product *</th>
                <th className="p-3 font-medium text-ink-700 min-w-[160px]">Batch Code *</th>
                <th className="p-3 font-medium text-ink-700 w-[140px]">Expiry (Opt)</th>
                <th className="p-3 font-medium text-ink-700 w-[90px]">MRP</th>
                <th className="p-3 font-medium text-ink-700 w-[90px]">Purchase</th>
                <th className="p-3 font-medium text-ink-700 w-[90px]">Distributor</th>
                <th className="p-3 font-medium text-ink-700 w-[90px]">Wholesale</th>
                <th className="p-3 font-medium text-ink-700 w-[90px]">Dealer</th>
                <th className="p-3 font-medium text-ink-700 w-[90px]">Retail</th>
                <th className="p-3 font-medium text-ink-700 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {fields.map((field, index) => (
                <tr key={field.id} className="hover:bg-ink-50/50">
                  <td className="p-2 align-top">
                    <Controller
                      name={`batches.${index}.product_id`}
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <SearchableSelect
                          value={value}
                          onChange={onChange}
                          options={(products || []).map((p: any) => ({
                            value: p.id,
                            label: `${p.product_name} (${p.product_code})`
                          }))}
                          placeholder="-- Select Product --"
                          className={errors.batches?.[index]?.product_id ? 'border-rose-500 rounded-lg border' : ''}
                        />
                      )}
                    />
                  </td>
                  <td className="p-2 align-top">
                    <Input className="h-9 w-full" placeholder="LEGACY-001" {...register(`batches.${index}.batch_code`)} />
                  </td>
                  <td className="p-2">
                    <Input type="date" className="h-9 w-full px-1" {...register(`batches.${index}.expiry_date`)} />
                  </td>
                  <td className="p-2">
                    <Input type="number" step="0.01" className="h-9 w-full" placeholder="0.00" {...register(`batches.${index}.mrp`)} />
                  </td>
                  <td className="p-2">
                    <Input type="number" step="0.01" className="h-9 w-full" placeholder="0.00" {...register(`batches.${index}.purchase_rate`)} />
                  </td>
                  <td className="p-2">
                    <Input type="number" step="0.01" className="h-9 w-full" placeholder="0.00" {...register(`batches.${index}.distributor_rate`)} />
                  </td>
                  <td className="p-2">
                    <Input type="number" step="0.01" className="h-9 w-full" placeholder="0.00" {...register(`batches.${index}.wholesale_rate`)} />
                  </td>
                  <td className="p-2">
                    <Input type="number" step="0.01" className="h-9 w-full" placeholder="0.00" {...register(`batches.${index}.dealer_rate`)} />
                  </td>
                  <td className="p-2">
                    <Input type="number" step="0.01" className="h-9 w-full" placeholder="0.00" {...register(`batches.${index}.retail_rate`)} />
                  </td>
                  <td className="p-2 align-top text-center">
                    <Button variant="ghost" size="sm" onClick={() => remove(index)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50" type="button">
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button 
          variant="secondary" 
          onClick={() => append({ product_id: 0, batch_code: '', expiry_date: '', mrp: 0, purchase_rate: 0, retail_rate: 0, wholesale_rate: 0, dealer_rate: 0, distributor_rate: 0 })}
          className="w-full flex items-center justify-center gap-2 border-dashed"
          type="button"
        >
          <Plus size={16} /> Add Another Batch Row
        </Button>
        
        {errors.batches && errors.batches.root?.message && (
          <p className="text-sm text-rose-500 font-medium">{errors.batches.root.message}</p>
        )}
      </div>
    </Dialog>
  )
}
