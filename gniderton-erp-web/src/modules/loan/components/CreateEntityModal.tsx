import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import { useCreateEntity, useEmployees } from '../hooks'

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateEntityModal({ open, onClose }: Props) {
  const [formData, setFormData] = useState({
    entity_type: 'Other',
    role_type: 'Vendor',
    entity_name: '',
    reference_id: '',
    contact_number: '',
    email: '',
    address: '',
    notes: '',
    is_active: true
  })

  const { data: employees } = useEmployees()
  const createMutation = useCreateEntity()

  useEffect(() => {
    if (open) {
      setFormData({
        entity_type: 'Other',
        role_type: 'Vendor',
        entity_name: '',
        reference_id: '',
        contact_number: '',
        email: '',
        address: '',
        notes: '',
        is_active: true
      })
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData, {
      onSuccess: () => onClose()
    })
  }

  const isEmployee = formData.entity_type === 'Employee'

  return (
    <Dialog open={open} onClose={onClose} title="Create Loan Entity" widthClass="max-w-lg">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Entity Type</Label>
            <Select 
              value={formData.entity_type} 
              onChange={e => setFormData({ ...formData, entity_type: e.target.value, reference_id: '', entity_name: '' })}
              required
            >
              <option value="Other">Other</option>
              <option value="Employee">Employee</option>
              <option value="Partner">Partner</option>
              <option value="Bank">Bank</option>
              <option value="Director">Director</option>
            </Select>
          </div>

          <div>
            <Label>Role Type</Label>
            <Select 
              value={formData.role_type} 
              onChange={e => setFormData({ ...formData, role_type: e.target.value })}
              required
            >
              <option value="Vendor">Vendor</option>
              <option value="Customer">Customer</option>
              <option value="Employee">Employee</option>
              <option value="Financier">Financier</option>
            </Select>
          </div>
        </div>

        {isEmployee ? (
          <div>
            <Label>Select Employee</Label>
            <Select
              value={formData.reference_id}
              onChange={e => setFormData({ ...formData, reference_id: e.target.value })}
              required={isEmployee}
            >
              <option value="">-- Select Employee --</option>
              {employees?.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.full_name || emp.name} ({emp.employee_code})</option>
              ))}
            </Select>
          </div>
        ) : (
          <div>
            <Label>Entity Name</Label>
            <Input 
              value={formData.entity_name} 
              onChange={e => setFormData({ ...formData, entity_name: e.target.value })} 
              required={!isEmployee}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Contact Number</Label>
            <Input 
              value={formData.contact_number} 
              onChange={e => setFormData({ ...formData, contact_number: e.target.value })} 
              disabled={isEmployee}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input 
              type="email"
              value={formData.email} 
              onChange={e => setFormData({ ...formData, email: e.target.value })} 
              disabled={isEmployee}
            />
          </div>
        </div>

        <div>
          <Label>Address</Label>
          <textarea 
            className="w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 outline-none"
            value={formData.address} 
            onChange={e => setFormData({ ...formData, address: e.target.value })}
            rows={2}
            disabled={isEmployee}
          />
        </div>

        <div>
          <Label>Notes</Label>
          <textarea 
            className="w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 outline-none"
            value={formData.notes} 
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={createMutation.isPending}>Save Entity</Button>
        </div>
      </form>
    </Dialog>
  )
}
