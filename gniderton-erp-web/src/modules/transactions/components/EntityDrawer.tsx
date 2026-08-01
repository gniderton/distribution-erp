import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { useCreateExpenseEntity, useCreateIncomeEntity } from '../hooks'

interface Props {
  open: boolean
  onClose: () => void
  type: 'expense' | 'income'
}

export function EntityDrawer({ open, onClose, type }: Props) {
  const { mutate: createExpenseEntity, isPending: isExpensePending } = useCreateExpenseEntity()
  const { mutate: createIncomeEntity, isPending: isIncomePending } = useCreateIncomeEntity()

  const isPending = type === 'expense' ? isExpensePending : isIncomePending

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    gst_no: '',
    address: '',
    bank_name: '',
    account_no: '',
    ifsc_code: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const action = type === 'expense' ? createExpenseEntity : createIncomeEntity
    
    action(formData, {
      onSuccess: () => {
        setFormData({ name: '', phone: '', email: '', gst_no: '', address: '', bank_name: '', account_no: '', ifsc_code: '' })
        onClose()
      }
    })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={type === 'expense' ? "Create Vendor" : "Create Income Source"}
      description="Add a new entity to your master records."
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-ink-900 border-b border-border-subtle pb-2">Basic Details</h3>
          <div>
            <Label htmlFor="name">Entity Name *</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
            </div>
            <div className="flex-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition"
              rows={2}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-ink-900 border-b border-border-subtle pb-2">Tax & Compliance</h3>
          <div>
            <Label htmlFor="gst_no">GST Number</Label>
            <Input id="gst_no" name="gst_no" value={formData.gst_no} onChange={handleChange} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-ink-900 border-b border-border-subtle pb-2">Bank Details</h3>
          <div>
            <Label htmlFor="bank_name">Bank Name</Label>
            <Input id="bank_name" name="bank_name" value={formData.bank_name} onChange={handleChange} />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="account_no">Account Number</Label>
              <Input id="account_no" name="account_no" value={formData.account_no} onChange={handleChange} />
            </div>
            <div className="flex-1">
              <Label htmlFor="ifsc_code">IFSC Code</Label>
              <Input id="ifsc_code" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1" loading={isPending}>
            Save Entity
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
