import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import { assetsApi } from '../../api'
import { useQueryClient } from '@tanstack/react-query'

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateAssetEntityModal({ open, onClose }: Props) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    entity_type: 'Vendor',
    entity_name: '',
    email: '',
    contact_number: '',
    gst_number: '',
    pan_number: '',
    opening_balance: '0'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await assetsApi.createAssetEntities(formData)
      queryClient.invalidateQueries({ queryKey: ['asset-entities'] })
      onClose()
    } catch (err) {
      console.error(err)
      alert("Failed to create entity")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create Asset Entity">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Entity Type</Label>
            <Select 
              name="entity_type"
              required
              value={formData.entity_type}
              onChange={handleChange}
            >
              <option value="Vendor">Vendor</option>
              <option value="Customer">Customer</option>
              <option value="Both">Both</option>
            </Select>
          </div>

          <div className="col-span-2">
            <Label>Entity Name</Label>
            <Input 
              name="entity_name"
              required
              value={formData.entity_name}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <Label>Email</Label>
            <Input 
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div>
            <Label>Contact Number</Label>
            <Input 
              name="contact_number"
              value={formData.contact_number}
              onChange={handleChange}
            />
          </div>

          <div>
            <Label>GST Number</Label>
            <Input 
              name="gst_number"
              value={formData.gst_number}
              onChange={handleChange}
            />
          </div>

          <div>
            <Label>PAN Number</Label>
            <Input 
              name="pan_number"
              value={formData.pan_number}
              onChange={handleChange}
            />
          </div>

          <div className="col-span-2">
            <Label>Opening Balance</Label>
            <Input 
              name="opening_balance"
              type="number"
              step="0.01"
              value={formData.opening_balance}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Create Entity'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
