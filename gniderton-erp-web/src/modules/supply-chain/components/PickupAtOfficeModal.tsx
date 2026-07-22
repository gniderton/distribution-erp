import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useMarkSelfCollected } from '../hooks'
import { Package, User } from 'lucide-react'

export function PickupAtOfficeModal({ open, onClose, invoice }: { open: boolean, onClose: () => void, invoice: any | null }) {
  const [collectorName, setCollectorName] = useState('')
  const [collectorPhone, setCollectorPhone] = useState('')
  const [collectorIdType, setCollectorIdType] = useState('Aadhaar')
  const [collectorIdNumber, setCollectorIdNumber] = useState('')
  const [notes, setNotes] = useState('')

  const markMutation = useMarkSelfCollected()

  const handleSave = () => {
    if (!invoice?.id || !collectorName || !collectorPhone || !collectorIdNumber) return

    markMutation.mutate({
      invoice_id: invoice.id,
      collector_name: collectorName,
      collector_phone: collectorPhone,
      collector_id_type: collectorIdType,
      collector_id_number: collectorIdNumber,
      notes: notes,
      created_by: 1
    }, {
      onSuccess: () => {
        setCollectorName('')
        setCollectorPhone('')
        setCollectorIdType('Aadhaar')
        setCollectorIdNumber('')
        setNotes('')
        onClose()
      }
    })
  }

  const footer = (
    <div className="flex justify-end gap-2 w-full">
      <Button variant="secondary" onClick={onClose} disabled={markMutation.isPending}>Cancel</Button>
      <Button 
        onClick={handleSave} 
        disabled={!collectorName || !collectorPhone || !collectorIdNumber || markMutation.isPending}
      >
        {markMutation.isPending ? 'Saving...' : 'Mark Collected'}
      </Button>
    </div>
  )

  return (
    <Drawer 
      open={open} 
      onClose={onClose} 
      title="Pick Up at Office" 
      footer={footer}
    >
      {invoice && (
        <div className="space-y-6">
          <div className="bg-brand-50 rounded-xl p-4 border border-brand-200">
            <div className="flex items-center gap-2 text-brand-700 font-semibold mb-2">
              <Package size={18} />
              Invoice Summary
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-brand-600/70 text-xs">Invoice Number</div>
                <div className="font-medium text-brand-900">{invoice.invoice_number}</div>
              </div>
              <div>
                <div className="text-brand-600/70 text-xs">Customer</div>
                <div className="font-medium text-brand-900">{invoice.customer_name}</div>
              </div>
              <div>
                <div className="text-brand-600/70 text-xs">Amount</div>
                <div className="font-medium text-brand-900">₹{Number(invoice.grand_total).toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-ink-900 font-semibold border-b border-border-subtle pb-2">
              <User size={18} />
              Collector Details
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-ink-700">Collector Name <span className="text-danger-500">*</span></label>
                <Input value={collectorName} onChange={e => setCollectorName(e.target.value)} placeholder="e.g. John Doe" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-ink-700">Phone Number <span className="text-danger-500">*</span></label>
                <Input value={collectorPhone} onChange={e => setCollectorPhone(e.target.value)} placeholder="e.g. 9876543210" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-ink-700">ID Type <span className="text-danger-500">*</span></label>
                <select 
                  className="w-full h-10 px-3 text-sm rounded-md border border-border-subtle bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                  value={collectorIdType}
                  onChange={e => setCollectorIdType(e.target.value)}
                >
                  <option value="Aadhaar">Aadhaar</option>
                  <option value="PAN">PAN</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-ink-700">ID Number <span className="text-danger-500">*</span></label>
                <Input value={collectorIdNumber} onChange={e => setCollectorIdNumber(e.target.value)} placeholder="e.g. 1234 5678 9012" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-ink-700">Notes (Optional)</label>
              <textarea 
                className="w-full p-3 text-sm rounded-md border border-border-subtle focus:border-brand-500 focus:ring-1 focus:ring-brand-500 min-h-[80px]"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional notes regarding pickup..."
              />
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}
