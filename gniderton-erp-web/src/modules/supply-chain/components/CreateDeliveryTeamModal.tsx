import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supply_chainApi } from '../api'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateDeliveryTeamModal({ isOpen, onClose, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [driverId, setDriverId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [helperId, setHelperId] = useState('')
  
  const [employees, setEmployees] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      supply_chainApi.getAllEmployees().then(setEmployees).catch(console.error)
      supply_chainApi.getDeliveryVehicles().then(setVehicles).catch(console.error)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Team name is required')
      return
    }

    setLoading(true)
    setError('')
    try {
      await supply_chainApi.createDeliveryTeam({ 
        name: name.trim(),
        driver_id: driverId ? parseInt(driverId) : undefined,
        vehicle_id: vehicleId ? parseInt(vehicleId) : undefined,
        helper_ids: helperId ? [parseInt(helperId)] : undefined
      })
      
      // Reset form
      setName('')
      setDriverId('')
      setVehicleId('')
      setHelperId('')
      
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create team')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-border-subtle">
        <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-surface">
          <div>
            <h3 className="font-semibold text-ink-900 text-sm">Create Delivery Team</h3>
            <p className="text-[10px] text-ink-500 mt-0.5">Add a new team for supply chain operations.</p>
          </div>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-ink-600 uppercase tracking-wider mb-1.5">
                Team Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Team Alpha (North)"
                className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 text-ink-900 placeholder:text-ink-400"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-600 uppercase tracking-wider mb-1.5">
                Vehicle
              </label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 text-ink-900"
              >
                <option value="">Select a vehicle...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.vehicle_number} {v.vehicle_type ? `(${v.vehicle_type})` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-600 uppercase tracking-wider mb-1.5">
                Primary Driver
              </label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 text-ink-900"
              >
                <option value="">Select a driver...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-600 uppercase tracking-wider mb-1.5">
                Teammate / Helper
              </label>
              <select
                value={helperId}
                onChange={(e) => setHelperId(e.target.value)}
                className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 text-ink-900"
              >
                <option value="">Select a teammate...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>
            
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border-subtle text-ink-700 rounded-lg hover:bg-ink-50 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
