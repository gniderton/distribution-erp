import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { useEmployees, useBulkSalaryAdvance, useUnconsumedDebits } from '../hooks'

export function BulkAdvanceGrid() {
  const { data: employees = [], isLoading: isLoadingEmp } = useEmployees()
  const { data: debits = [], isLoading: isLoadingDebits } = useUnconsumedDebits()
  const { mutate, isPending } = useBulkSalaryAdvance()

  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Online'>('Cash')
  const [bankStatementEntryId, setBankStatementEntryId] = useState<string>('')
  const [remarks, setRemarks] = useState('')
  const [advances, setAdvances] = useState<Record<string, string>>({})

  const handleAdvanceChange = (employeeId: string, value: string) => {
    setAdvances(prev => ({
      ...prev,
      [employeeId]: value
    }))
  }

  const activeEmployees = useMemo(() => {
    return employees.filter((e: any) => e.employment_status === 'Active')
  }, [employees])

  const hasChanges = Object.keys(advances).some(k => advances[k].trim() !== '' && Number(advances[k]) > 0)

  const handleSubmit = () => {
    if (paymentMode === 'Online' && !bankStatementEntryId) {
      alert("Please select a bank statement entry for Online payments.")
      return
    }

    const advancePayload = Object.entries(advances)
      .filter(([_, amount]) => amount.trim() !== '' && Number(amount) > 0)
      .map(([id, amount]) => ({
        employee_id: parseInt(id),
        amount: parseFloat(amount),
        payment_mode: paymentMode,
        bank_statement_entry_id: paymentMode === 'Online' ? parseInt(bankStatementEntryId) : null
      }))

    if (advancePayload.length === 0) return

    mutate({ 
      advances: advancePayload,
      advance_date: advanceDate,
      remarks: remarks || 'Salary Advance'
    }, {
      onSuccess: () => {
        setAdvances({})
        setRemarks('')
        setBankStatementEntryId('')
      }
    })
  }

  if (isLoadingEmp || isLoadingDebits) {
    return <div className="h-64 flex items-center justify-center text-ink-500">Loading data...</div>
  }

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="shrink-0 flex justify-between items-start">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Issue Salary Advances</h2>
          <p className="text-ink-600 text-sm">Issue advances to multiple employees. Select a single payment method for the batch.</p>
        </div>
        
        <div className="flex flex-wrap gap-4 justify-end max-w-2xl">
          <div className="space-y-1 w-36">
            <Label>Date *</Label>
            <Input type="date" value={advanceDate} onChange={e => setAdvanceDate(e.target.value)} required />
          </div>
          <div className="space-y-1 w-36">
            <Label>Payment Mode *</Label>
            <select 
              value={paymentMode}
              onChange={e => {
                setPaymentMode(e.target.value as 'Cash' | 'Online')
                if (e.target.value === 'Cash') setBankStatementEntryId('')
              }}
              className="w-full h-[38px] px-3 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
            >
              <option value="Cash">Cash</option>
              <option value="Online">Online</option>
            </select>
          </div>
          
          {paymentMode === 'Online' && (
            <div className="space-y-1 w-64">
              <Label>Bank Statement Entry *</Label>
              <select 
                value={bankStatementEntryId}
                onChange={e => setBankStatementEntryId(e.target.value)}
                className="w-full h-[38px] px-3 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
                required
              >
                <option value="">-- Select Transaction --</option>
                {debits.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {new Date(d.transaction_date).toLocaleDateString()} - {d.particulars} (₹{Number(d.debit_amount - d.consumed_amount).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1 w-48">
            <Label>Remarks</Label>
            <Input placeholder="e.g. Festival Advance" value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg flex flex-col">
        <div className="overflow-y-auto flex-1 scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead className="bg-ink-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle">Code</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle">Designation</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle w-48 text-right">Advance Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {activeEmployees.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ink-500">No active employees found.</td>
                </tr>
              )}
              {activeEmployees.map((emp: any) => (
                <tr key={emp.id} className="hover:bg-ink-50/50">
                  <td className="px-4 py-2 font-mono text-xs text-ink-600">{emp.employee_code}</td>
                  <td className="px-4 py-2 font-medium text-ink-900 text-sm">{emp.full_name}</td>
                  <td className="px-4 py-2 text-ink-600 text-sm">{emp.designation_name}</td>
                  <td className="px-4 py-1 flex justify-end">
                    <Input 
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="1"
                      value={advances[emp.id] || ''}
                      onChange={(e) => handleAdvanceChange(emp.id, e.target.value)}
                      className="h-8 text-sm w-32 text-right"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="shrink-0 flex justify-between items-center bg-ink-50 -mx-6 -mb-6 px-6 py-4 border-t border-border-subtle">
        <div className="text-sm text-ink-600">
          {Object.keys(advances).filter(k => advances[k].trim() !== '' && Number(advances[k]) > 0).length} advances pending submission
        </div>
        <Button onClick={handleSubmit} disabled={!hasChanges || isPending}>
          {isPending ? 'Submitting...' : 'Issue Advances'}
        </Button>
      </div>
    </div>
  )
}
