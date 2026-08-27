import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Trash2 } from 'lucide-react'
import { assetsApi } from '../../api'
import { formatCurrency } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  asset: any
  onSuccess: () => void
}

export function ScrapAssetModal({ open, onClose, asset, onSuccess }: Props) {
  const [scrapDate, setScrapDate] = useState(new Date().toISOString().split('T')[0])
  const [scrapAmount, setScrapAmount] = useState<number>(0)
  const [remarks, setRemarks] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!asset) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await assetsApi.scrapAsset(asset.id, {
        scrap_date: scrapDate,
        scrap_amount: scrapAmount,
        remarks
      })
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      alert("Failed to scrap asset")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Scrap / Write-off Asset">
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        
        <div className="p-3 bg-red-50 rounded-lg border border-red-100 mb-4">
          <p className="text-sm font-medium text-red-900 mb-1">Asset: {asset.asset_name}</p>
          <p className="text-xs text-red-700">Net Book Value: {formatCurrency(asset.net_book_value)}</p>
          <p className="text-xs text-red-700 mt-1">This action is irreversible and will mark the asset as Scrapped.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1">Scrap Date</label>
          <input 
            type="date" 
            required 
            className="w-full input"
            value={scrapDate}
            onChange={e => setScrapDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1">Recovery Amount (if any)</label>
          <input 
            type="number" 
            min="0"
            step="0.01"
            className="w-full input"
            value={scrapAmount}
            onChange={e => setScrapAmount(Number(e.target.value))}
            placeholder="0.00"
          />
          <p className="text-[10px] text-ink-500 mt-1">Leave as 0 if this is a total loss write-off.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1">Reason / Remarks</label>
          <textarea 
            required
            rows={3}
            className="w-full input"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Describe why the asset is being scrapped..."
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 text-white border-red-600 gap-2">
            <Trash2 size={16} />
            {isSubmitting ? 'Processing...' : 'Confirm Write-off'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
