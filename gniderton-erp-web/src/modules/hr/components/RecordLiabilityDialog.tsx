import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { useCreateLiability, useSalesInvoicesLookup } from '../hooks'

interface Props {
  employeeId: string | number
  open: boolean
  onClose: () => void
}

export function RecordLiabilityDialog({ employeeId, open, onClose }: Props) {
  const { mutate, isPending } = useCreateLiability()
  const { data: invoices, isLoading: isLoadingInvoices } = useSalesInvoicesLookup()
  
  const [formData, setFormData] = useState({
    amount: '',
    type: 'DAMAGE',
    description: '',
    invoice_id: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Defaulting user_id to 1 as specified in the plan (temporary until auth hookup)
    const payload = {
      employee_id: employeeId,
      amount: Number(formData.amount),
      type: formData.type,
      description: formData.description,
      invoice_id: formData.invoice_id ? Number(formData.invoice_id) : undefined,
      user_id: 1 
    }

    mutate(payload, {
      onSuccess: () => {
        onClose()
      }
    })
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      title="Record Employee Liability"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !formData.amount || !formData.description}>
            {isPending ? 'Recording...' : 'Record Liability'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        
        <div className="space-y-1">
          <Label>Amount (₹) *</Label>
          <Input 
            type="number" 
            name="amount" 
            required 
            min="0"
            step="0.01"
            value={formData.amount} 
            onChange={handleChange} 
            placeholder="0.00"
          />
        </div>

        <div className="space-y-1">
          <Label>Liability Type *</Label>
          <select 
            name="type"
            required
            value={formData.type}
            onChange={handleChange}
            className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
          >
            <option value="DAMAGE">Property/Equipment Damage</option>
            <option value="SHORTAGE">Cash/Stock Shortage</option>
            <option value="FINE">Fine/Penalty</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label>Description *</Label>
          <Input 
            name="description" 
            required
            placeholder="e.g. Broken scanner screen"
            value={formData.description} 
            onChange={handleChange} 
          />
        </div>

        <div className="space-y-1">
          <Label>Link to Sales Invoice (Optional)</Label>
          <select 
            name="invoice_id"
            value={formData.invoice_id}
            onChange={handleChange}
            className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
          >
            <option value="">-- No Invoice Linked --</option>
            {!isLoadingInvoices && invoices?.map((inv: any) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoice_number} ({inv.customer_name}) - ₹{Number(inv.grand_total).toLocaleString()}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-500 mt-1">
            Linking an invoice will automatically create a customer payment adjustment for the deducted amount.
          </p>
        </div>

      </form>
    </Dialog>
  )
}
