import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { useCreateEmployee, useDesignations, useMasterBanks } from '../hooks'

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateEmployeeDrawer({ open, onClose }: Props) {
  const { mutate, isPending } = useCreateEmployee()
  const { data: designations = [] } = useDesignations()
  const { data: banks = [] } = useMasterBanks()

  const [formData, setFormData] = useState({
    full_name: '',
    designation_id: '',
    email: '',
    contact_primary: '',
    contact_secondary: '',
    address: '',
    joining_date: new Date().toISOString().split('T')[0],
    salary: '',
    gender: 'Male',
    aadhar_no: '',
    license_no: '',
    bank_name: '',
    account_no: '',
    ifsc_code: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Convert salary string to number for payload
    const payload = {
      ...formData,
      salary: parseFloat(formData.salary) || 0,
      designation_id: parseInt(formData.designation_id) || null
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
      title="Create New Employee"
      description="Add a new employee to the system."
      widthClass="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : 'Create Employee'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Personal Details */}
        <section className="space-y-4">
          <h3 className="font-semibold text-ink-900 border-b border-border-subtle pb-2">Personal Details</h3>
          <div className="grid grid-cols-2 gap-4">
            
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input name="full_name" required value={formData.full_name} onChange={handleChange} />
            </div>
            
            <div className="space-y-1">
              <Label>Gender</Label>
              <select 
                name="gender" 
                value={formData.gender} 
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <Label>Primary Contact *</Label>
              <Input name="contact_primary" required value={formData.contact_primary} onChange={handleChange} />
            </div>

            <div className="space-y-1">
              <Label>Secondary Contact</Label>
              <Input name="contact_secondary" value={formData.contact_secondary} onChange={handleChange} />
            </div>
            
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" name="email" value={formData.email} onChange={handleChange} />
            </div>
            
            <div className="col-span-2 space-y-1">
              <Label>Address</Label>
              <Input name="address" value={formData.address} onChange={handleChange} />
            </div>
          </div>
        </section>

        {/* Employment Details */}
        <section className="space-y-4">
          <h3 className="font-semibold text-ink-900 border-b border-border-subtle pb-2">Employment Details</h3>
          <div className="grid grid-cols-2 gap-4">
            
            <div className="space-y-1">
              <Label>Designation *</Label>
              <select 
                name="designation_id" 
                required
                value={formData.designation_id} 
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Select Designation</option>
                {designations?.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.title} ({d.department})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Joining Date</Label>
              <Input type="date" name="joining_date" required value={formData.joining_date} onChange={handleChange} />
            </div>
            
            <div className="space-y-1">
              <Label>Initial Salary (₹)</Label>
              <Input type="number" name="salary" placeholder="0.00" value={formData.salary} onChange={handleChange} />
            </div>
          </div>
        </section>

        {/* Identity & Banking */}
        <section className="space-y-4">
          <h3 className="font-semibold text-ink-900 border-b border-border-subtle pb-2">Identity & Banking</h3>
          <div className="grid grid-cols-2 gap-4">
            
            <div className="space-y-1">
              <Label>Aadhar No</Label>
              <Input name="aadhar_no" value={formData.aadhar_no} onChange={handleChange} />
            </div>

            <div className="space-y-1">
              <Label>Driving License No</Label>
              <Input name="license_no" value={formData.license_no} onChange={handleChange} />
            </div>
            
            <div className="space-y-1">
              <Label>Bank Name</Label>
              <select 
                name="bank_name" 
                value={formData.bank_name} 
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Select Bank</option>
                {banks?.map((b: any) => (
                  <option key={b.id} value={b.bank_name}>{b.bank_name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1">
              <Label>Account Number</Label>
              <Input name="account_no" value={formData.account_no} onChange={handleChange} />
            </div>

            <div className="space-y-1">
              <Label>IFSC Code</Label>
              <Input name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} />
            </div>
          </div>
        </section>

      </form>
    </Drawer>
  )
}
