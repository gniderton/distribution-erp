import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { useEmployees, useBulkAttendance } from '../hooks'

export function BulkAttendanceGrid() {
  const { data: employees = [], isLoading } = useEmployees()
  const { mutate, isPending } = useBulkAttendance()

  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<'Absent' | 'Half-Day'>('Absent')
  const [remarks, setRemarks] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const activeEmployees = useMemo(() => {
    return employees.filter((e: any) => e.employment_status === 'Active')
  }, [employees])

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(activeEmployees.map((emp: any) => emp.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: number, checked: boolean) => {
    const newSet = new Set(selectedIds)
    if (checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    setSelectedIds(newSet)
  }

  const handleSubmit = () => {
    if (selectedIds.size === 0) return

    mutate({
      employee_ids: Array.from(selectedIds),
      attendance_date: attendanceDate,
      status: status,
      remarks: remarks || ''
    }, {
      onSuccess: () => {
        // Clear selection on success
        setSelectedIds(new Set())
        setRemarks('')
      }
    })
  }

  if (isLoading) {
    return <div className="h-64 flex items-center justify-center text-ink-500">Loading active employees...</div>
  }

  const isAllSelected = activeEmployees.length > 0 && selectedIds.size === activeEmployees.length
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < activeEmployees.length

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="shrink-0 flex justify-between items-start">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Bulk Attendance Entry</h2>
          <p className="text-ink-600 text-sm">Select employees to mark them as Absent or Half-Day. (Unselected remain Present).</p>
        </div>
        
        <div className="flex space-x-4">
          <div className="space-y-1 w-40">
            <Label>Date *</Label>
            <Input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} required />
          </div>
          <div className="space-y-1 w-40">
            <Label>Status *</Label>
            <select 
              value={status}
              onChange={e => setStatus(e.target.value as 'Absent' | 'Half-Day')}
              className="w-full h-[38px] px-3 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
            >
              <option value="Absent">Absent</option>
              <option value="Half-Day">Half-Day</option>
            </select>
          </div>
          <div className="space-y-1 w-48">
            <Label>Remarks (Optional)</Label>
            <Input placeholder="e.g. Sick Leave" value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg flex flex-col">
        <div className="overflow-y-auto flex-1 scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 w-12 border-b border-border-subtle">
                  <input 
                    type="checkbox" 
                    className="rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                    checked={isAllSelected}
                    ref={input => {
                      if (input) input.indeterminate = isIndeterminate
                    }}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle">Code</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle">Designation</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle text-right">Contact</th>
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
                  <td className="px-4 py-2">
                    <input 
                      type="checkbox"
                      className="rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                      checked={selectedIds.has(emp.id)}
                      onChange={(e) => handleSelectOne(emp.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-ink-600">{emp.employee_code}</td>
                  <td className="px-4 py-2 font-medium text-ink-900 text-sm">{emp.full_name}</td>
                  <td className="px-4 py-2 text-ink-600 text-sm">{emp.designation_name}</td>
                  <td className="px-4 py-2 text-ink-600 text-sm text-right font-mono text-xs">{emp.contact_primary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="shrink-0 flex justify-between items-center pt-4 mt-auto border-t border-border-subtle">
        <div className="text-sm text-ink-600">
          {selectedIds.size} employees selected for <span className="font-semibold text-ink-900">{status}</span>
        </div>
        <Button onClick={handleSubmit} disabled={selectedIds.size === 0 || isPending}>
          {isPending ? 'Saving...' : 'Save Attendance'}
        </Button>
      </div>
    </div>
  )
}
