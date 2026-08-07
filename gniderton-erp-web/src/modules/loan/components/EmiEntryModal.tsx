import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import { useCreateInstallment, useBankAccounts, useUnconsumedDebits, useUnconsumedCredits } from '../hooks'
import { format } from 'date-fns'

interface Props {
  open: boolean;
  onClose: () => void;
  loan: any | null;
}

export function EmiEntryModal({ open, onClose, loan }: Props) {
  const [formData, setFormData] = useState({
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    total_amount: '',
    principal_portion: '',
    interest_portion: '0',
    payment_mode: 'Bank Transfer',
    bank_account_id: '',
    bank_statement_entry_id: '',
    reference_no: '',
    remarks: ''
  })

  const { data: bankAccounts } = useBankAccounts()
  const { data: debits } = useUnconsumedDebits()
  const { data: credits } = useUnconsumedCredits()
  const createMutation = useCreateInstallment(loan?.id || null)

  useEffect(() => {
    if (open && loan) {
      setFormData(prev => ({
        ...prev,
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        total_amount: loan.emi_amount ? String(loan.emi_amount) : '',
        principal_portion: loan.emi_amount ? String(loan.emi_amount) : '',
        interest_portion: '0',
        reference_no: '',
        remarks: '',
        bank_statement_entry_id: ''
      }))
    }
  }, [open, loan])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload = {
      ...formData,
      total_amount: Number(formData.total_amount),
      principal_portion: Number(formData.principal_portion),
      interest_portion: Number(formData.interest_portion),
      bank_account_id: formData.bank_account_id ? Number(formData.bank_account_id) : null,
      bank_statement_entry_id: formData.bank_statement_entry_id ? Number(formData.bank_statement_entry_id) : null
    }

    createMutation.mutate(payload, {
      onSuccess: () => onClose()
    })
  }

  const bankStatements = loan?.loan_type === 'TAKEN' ? debits : credits;

  return (
    <Dialog open={open} onClose={onClose} title="Pay Installment (EMI)" widthClass="max-w-xl">
      {loan && (
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          
          <div className="bg-brand-50 p-3 rounded-md mb-4 border border-brand-100 text-sm">
            <p><strong>Loan:</strong> {loan.loan_number} ({loan.party_name})</p>
            <p><strong>Balance:</strong> ₹{loan.balance_principal} Principal Remaining</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Transaction Date</Label>
              <Input 
                type="date"
                value={formData.transaction_date} 
                onChange={e => setFormData({ ...formData, transaction_date: e.target.value })} 
                required
              />
            </div>
            <div>
              <Label>Total Amount Paid</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.total_amount} 
                onChange={e => {
                  setFormData({ 
                    ...formData, 
                    total_amount: e.target.value,
                    principal_portion: e.target.value 
                  })
                }} 
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Principal Portion</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.principal_portion} 
                onChange={e => setFormData({ ...formData, principal_portion: e.target.value })} 
                required
              />
            </div>
            <div>
              <Label>Interest Portion</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.interest_portion} 
                onChange={e => setFormData({ ...formData, interest_portion: e.target.value })} 
                required
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label>Payment Mode</Label>
                <Select 
                  value={formData.payment_mode} 
                  onChange={e => setFormData({ ...formData, payment_mode: e.target.value })}
                  required
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </Select>
              </div>

              {formData.payment_mode !== 'Cheque' ? (
                <div>
                  <Label>Bank Statement Link</Label>
                  <Select 
                    value={formData.bank_statement_entry_id} 
                    onChange={e => setFormData({ ...formData, bank_statement_entry_id: e.target.value, bank_account_id: '' })}
                  >
                    <option value="">-- Manual Entry (No Link) --</option>
                    {bankStatements?.map((stmt: any) => (
                      <option key={stmt.id} value={stmt.id}>
                        {format(new Date(stmt.transaction_date), 'dd MMM')} - {stmt.description} - {stmt.amount - (stmt.consumed_amount || 0)} available
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>Bank Account</Label>
                  <Select 
                    value={formData.bank_account_id} 
                    onChange={e => setFormData({ ...formData, bank_account_id: e.target.value })}
                  >
                    <option value="">-- Select Bank Account --</option>
                    {bankAccounts?.map((bank: any) => (
                      <option key={bank.id} value={bank.id}>{bank.bank_name} - {bank.account_number}</option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reference No</Label>
                <Input 
                  value={formData.reference_no} 
                  onChange={e => setFormData({ ...formData, reference_no: e.target.value })} 
                />
              </div>
              <div>
                <Label>Remarks</Label>
                <textarea 
                  className="w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 outline-none"
                  value={formData.remarks} 
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  rows={1}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Record Payment</Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
