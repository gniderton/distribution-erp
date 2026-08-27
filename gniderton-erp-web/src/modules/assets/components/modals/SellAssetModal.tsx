import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { assetsApi } from '../../api'
import { formatCurrency } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  asset: any
  onSuccess: () => void
}

export function SellAssetModal({ open, onClose, asset, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    sale_date: new Date().toISOString().split('T')[0],
    sale_amount: '',
    customer_id: '',
    remarks: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!asset) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await assetsApi.createAssetsSale(asset.id, formData)
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      alert("Failed to sell asset")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Sell Asset">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        
        <div className="bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-100 mb-4">
          <p className="text-sm font-medium">Asset: {asset.asset_name}</p>
          <p className="text-xs mt-1">Net Book Value: {formatCurrency(asset.net_book_value)}</p>
        </div>

        <div>
          <Label>Sale Date</Label>
          <Input 
            type="date"
            required
            value={formData.sale_date}
            onChange={e => setFormData({ ...formData, sale_date: e.target.value })}
          />
        </div>

        <div>
          <Label>Sale Amount (₹)</Label>
          <Input 
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.sale_amount}
            onChange={e => setFormData({ ...formData, sale_amount: e.target.value })}
          />
        </div>

        <div>
          <Label>Customer ID (Entity)</Label>
          <Input 
            type="number"
            required
            value={formData.customer_id}
            onChange={e => setFormData({ ...formData, customer_id: e.target.value })}
          />
        </div>

        <div>
          <Label>Remarks</Label>
          <Input 
            value={formData.remarks}
            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Confirm Sale'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
