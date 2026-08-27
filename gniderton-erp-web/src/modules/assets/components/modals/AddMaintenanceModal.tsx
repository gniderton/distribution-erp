import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { assetsApi } from '../../api'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  asset: any
}

export function AddMaintenanceModal({ open, onClose, onSuccess, asset }: Props) {
  const [formData, setFormData] = useState({
    maintenance_date: new Date().toISOString().split('T')[0],
    amount: '',
    service_provider: '',
    warranty_expiry_date: '',
    remarks: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!asset) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await assetsApi.addMaintenanceLog(asset.id, formData)
      toast.success('Maintenance logged successfully')
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.error || 'Failed to log maintenance')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Log Maintenance & Repairs">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="bg-blue-50 text-blue-900 p-4 rounded-lg border border-blue-100 text-sm mb-4 space-y-2">
          <p><strong>Note: This is an informational operations log.</strong> It does not create accounting journal entries or affect your bank ledger. Use this form for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>In-House Repairs:</strong> When own employees fix the asset (no external cash payment).</li>
            <li><strong>Warranty Work:</strong> When a repair costs ₹0 but you need a service record.</li>
            <li><strong>Part Warranties:</strong> Track expiry dates of newly installed sub-parts (e.g. new battery).</li>
          </ul>
          <p className="text-xs text-blue-700 italic mt-2">To record a paid vendor invoice that affects your accounting, use the standard Expense form and tag this asset.</p>
        </div>
        <div>
          <Label>Maintenance Date</Label>
          <Input 
            type="date"
            required
            value={formData.maintenance_date}
            onChange={e => setFormData({ ...formData, maintenance_date: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Cost / Amount (₹)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Service Provider</Label>
            <Input 
              value={formData.service_provider}
              onChange={e => setFormData({ ...formData, service_provider: e.target.value })}
              placeholder="e.g. AutoFix Garage"
            />
          </div>
        </div>

        <div>
          <Label>Warranty Expiry (Optional)</Label>
          <Input 
            type="date"
            value={formData.warranty_expiry_date}
            onChange={e => setFormData({ ...formData, warranty_expiry_date: e.target.value })}
          />
        </div>

        <div>
          <Label>Remarks / Details</Label>
          <Input 
            value={formData.remarks}
            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
            placeholder="e.g. Replaced 4 tires and oil change"
            required
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Save Log</Button>
        </div>
      </form>
    </Dialog>
  )
}
