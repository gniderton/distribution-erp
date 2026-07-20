import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Drawer } from '@/components/ui/Drawer'
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

export function CustomerFormDrawer({ open, onClose, customer }: { open: boolean; onClose: () => void; customer?: Customer | null }) {
  const isEdit = !!customer
  const create = useCreateCustomer()
  const update = useUpdateCustomer()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', channel: '', route: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: customer?.name ?? '',
        phone: customer?.phone ?? '',
        channel: customer?.channel ?? '',
        route: customer?.route ?? '',
      })
    }
  }, [open, customer, reset])

  async function onSubmit(values: FormValues) {
    if (isEdit && customer) await update.mutateAsync({ id: customer.id, payload: values })
    else await create.mutateAsync(values)
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit customer' : 'New customer'}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={saving} onClick={handleSubmit(onSubmit)}>
            {isEdit ? 'Save changes' : 'Create customer'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Label>Customer name</Label>
          <Input {...register('name')} placeholder="e.g. Sunrise General Store" />
          {errors.name && <p className="text-xs text-danger-600 mt-1">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Phone</Label><Input {...register('phone')} /></div>
          <div><Label>Channel</Label><Input {...register('channel')} placeholder="Retail / Wholesale" /></div>
        </div>
        <div>
          <Label>Route</Label>
          <Input {...register('route')} placeholder="Delivery route" />
        </div>
      </form>
    </Drawer>
  )
}
