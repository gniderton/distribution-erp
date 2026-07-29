import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { useUpdateSalary } from '../hooks'

interface Props {
  employeeId: string | number
  currentSalary: number
  open: boolean
  onClose: () => void
}

export function UpdateSalaryDialog({ employeeId, currentSalary, open, onClose }: Props) {
  const { mutate, isPending } = useUpdateSalary()
  
  const [formData, setFormData] = useState({
    new_salary: currentSalary?.toString() || '',
    effective_date: new Date().toISOString().split('T')[0],
    reason: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    mutate({
      id: employeeId,
      payload: {
        new_salary: Number(formData.new_salary),
        effective_date: formData.effective_date,
        reason: formData.reason || 'Salary Revision'
      }
    }, {
      onSuccess: () => {
        onClose()
      }
    })
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      title="Update Salary"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Updating...' : 'Update Salary'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="space-y-1">
          <Label>Current Salary</Label>
          <div className="font-semibold text-ink-900 text-lg">₹{Number(currentSalary || 0).toLocaleString()}</div>
        </div>

        <div className="space-y-1">
          <Label>New Salary (₹) *</Label>
          <Input 
            type="number" 
            name="new_salary" 
            required 
            min="0"
            step="1"
            value={formData.new_salary} 
            onChange={handleChange} 
          />
        </div>

        <div className="space-y-1">
          <Label>Effective Date *</Label>
          <Input 
            type="date" 
            name="effective_date" 
            required 
            value={formData.effective_date} 
            onChange={handleChange} 
          />
        </div>

        <div className="space-y-1">
          <Label>Reason (Optional)</Label>
          <Input 
            name="reason" 
            placeholder="e.g. Annual Appraisal"
            value={formData.reason} 
            onChange={handleChange} 
          />
        </div>
      </form>
    </Dialog>
  )
}
