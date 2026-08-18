import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import { useCreateLoan, useLoanEntities, useBankAccounts, useUnconsumedDebits, useUnconsumedCredits } from '../hooks'
import { format } from 'date-fns'

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateLoanModal({ open, onClose }: Props) {
  const [formData, setFormData] = useState({
    loan_type: 'TAKEN',
    party_id: '',
    party_type: 'ENTITY',
    principal_amount: '',
    interest_rate_pa: '0',
    tenor_months: '12',
    emi_amount: '0',
    disbursement_date: format(new Date(), 'yyyy-MM-dd'),
    start_date: format(new Date(), 'yyyy-MM-dd'),
    payment_mode: 'Bank Transfer',
    bank_account_id: '',
    bank_statement_entry_id: '',
    reference_no: '',
    remarks: ''
  })

  const { data: entities } = useLoanEntities()
  const { data: bankAccounts } = useBankAccounts()
  const { data: debits } = useUnconsumedDebits()
  const { data: credits } = useUnconsumedCredits()
  const createMutation = useCreateLoan()

  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        disbursement_date: format(new Date(), 'yyyy-MM-dd'),
        start_date: format(new Date(), 'yyyy-MM-dd'),
        principal_amount: '',
        reference_no: '',
        remarks: '',
        bank_statement_entry_id: ''
      }))
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const party = entities?.find((e: any) => e.id.toString() === formData.party_id)
    
    let mappedPartyType = (party?.entity_type || 'OTHER').toUpperCase()
    if (mappedPartyType === 'FINANCIAL INSTITUTION') {
      mappedPartyType = 'BANK'
    }

    const payload = {
      ...formData,
      party_type: mappedPartyType,
      party_name: party?.entity_name || 'Unknown',
      principal_amount: Number(formData.principal_amount),
      interest_rate_pa: Number(formData.interest_rate_pa),
      tenor_months: Number(formData.tenor_months),
      emi_amount: Number(formData.emi_amount),
      bank_account_id: formData.bank_account_id ? Number(formData.bank_account_id) : null,
      bank_statement_entry_id: formData.bank_statement_entry_id ? Number(formData.bank_statement_entry_id) : null,
      user_id: 1 
    }

    createMutation.mutate(payload, {
      onSuccess: () => onClose()
    })
  }

  const bankStatements = formData.loan_type === 'TAKEN' ? credits : debits;

  return (
    <Dialog open={open} onClose={onClose} title="Disburse New Loan" widthClass="max-w-2xl">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Loan Type</Label>
            <Select 
              value={formData.loan_type} 
              onChange={e => setFormData({ ...formData, loan_type: e.target.value, bank_statement_entry_id: '' })}
              required
            >
              <option value="TAKEN">Money Borrowed (Loan Taken)</option>
              <option value="GIVEN">Money Lent (Loan Given)</option>
            </Select>
          </div>

          <div>
            <Label>Party (Entity)</Label>
            <Select 
              value={formData.party_id} 
              onChange={e => setFormData({ ...formData, party_id: e.target.value })}
              required
            >
              <option value="">-- Select Entity --</option>
              {entities?.filter((e: any) => e.is_active).map((entity: any) => (
                <option key={entity.id} value={entity.id}>{entity.entity_name} ({entity.entity_type})</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <Label>Principal Amount</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.principal_amount} 
              onChange={e => setFormData({ ...formData, principal_amount: e.target.value })} 
              required
            />
          </div>
          <div>
            <Label>Interest % (p.a.)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.interest_rate_pa} 
              onChange={e => setFormData({ ...formData, interest_rate_pa: e.target.value })} 
            />
          </div>
          <div>
            <Label>Tenor (Months)</Label>
            <Input 
              type="number"
              value={formData.tenor_months} 
              onChange={e => setFormData({ ...formData, tenor_months: e.target.value })} 
            />
          </div>
          <div>
            <Label>EMI Amount</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.emi_amount} 
              onChange={e => setFormData({ ...formData, emi_amount: e.target.value })} 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Disbursement Date</Label>
            <Input 
              type="date"
              value={formData.disbursement_date} 
              onChange={e => setFormData({ ...formData, disbursement_date: e.target.value })} 
              required
            />
          </div>
          <div>
            <Label>Repayment Start Date</Label>
            <Input 
              type="date"
              value={formData.start_date} 
              onChange={e => setFormData({ ...formData, start_date: e.target.value })} 
              required
            />
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-semibold mb-3">Disbursement Transaction Details</h4>
          
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

            {formData.payment_mode === 'Bank Transfer' && (
              <div>
                <Label>Bank Statement Link (Smart Resolution)</Label>
                <Select 
                  value={formData.bank_statement_entry_id} 
                  onChange={e => {
                  const stmtId = e.target.value;
                  const selectedStmt = bankStatements?.find((s: any) => String(s.id) === stmtId);
                  const newUpdates: any = { bank_statement_entry_id: stmtId, bank_account_id: '' };
                  if (selectedStmt) {
                    const stmtDate = format(new Date(selectedStmt.transaction_date), 'yyyy-MM-dd');
                    newUpdates.disbursement_date = stmtDate;
                    newUpdates.start_date = stmtDate;
                    const available = Number(selectedStmt.credit_amount || selectedStmt.debit_amount || 0) - Number(selectedStmt.consumed_amount || 0);
                    if (available > 0) {
                      newUpdates.principal_amount = String(available);
                    }
                  }
                  setFormData(prev => ({ ...prev, ...newUpdates }));
                }}
                  required={formData.payment_mode === 'Bank Transfer'}
                >
                  <option value="">-- Manual Entry (No Link) --</option>
                  {bankStatements?.map((stmt: any) => (
                    <option key={stmt.id} value={stmt.id}>
                      {format(new Date(stmt.transaction_date), 'dd MMM')} - {stmt.particulars} - {Number(stmt.credit_amount || stmt.debit_amount || 0) - Number(stmt.consumed_amount || 0)} available
                    </option>
                  ))}
                </Select>
              </div>
            )}
            
            {formData.payment_mode === 'Cheque' && (
              <div>
                <Label>Bank Account</Label>
                <Select 
                  value={formData.bank_account_id} 
                  onChange={e => setFormData({ ...formData, bank_account_id: e.target.value })}
                  required
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
            {formData.payment_mode === 'Cheque' && (
              <div>
                <Label>Reference No</Label>
                <Input 
                  value={formData.reference_no} 
                  onChange={e => setFormData({ ...formData, reference_no: e.target.value })} 
                />
              </div>
            )}
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
          <Button type="submit" loading={createMutation.isPending}>Disburse Loan</Button>
        </div>
      </form>
    </Dialog>
  )
}
