import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Label } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useCreateCustomer, useUpdateCustomer } from '../hooks'
import type { Customer } from '../types'

const schema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional(),
  channel: z.string().optional(),
  route: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function CustomerDetailsTab({ customer, onClose }: { customer?: Customer | null; onClose: () => void }) {
  const isEdit = !!customer
  const create = useCreateCustomer()
  const update = useUpdateCustomer()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', channel: '', route: '' },
  })

  useEffect(() => {
    reset({
      name: customer?.name ?? '',
      phone: customer?.phone ?? '',
      channel: customer?.channel ?? '',
      route: customer?.route ?? '',
    })
  }, [customer, reset])

  async function onSubmit(values: FormValues) {
    if (isEdit && customer) await update.mutateAsync({ id: customer.id, payload: values })
    else await create.mutateAsync(values)
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <form className="space-y-6 max-w-2xl bg-white p-6 rounded-xl border border-border shadow-sm" onSubmit={handleSubmit(onSubmit)}>
      <h3 className="text-lg font-semibold text-ink-900 mb-4">{isEdit ? 'Customer Details' : 'New Customer Details'}</h3>
      
      <div>
        <Label>Customer name</Label>
        <Input {...register('name')} placeholder="e.g. Sunrise General Store" />
        {errors.name && <p className="text-xs text-danger-600 mt-1">{errors.name.message}</p>}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Phone</Label>
          <Input {...register('phone')} />
        </div>
        <div>
          <Label>Channel</Label>
          <Input {...register('channel')} placeholder="Retail / Wholesale" />
        </div>
      </div>
      
      <div>
        <Label>Route</Label>
        <Input {...register('route')} placeholder="Delivery route" />
      </div>

      <div className="pt-4 flex justify-end gap-3">
        {!isEdit && <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>}
        <Button loading={saving} type="submit">
          {isEdit ? 'Save changes' : 'Create customer'}
        </Button>
      </div>
    </form>
  )
}
