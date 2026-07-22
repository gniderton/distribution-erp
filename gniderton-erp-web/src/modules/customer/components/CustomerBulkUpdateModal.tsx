import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customerApi } from '../api'

export function CustomerBulkUpdateModal({ open, onClose, selectedIds, onClearSelection }: { open: boolean; onClose: () => void; selectedIds: (string | number)[]; onClearSelection: () => void }) {
  const qc = useQueryClient()
  const [dseId, setDseId] = useState<string>('')
  const [routeId, setRouteId] = useState<string>('')

  const { data: routesData } = useQuery({ queryKey: ['routes'], queryFn: customerApi.routes })
  const { data: employeesData } = useQuery({ queryKey: ['employees'], queryFn: customerApi.employees })

  const routes = Array.isArray(routesData) ? routesData : routesData?.data || []
  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.data || []

  const updateMutation = useMutation({
    mutationFn: (payload: any) => customerApi.bulkEdit(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      onClearSelection()
      onClose()
    }
  })

  const handleUpdate = () => {
    if (!dseId && !routeId) return
    updateMutation.mutate({
      customerIds: selectedIds,
      dseId: dseId || undefined,
      routeId: routeId || undefined
    })
  }

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button 
        onClick={handleUpdate} 
        disabled={(!dseId && !routeId) || updateMutation.isPending}
      >
        {updateMutation.isPending ? 'Updating...' : 'Update Customers'}
      </Button>
    </>
  )

  return (
    <Dialog open={open} onClose={onClose} title="Bulk Update Customers" footer={footer} widthClass="max-w-md">
      <div className="space-y-4 mt-2">
        <p className="text-sm text-ink-600">
          Selected <strong>{selectedIds.length}</strong> customers to update.
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium text-ink-700">Assign New Executive</label>
          <select 
            className="w-full h-10 px-3 rounded-md border border-border bg-white"
            value={dseId}
            onChange={(e) => setDseId(e.target.value)}
          >
            <option value="">-- No Change --</option>
            {employees.map((emp: any) => (
              <option key={emp.id} value={emp.id}>{emp.full_name || emp.name || emp.username || emp.employee_name || emp.id}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-ink-700">Assign New Route</label>
          <select 
            className="w-full h-10 px-3 rounded-md border border-border bg-white"
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
          >
            <option value="">-- No Change --</option>
            {routes.map((route: any) => (
              <option key={route.id} value={route.id}>{route.route_name}</option>
            ))}
          </select>
        </div>
      </div>
    </Dialog>
  )
}
