import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import { useCreateExpense, useExpenseCategories, useExpenseEntities, useBankAccounts } from '../hooks'

interface Props {
  open: boolean
  onClose: () => void
}

export function ExpenseDrawer({ open, onClose }: Props) {
  const { mutate, isPending } = useCreateExpense()
  const { data: categories = [] } = useExpenseCategories()
  const { data: entities = [] } = useExpenseEntities()
  const { data: banks = [] } = useBankAccounts()

  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category_account_id: '',
    entity_id: '',
    payment_source_id: '',
    grand_total: '',
    bill_no: '',
    description: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload = {
      ...formData,
      grand_total: parseFloat(formData.grand_total) || 0,
      taxable_amount: parseFloat(formData.grand_total) || 0, // Simplified for now
      tax_amount: 0,
      is_gst_expense: false,
      category_account_id: parseInt(formData.category_account_id) || null,
      vendor_name: parseInt(formData.entity_id) || null,
      payment_source_id: parseInt(formData.payment_source_id) || null,
      payment_mode: 'Online'
    }

    mutate(payload, {
      onSuccess: () => {
        onClose()
      }
    })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Record Expense"
      description="Create a new expense entry."
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <Label htmlFor="expense_date">Date</Label>
          <Input 
            id="expense_date" 
            name="expense_date" 
            type="date" 
            value={formData.expense_date} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div>
          <Label htmlFor="category_account_id">Category</Label>
          <Select 
            id="category_account_id" 
            name="category_account_id" 
            value={formData.category_account_id} 
            onChange={handleChange}
            required
          >
            <option value="">Select a category</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="entity_id">Vendor / Entity</Label>
          <Select 
            id="entity_id" 
            name="entity_id" 
            value={formData.entity_id} 
            onChange={handleChange}
            required
          >
            <option value="">Select an entity</option>
            {entities.map((ent: any) => (
              <option key={ent.id} value={ent.id}>{ent.name}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="payment_source_id">Payment Source (Bank/Cash)</Label>
          <Select 
            id="payment_source_id" 
            name="payment_source_id" 
            value={formData.payment_source_id} 
            onChange={handleChange}
            required
          >
            <option value="">Select a payment source</option>
            {banks.map((bank: any) => (
              <option key={bank.id} value={bank.id}>{bank.name}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="grand_total">Total Amount</Label>
          <Input 
            id="grand_total" 
            name="grand_total" 
            type="number" 
            step="0.01" 
            min="0"
            value={formData.grand_total} 
            onChange={handleChange} 
            placeholder="0.00"
            required 
          />
        </div>

        <div>
          <Label htmlFor="bill_no">Bill / Reference No</Label>
          <Input 
            id="bill_no" 
            name="bill_no" 
            type="text" 
            value={formData.bill_no} 
            onChange={handleChange} 
            placeholder="Optional"
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition"
            rows={3}
            placeholder="Additional details..."
          />
        </div>

        <div className="pt-4 flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1" loading={isPending}>
            Record Expense
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
