import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
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
    destination_account_id: '',
    bank_statement_entry_id: '',
    cheque_no: '',
    cheque_date: new Date().toISOString().split('T')[0],
    bank_name: '',
    amount: '',
    receipt_no: '',
    description: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'entity_id' && value === 'CREATE_NEW') {
      setShowCreateEntity(true)
      setFormData(prev => ({ ...prev, entity_id: '' }))
      return
    }
    setFormData(prev => ({ ...prev, [name]: value }))
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
    if (paymentMode === 'Online' && formData.bank_statement_entry_id) {
        const stmt = unconsumedCredits.find((s: any) => String(s.id) === formData.bank_statement_entry_id)
        if (stmt) {
            finalTotal = parseFloat(stmt.amount) - parseFloat(stmt.consumed_amount || 0)
        }
    }

    const payload = {
      ...formData,
      amount: finalTotal,
      category_account_id: parseInt(formData.category_account_id) || null,
      entity_id: parseInt(formData.entity_id) || null,
      destination_account_id: parseInt(formData.destination_account_id) || null,
      payment_mode: paymentMode
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
          <>
            <div>
              <Label htmlFor="bank_statement_entry_id">Link to Bank Statement (Optional)</Label>
              <Select 
                id="bank_statement_entry_id" 
                name="bank_statement_entry_id" 
                value={formData.bank_statement_entry_id} 
                onChange={handleChange}
              >
                <option value="">Do not link (Manual entry)</option>
                {unconsumedCredits.map((stmt: any) => {
                  const unconsumed = parseFloat(stmt.amount) - parseFloat(stmt.consumed_amount || 0);
                  return (
                    <option key={stmt.id} value={stmt.id}>
                      {stmt.txn_date.split('T')[0]} - {stmt.description.substring(0,30)}... - ₹{unconsumed.toFixed(2)}
                    </option>
                  )
                })}
              </Select>
              <p className="text-xs text-gray-500 mt-1">Linking a statement will automatically resolve the bank and amount.</p>
            </div>
            {!formData.bank_statement_entry_id && (
              <div>
                <Label htmlFor="destination_account_id">Destination Bank Account</Label>
                <Select 
                  id="destination_account_id" 
                  name="destination_account_id" 
                  value={formData.destination_account_id} 
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a bank account</option>
                  {banks.map((bank: any) => (
                    <option key={bank.id} value={bank.id}>{bank.bank_name}</option>
                  ))}
                </Select>
              </div>
            )}
          </>
        )}

        {paymentMode === 'Cash' && (
          <div>
            <Label htmlFor="destination_account_id">Cash Account</Label>
            <Select 
              id="destination_account_id" 
              name="destination_account_id" 
              value={formData.destination_account_id} 
              onChange={handleChange}
              required
            >
              <option value="">Select cash account</option>
              {banks.map((bank: any) => (
                <option key={bank.id} value={bank.id}>{bank.bank_name}</option>
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
            placeholder={formData.bank_statement_entry_id ? "Auto-calculated from statement" : "0.00"}
            required={!formData.bank_statement_entry_id} 
            disabled={!!formData.bank_statement_entry_id}
          />
        </div>

        <div>
          <Label htmlFor="receipt_no">Receipt / Reference No</Label>
          <Input 
            id="receipt_no" 
            name="receipt_no" 
            type="text" 
            value={formData.receipt_no} 
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
            Record Income
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
