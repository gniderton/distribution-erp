import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { assetsApi } from '../../api'
import toast from 'react-hot-toast'
import { Info } from 'lucide-react'

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
    <Dialog open={open} onClose={onClose} title="Log Maintenance & Repairs" widthClass="max-w-lg">
      <form onSubmit={handleSubmit} className="py-2 space-y-4">
        
        <div className="bg-brand-50 text-brand-900 p-3 rounded-lg border border-brand-100 flex gap-3 items-start shadow-sm">
          <Info className="text-brand-600 mt-0.5 shrink-0" size={18} />
          <div className="text-xs space-y-1.5 leading-relaxed">
            <p className="font-semibold">Informational Operations Log</p>
            <p className="text-brand-800/90">This form does not create accounting entries. Use it to record:</p>
            <ul className="list-disc pl-4 text-brand-800/80 space-y-0.5">
              <li><strong>In-House Repairs:</strong> Repairs done by employees without cash payments.</li>
              <li><strong>Warranty Work:</strong> Free repairs that still require a service record.</li>
              <li><strong>Part Warranties:</strong> Track expiry dates of newly installed components.</li>
            </ul>
            <p className="text-brand-700 italic mt-1 font-medium">For paid external repairs affecting accounting, use the standard Expense form instead.</p>
          </div>
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
