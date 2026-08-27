import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { assetsApi } from '../../api'
import { useQueryClient } from '@tanstack/react-query'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateAccountModal({ open, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await assetsApi.createAssetAccount(formData)
      queryClient.invalidateQueries({ queryKey: ['asset-accounts-list'] })
      onSuccess?.(); onClose();
    } catch (err) {
      console.error(err)
      alert("Failed to create account")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create Asset Account">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Account Code</Label>
            <Input 
              name="code"
              type="number"
              required
              placeholder="e.g. 1210"
              value={formData.code}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label>Account Name</Label>
            <Input 
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div>
          <Label>Description</Label>
          <Input 
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Create Account'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
