import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import { useCreateOtherIncome, useOtherIncomeCategories, useIncomeEntities, useBankAccounts, useUnconsumedCredits, useCreateIncomeEntity } from '../hooks'

interface Props {
  open: boolean
  onClose: () => void
}

export function IncomeDrawer({ open, onClose }: Props) {
  const { mutate, isPending } = useCreateOtherIncome()
  const { data: categories = [] } = useOtherIncomeCategories()
  const { data: entities = [] } = useIncomeEntities()
  const { data: banks = [] } = useBankAccounts()
  const { data: unconsumedCredits = [] } = useUnconsumedCredits()
  const { mutate: createEntity, isPending: isCreatingEntity } = useCreateIncomeEntity()

  const [paymentMode, setPaymentMode] = useState('Online')
  const [showCreateEntity, setShowCreateEntity] = useState(false)
  const [newEntityName, setNewEntityName] = useState('')

  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    category_account_id: '',
    entity_id: '',
    payment_source_id: '',
    bank_statement_entry_id: '',
    cheque_no: '',
    cheque_date: new Date().toISOString().split('T')[0],
    bank_name: '',
    amount: '',
    taxable_amount: '',
    tax_amount: '',
    is_gst_income: false,
    description: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (name === 'entity_id' && value === 'CREATE_NEW') {
      setShowCreateEntity(true)
      setFormData(prev => ({ ...prev, entity_id: '' }))
      return
    }

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => {
        const newData = { ...prev, [name]: checked }
        if (name === 'is_gst_income' && checked) {
          const total = parseFloat(prev.amount) || 0;
          if (total > 0) {
             const taxable = total / 1.18;
             const tax = total - taxable;
             newData.taxable_amount = taxable.toFixed(2);
             newData.tax_amount = tax.toFixed(2);
          }
        }
        return newData;
      })
      return
    }

    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      if (newData.is_gst_income) {
        if (name === 'taxable_amount' || name === 'tax_amount') {
          const taxable = parseFloat(newData.taxable_amount) || 0;
          const tax = parseFloat(newData.tax_amount) || 0;
          newData.amount = (taxable + tax).toFixed(2);
        } else if (name === 'amount') {
          const total = parseFloat(value) || 0;
          const taxable = total / 1.18;
          const tax = total - taxable;
          newData.taxable_amount = taxable.toFixed(2);
          newData.tax_amount = tax.toFixed(2);
        }
      }
      
      if (paymentMode === 'Online' && name === 'bank_statement_entry_id' && value) {
        const stmt = unconsumedCredits.find((s: any) => String(s.id) === value)
        if (stmt && stmt.transaction_date) {
          newData.transaction_date = stmt.transaction_date.split('T')[0]
          const available = parseFloat(stmt.credit_amount) - parseFloat(stmt.consumed_amount || 0);
          newData.amount = String(available);
          
          if (newData.is_gst_income) {
            const taxable = available / 1.18;
            const tax = available - taxable;
            newData.taxable_amount = taxable.toFixed(2);
            newData.tax_amount = tax.toFixed(2);
          }
        }
      }
      
      return newData;
    })
  }

  const handleCreateEntity = () => {
    if (!newEntityName.trim()) return
    createEntity({ name: newEntityName }, {
      onSuccess: (res: any) => {
        setFormData(prev => ({ ...prev, entity_id: String(res.id) }))
        setShowCreateEntity(false)
        setNewEntityName('')
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Auto-resolve amount from statement if selected
    let finalTotal = parseFloat(formData.amount) || 0
    let taxable = parseFloat(formData.taxable_amount) || finalTotal
    let tax = parseFloat(formData.tax_amount) || 0

    if (paymentMode === 'Online' && formData.bank_statement_entry_id) {
        const stmt = unconsumedCredits.find((s: any) => String(s.id) === formData.bank_statement_entry_id)
        if (stmt) {
            const available = parseFloat(stmt.credit_amount) - parseFloat(stmt.consumed_amount || 0)
            if (finalTotal > available) {
                toast.error(`Amount cannot exceed the statement's available balance (₹${available.toFixed(2)})`);
                return;
            }
            if (!formData.is_gst_income) {
              taxable = finalTotal;
              tax = 0;
            }
        }
    }

    const payload = {
      ...formData,
      amount: finalTotal,
      taxable_amount: taxable,
      tax_amount: tax,
      category_account_id: parseInt(formData.category_account_id) || null,
      source_name: parseInt(formData.entity_id) || null,
      payment_source_id: parseInt(formData.payment_source_id) || null,
      payment_mode: paymentMode
    }

    mutate(payload, {
      onSuccess: () => {
        toast.success('Income recorded successfully!')
        onClose()
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error || err.message || 'Failed to record income')
      }
    })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Record Other Income"
      description="Create a new income entry."
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <Label htmlFor="transaction_date">Date</Label>
          <Input 
            id="transaction_date" 
            name="transaction_date" 
            type="date" 
            value={formData.transaction_date} 
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
          <Label htmlFor="entity_id">Source / Entity</Label>
          <div className="flex gap-2">
            <Select 
              id="entity_id" 
              name="entity_id" 
              value={formData.entity_id} 
              onChange={handleChange}
              required={!showCreateEntity}
              className="flex-1"
            >
              <option value="">Select an entity</option>
              {entities.map((ent: any) => (
                <option key={ent.id} value={ent.id}>{ent.name}</option>
              ))}
              <option value="CREATE_NEW" className="font-bold text-brand-600">+ Create New Entity</option>
            </Select>
          </div>
          
          {showCreateEntity && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md flex gap-2 items-center">
              <Input 
                placeholder="Enter new entity name..." 
                value={newEntityName}
                onChange={e => setNewEntityName(e.target.value)}
                autoFocus
              />
              <Button type="button" variant="primary" size="sm" onClick={handleCreateEntity} loading={isCreatingEntity}>
                Save
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreateEntity(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="paymentMode">Payment Mode</Label>
          <Select 
            id="paymentMode" 
            name="paymentMode" 
            value={paymentMode} 
            onChange={(e) => setPaymentMode(e.target.value)}
          >
            <option value="Online">Online</option>
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
          </Select>
        </div>

        {paymentMode === 'Online' && (
          <div>
            <Label htmlFor="bank_statement_entry_id">Link to Bank Statement</Label>
            <Select 
              id="bank_statement_entry_id" 
              name="bank_statement_entry_id" 
              value={formData.bank_statement_entry_id} 
              onChange={handleChange}
              required
            >
              <option value="">Select a statement entry</option>
              {unconsumedCredits.map((stmt: any) => {
                const unconsumed = parseFloat(stmt.credit_amount) - parseFloat(stmt.consumed_amount || 0);
                const tdate = stmt.transaction_date ? stmt.transaction_date.split('T')[0] : '';
                const desc = stmt.particulars || '';
                return (
                  <option key={stmt.id} value={stmt.id}>
                    {tdate} - {desc.substring(0,30)}... - ₹{unconsumed.toFixed(2)}
                  </option>
                )
              })}
            </Select>
            <p className="text-xs text-gray-500 mt-1">Selecting a statement is mandatory and will automatically resolve the bank and amount.</p>
          </div>
        )}

        {paymentMode === 'Cash' && (
          <div>
            <Label htmlFor="payment_source_id">Cash Account</Label>
            <Select 
              id="payment_source_id" 
              name="payment_source_id" 
              value={formData.payment_source_id} 
              onChange={handleChange}
              required
            >
              <option value="">Select cash account</option>
              {banks.map((bank: any) => (
                <option key={bank.id} value={bank.id}>{bank.name}</option>
              ))}
            </Select>
          </div>
        )}

        {paymentMode === 'Cheque' && (
          <div className="space-y-4 p-4 border border-gray-200 rounded-md bg-gray-50">
            <div>
              <Label htmlFor="cheque_no">Cheque Number</Label>
              <Input 
                id="cheque_no" 
                name="cheque_no" 
                value={formData.cheque_no} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div>
              <Label htmlFor="cheque_date">Cheque Date</Label>
              <Input 
                id="cheque_date" 
                name="cheque_date" 
                type="date"
                value={formData.cheque_date} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div>
              <Label htmlFor="bank_name">Drawn on Bank Name</Label>
              <Input 
                id="bank_name" 
                name="bank_name" 
                placeholder="e.g. HDFC Bank"
                value={formData.bank_name} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 py-2">
          <input 
            type="checkbox"
            id="is_gst_income"
            name="is_gst_income"
            checked={formData.is_gst_income}
            onChange={handleChange}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <Label htmlFor="is_gst_income" className="cursor-pointer">This is GST Income</Label>
        </div>

        {formData.is_gst_income && (
          <div className="space-y-4 p-4 border border-gray-200 rounded-md bg-gray-50">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="taxable_amount">Taxable Amount</Label>
                <Input 
                  id="taxable_amount" 
                  name="taxable_amount" 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={formData.taxable_amount} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="tax_amount">Tax Amount</Label>
                <Input 
                  id="tax_amount" 
                  name="tax_amount" 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={formData.tax_amount} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="amount">Total Amount</Label>
          <Input 
            id="amount" 
            name="amount" 
            type="number" 
            step="0.01" 
            min="0"
            value={formData.amount} 
            onChange={handleChange} 
            placeholder={formData.bank_statement_entry_id ? "Auto-filled from statement" : "0.00"}
            required
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
            Record Income
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
