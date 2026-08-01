import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import { useCreateTransfer, useBankAccounts, useUnconsumedDebits, useUnconsumedCredits } from '../hooks'

interface Props {
  open: boolean
  onClose: () => void
}

export function TransferDrawer({ open, onClose }: Props) {
  const { mutate, isPending } = useCreateTransfer()
  const { data: banks = [] } = useBankAccounts()
  const { data: unconsumedDebits = [] } = useUnconsumedDebits()
  const { data: unconsumedCredits = [] } = useUnconsumedCredits()

  const [formData, setFormData] = useState({
    transfer_date: new Date().toISOString().split('T')[0],
    from_account_id: '',
    to_account_id: '',
    from_bank_statement_entry_id: '',
    to_bank_statement_entry_id: '',
    payment_mode: 'Online',
    amount: '',
    reference_no: '',
    remarks: ''
  })

  // Watch selected accounts to determine if they are Cash (id === '2')
  const isFromCash = formData.from_account_id === '2'
  const isToCash = formData.to_account_id === '2'
  const isOnline = formData.payment_mode === 'Online'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = { ...prev, [name]: value }
      
      // If changing account to Cash, clear its statement selection
      if (name === 'from_account_id' && value === '2') {
        newData.from_bank_statement_entry_id = ''
      }
      if (name === 'to_account_id' && value === '2') {
        newData.to_bank_statement_entry_id = ''
      }

      // Auto-resolve amount if statement is selected
      if (name === 'from_bank_statement_entry_id' && value) {
        const stmt = unconsumedDebits.find((s: any) => String(s.id) === value)
        if (stmt) {
          const unconsumed = parseFloat(stmt.debit_amount) - parseFloat(stmt.consumed_amount || 0)
          newData.amount = unconsumed.toFixed(2)
        }
      } else if (name === 'to_bank_statement_entry_id' && value) {
        const stmt = unconsumedCredits.find((s: any) => String(s.id) === value)
        if (stmt) {
          const unconsumed = parseFloat(stmt.credit_amount) - parseFloat(stmt.consumed_amount || 0)
          newData.amount = unconsumed.toFixed(2)
        }
      }
      
      return newData
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload = {
      ...formData,
      amount: parseFloat(formData.amount),
      from_account_id: parseInt(formData.from_account_id) || null,
      to_account_id: parseInt(formData.to_account_id) || null,
      from_bank_statement_entry_id: parseInt(formData.from_bank_statement_entry_id) || null,
      to_bank_statement_entry_id: parseInt(formData.to_bank_statement_entry_id) || null,
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
      title="Record Internal Transfer"
      description="Transfer funds between your cash and bank accounts."
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <Label htmlFor="transfer_date">Date</Label>
          <Input 
            id="transfer_date" 
            name="transfer_date" 
            type="date" 
            value={formData.transfer_date} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div>
          <Label htmlFor="payment_mode">Payment Mode</Label>
          <Select 
            id="payment_mode" 
            name="payment_mode" 
            value={formData.payment_mode} 
            onChange={handleChange}
          >
            <option value="Online">Online</option>
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
          </Select>
        </div>

        <div className="p-4 border border-border-subtle rounded-xl bg-gray-50 space-y-4">
          <h3 className="text-sm font-semibold text-ink-900 border-b border-border-subtle pb-2">From Account (Source)</h3>
          
          <div>
            <Label htmlFor="from_account_id">Source Account</Label>
            <Select 
              id="from_account_id" 
              name="from_account_id" 
              value={formData.from_account_id} 
              onChange={handleChange}
              required
            >
              <option value="">Select source account</option>
              {banks.map((bank: any) => (
                <option key={bank.id} value={bank.id}>{bank.name}</option>
              ))}
            </Select>
          </div>

          {!isFromCash && formData.from_account_id && (
            <div>
              <Label htmlFor="from_bank_statement_entry_id">
                Debit Statement {isOnline ? "(Required for Online)" : "(Optional)"}
              </Label>
              <Select 
                id="from_bank_statement_entry_id" 
                name="from_bank_statement_entry_id" 
                value={formData.from_bank_statement_entry_id} 
                onChange={handleChange}
                required={isOnline}
              >
                <option value="">{isOnline ? "Select statement entry" : "Do not link (Manual entry)"}</option>
                {unconsumedDebits.map((stmt: any) => {
                  const unconsumed = parseFloat(stmt.debit_amount) - parseFloat(stmt.consumed_amount || 0);
                  const tdate = stmt.transaction_date ? stmt.transaction_date.split('T')[0] : '';
                  const desc = stmt.particulars || '';
                  return (
                    <option key={stmt.id} value={stmt.id}>
                      {tdate} - {desc.substring(0,30)}... - ₹{unconsumed.toFixed(2)}
                    </option>
                  )
                })}
              </Select>
            </div>
          )}
        </div>

        <div className="p-4 border border-border-subtle rounded-xl bg-gray-50 space-y-4">
          <h3 className="text-sm font-semibold text-ink-900 border-b border-border-subtle pb-2">To Account (Destination)</h3>
          
          <div>
            <Label htmlFor="to_account_id">Destination Account</Label>
            <Select 
              id="to_account_id" 
              name="to_account_id" 
              value={formData.to_account_id} 
              onChange={handleChange}
              required
            >
              <option value="">Select destination account</option>
              {banks.map((bank: any) => (
                <option key={bank.id} value={bank.id}>{bank.name}</option>
              ))}
            </Select>
          </div>

          {!isToCash && formData.to_account_id && (
            <div>
              <Label htmlFor="to_bank_statement_entry_id">
                Credit Statement {isOnline ? "(Required for Online)" : "(Optional)"}
              </Label>
              <Select 
                id="to_bank_statement_entry_id" 
                name="to_bank_statement_entry_id" 
                value={formData.to_bank_statement_entry_id} 
                onChange={handleChange}
                required={isOnline}
              >
                <option value="">{isOnline ? "Select statement entry" : "Do not link (Manual entry)"}</option>
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
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="amount">Transfer Amount</Label>
          <Input 
            id="amount" 
            name="amount" 
            type="number" 
            step="0.01" 
            min="0"
            value={formData.amount} 
            onChange={handleChange} 
            required 
            disabled={!!formData.from_bank_statement_entry_id || !!formData.to_bank_statement_entry_id}
          />
        </div>

        {(!isFromCash && !isToCash) && (
          <div>
            <Label htmlFor="reference_no">Reference Number</Label>
            <Input 
              id="reference_no" 
              name="reference_no" 
              type="text" 
              value={formData.reference_no} 
              onChange={handleChange} 
              placeholder="Optional"
            />
          </div>
        )}

        <div>
          <Label htmlFor="remarks">Remarks</Label>
          <textarea
            id="remarks"
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            className="w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition"
            rows={2}
            placeholder="Optional"
          />
        </div>

        <div className="pt-4 flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1" loading={isPending}>
            Record Transfer
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
