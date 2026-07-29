import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { useEmployees, useBulkSalaryUpdate } from '../hooks'

export function BulkSalaryGrid() {
  const { data: employees = [], isLoading } = useEmployees()
  const { mutate, isPending } = useBulkSalaryUpdate()

  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState('')
  const [updates, setUpdates] = useState<Record<string, string>>({})

  const handleSalaryChange = (employeeId: string, value: string) => {
    setUpdates(prev => ({
      ...prev,
      [employeeId]: value
    }))
  }

  const activeEmployees = useMemo(() => {
    return employees.filter((e: any) => e.employment_status === 'Active')
  }, [employees])

  const hasChanges = Object.keys(updates).length > 0

  const handleSubmit = () => {
    // Only send the ones that actually have updates typed in
    const updatePayload = Object.entries(updates)
      .filter(([_, newSalary]) => newSalary.trim() !== '')
      .map(([id, newSalary]) => ({
        employee_id: parseInt(id),
        new_salary: parseFloat(newSalary)
      }))

    if (updatePayload.length === 0) return

    mutate({
      updates: updatePayload,
      effective_date: effectiveDate,
      reason: reason || 'Bulk Salary Revision'
    }, {
      onSuccess: () => {
        setUpdates({}) // Reset form on success
      }
    })
  }

  if (isLoading) {
    return <div className="h-64 flex items-center justify-center text-ink-500">Loading active employees...</div>
  }

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="shrink-0 flex justify-between items-start">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Bulk Salary Revision</h2>
          <p className="text-ink-600 text-sm">Update base salaries for multiple employees simultaneously.</p>
        </div>
        
        <div className="flex space-x-4">
          <div className="space-y-1 w-48">
            <Label>Effective Date *</Label>
            <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} required />
          </div>
          <div className="space-y-1 w-64">
            <Label>Reason</Label>
            <Input placeholder="e.g. Annual Appraisal" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg flex flex-col">
        <div className="overflow-y-auto flex-1 scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle">Code</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle">Designation</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle text-right">Current Salary</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle w-48">New Salary (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {activeEmployees.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-500">No active employees found.</td>
                </tr>
              )}
              {activeEmployees.map((emp: any) => (
                <tr key={emp.id} className="hover:bg-surface/50">
                  <td className="px-4 py-2 font-mono text-xs text-ink-600">{emp.employee_code}</td>
                  <td className="px-4 py-2 font-medium text-ink-900 text-sm">{emp.full_name}</td>
                  <td className="px-4 py-2 text-ink-600 text-sm">{emp.designation_name}</td>
                  <td className="px-4 py-2 text-ink-900 font-semibold text-sm text-right">
                    ₹{Number(emp.current_salary || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-1">
                    <Input 
                      type="number"
                      placeholder="No Change"
                      value={updates[emp.id] || ''}
                      onChange={(e) => handleSalaryChange(emp.id, e.target.value)}
                      className="h-8 text-sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="shrink-0 flex justify-between items-center pt-4 mt-auto border-t border-border-subtle">
        <div className="text-sm text-ink-600">
          {Object.keys(updates).filter(k => updates[k].trim() !== '').length} employees modified
        </div>
        <Button onClick={handleSubmit} disabled={!hasChanges || isPending}>
          {isPending ? 'Applying...' : 'Apply Salary Changes'}
        </Button>
      </div>
    </div>
  )
}
