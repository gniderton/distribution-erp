import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import { useQuery } from '@tanstack/react-query'
import { assetsApi } from '../../api'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  asset: any
}

export function AssignAssetModal({ open, onClose, onSuccess, asset }: Props) {
  const [formData, setFormData] = useState({
    employee_id: '',
    assigned_date: new Date().toISOString().split('T')[0],
    remarks: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => assetsApi.getEmployeesProfile()
  })

  if (!asset) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await assetsApi.assignAsset(asset.id, formData)
      toast.success('Asset assigned successfully')
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.error || 'Failed to assign asset')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Assign Asset to Employee">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        
        <div className="bg-brand-50 text-brand-800 p-3 rounded-lg border border-brand-100 text-sm mb-4">
          Assign <strong>{asset.asset_name}</strong> to an employee for tracking custody.
        </div>

        <div>
          <Label>Employee</Label>
          <Select 
            required
            value={formData.employee_id}
            onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
          >
            <option value="">-- Select Employee --</option>
            {employees.map((emp: any) => (
              <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Assignment Date</Label>
          <Input 
            type="date"
            required
            value={formData.assigned_date}
            onChange={e => setFormData({ ...formData, assigned_date: e.target.value })}
          />
        </div>

        <div>
          <Label>Remarks / Condition</Label>
          <Input 
            value={formData.remarks}
            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
            placeholder="e.g. Minor scratch on left side"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Assign Asset</Button>
        </div>
      </form>
    </Dialog>
  )
}
