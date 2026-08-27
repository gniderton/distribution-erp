import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { assetsApi } from '../../api'
import { useQueryClient } from '@tanstack/react-query'

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateCategoryModal({ open, onClose }: Props) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    category_name: '',
    default_depreciation_rate: '',
    default_depreciation_method: 'Straight Line'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await assetsApi.createAssetCategory(formData)
      queryClient.invalidateQueries({ queryKey: ['asset-categories-list'] })
      onClose()
    } catch (err) {
      console.error(err)
      alert("Failed to create category")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create Asset Category">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        
        <div>
          <Label>Category Name</Label>
          <Input 
            name="category_name"
            required
            value={formData.category_name}
            onChange={handleChange}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Default Dep. Rate (%)</Label>
            <Input 
              name="default_depreciation_rate"
              type="number"
              step="0.01"
              required
              value={formData.default_depreciation_rate}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label>Default Dep. Method</Label>
            <Input 
              name="default_depreciation_method"
              value={formData.default_depreciation_method}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
