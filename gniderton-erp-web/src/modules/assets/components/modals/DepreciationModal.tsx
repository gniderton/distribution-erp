import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { assetsApi } from '../../api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function DepreciationModal({ open, onClose, onSuccess }: Props) {
  const [periodDate, setPeriodDate] = useState(new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await assetsApi.createAssetsAutoDepreciate({ period_date: periodDate })
      alert(`Successfully ran depreciation for ${res.assets_processed} assets. Total: ₹${res.total_amount}`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      alert("Failed to run depreciation")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Run Month-End Depreciation">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        
        <div className="bg-brand-50 text-brand-800 p-3 rounded-lg border border-brand-100 text-sm mb-4">
          This will automatically calculate and record the straight-line depreciation for all Active assets for the selected month.
        </div>

        <div>
          <Label>Depreciation Period Date (End of Month)</Label>
          <Input 
            type="date"
            required
            value={periodDate}
            onChange={e => setPeriodDate(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Run Depreciation Engine'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
