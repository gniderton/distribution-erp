import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import { assetsApi } from '../../api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function PurchaseAssetModal({ open, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    asset_name: '',
    category: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_cost: '',
    useful_life_years: '5',
    salvage_value: '0',
    vendor_id: '',
    asset_account_code: '1201' // Default generic asset account
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await assetsApi.createAssets(formData)
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      alert("Failed to purchase asset")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Purchase New Asset">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Asset Name</Label>
            <Input 
              required
              value={formData.asset_name}
              onChange={e => setFormData({ ...formData, asset_name: e.target.value })}
            />
          </div>
          
          <div>
            <Label>Category</Label>
            <Input 
              required
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            />
          </div>
          <div>
            <Label>Purchase Date</Label>
            <Input 
              type="date"
              required
              value={formData.purchase_date}
              onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
            />
          </div>

          <div>
            <Label>Purchase Cost (₹)</Label>
            <Input 
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.purchase_cost}
              onChange={e => setFormData({ ...formData, purchase_cost: e.target.value })}
            />
          </div>
          <div>
            <Label>Vendor ID</Label>
            <Input 
              type="number"
              required
              value={formData.vendor_id}
              onChange={e => setFormData({ ...formData, vendor_id: e.target.value })}
            />
          </div>

          <div>
            <Label>Useful Life (Years)</Label>
            <Input 
              type="number"
              required
              min="1"
              value={formData.useful_life_years}
              onChange={e => setFormData({ ...formData, useful_life_years: e.target.value })}
            />
          </div>
          <div>
            <Label>Salvage Value (₹)</Label>
            <Input 
              type="number"
              required
              min="0"
              value={formData.salvage_value}
              onChange={e => setFormData({ ...formData, salvage_value: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Register Purchase'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
