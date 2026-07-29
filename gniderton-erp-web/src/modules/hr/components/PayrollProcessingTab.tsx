import { useState, useMemo } from 'react'
import { useSalaryPreview, useBulkSalaryPayment, useUnconsumedDebits } from '../hooks'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Input'
import { JobProgressBar } from '@/components/ui/JobProgressBar'
import { Play } from 'lucide-react'

export function PayrollProcessingTab() {
  const { data = [], isLoading, isError } = useSalaryPreview()
  const { data: debits = [] } = useUnconsumedDebits()
  const [jobId, setJobId] = useState<string | null>(null)
  
  const settleMutation = useBulkSalaryPayment()

  // Global settings
  const [globalPaymentMode, setGlobalPaymentMode] = useState<'Cash' | 'Online'>('Cash')
  const [globalBankStatementEntryId, setGlobalBankStatementEntryId] = useState<string>('')

  // Line-level overrides
  const [overrides, setOverrides] = useState<Record<number, { payment_mode?: 'Cash' | 'Online' | 'Default', bank_statement_entry_id?: string }>>({})

  const handleOverrideChange = (employeeId: number, field: 'payment_mode' | 'bank_statement_entry_id', value: string) => {
    setOverrides(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value
      }
    }))
  }

  const handleSettlePayroll = () => {
    if (globalPaymentMode === 'Online' && !globalBankStatementEntryId) {
        // We only require a global one if there are rows that use the default AND are online
        const needsGlobal = data.some((emp: any) => {
            const rowMode = overrides[emp.employee_id]?.payment_mode || 'Default'
            return rowMode === 'Default'
        })
        if (needsGlobal) {
            alert("Please select a Global Bank Statement Entry, or override all rows manually.")
            return
        }
    }

    const payload = {
      month: data.length > 0 ? data[0].month : new Date().getMonth() + 1, // Fallback to current month if no data
      year: data.length > 0 ? data[0].year : new Date().getFullYear(),
      payment_mode: globalPaymentMode,
      bank_statement_entry_id: globalPaymentMode === 'Online' ? parseInt(globalBankStatementEntryId) : null,
      payments: data.map((emp: any) => {
        const rowOverride = overrides[emp.employee_id] || {}
        
        let rowMode = rowOverride.payment_mode === 'Default' || !rowOverride.payment_mode ? null : rowOverride.payment_mode
        let rowBankEntry = rowMode === 'Online' && rowOverride.bank_statement_entry_id ? parseInt(rowOverride.bank_statement_entry_id) : null

        return {
          employee_id: emp.employee_id,
          base_salary: emp.base_salary,
          adjusted_base_salary: emp.adjusted_base_salary,
          absent_days: emp.absent_days,
          half_days: emp.half_days,
          leave_deduction: emp.leave_deduction,
          advance_deduction: emp.advance_deduction,
          loan_deduction: emp.loan_deduction,
          misc_liabilities: emp.misc_liabilities,
          bonus_addition: emp.bonus_addition,
          leave_encashment: emp.leave_encashment,
          total_deductions: emp.total_deductions,
          total_additions: emp.total_additions,
          net_salary: emp.net_salary,
          // Overrides (if null, backend will use the global ones)
          payment_mode: rowMode,
          bank_statement_entry_id: rowBankEntry
        }
      })
    }
    
    settleMutation.mutate(payload, {
      onSuccess: (res: any) => {
        if (res && res.jobId) {
          setJobId(res.jobId)
        }
      }
    })
  }

  const totalNetSalary = useMemo(() => {
      return data.reduce((sum: number, emp: any) => sum + Number(emp.net_salary || 0), 0)
  }, [data])

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-lg border border-ink-200">
        <div className="flex justify-between items-start">
            <div>
            <h2 className="text-lg font-bold text-ink-900">Payroll Processing</h2>
            <p className="text-ink-600 text-sm">Preview generated salaries and execute bulk settlement.</p>
            </div>
            
            <div className="flex items-center space-x-4">
            <Button onClick={handleSettlePayroll} disabled={settleMutation.isPending || !!jobId || data.length === 0}>
                <Play className="w-4 h-4 mr-2" />
                Settle Payroll Batch (₹{totalNetSalary.toLocaleString()})
            </Button>
            </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end bg-ink-50 p-3 rounded-md border border-ink-200">
            <div className="space-y-1 w-48">
                <Label className="text-xs">Global Payment Mode</Label>
                <select 
                    value={globalPaymentMode}
                    onChange={e => {
                        setGlobalPaymentMode(e.target.value as 'Cash' | 'Online')
                        if (e.target.value === 'Cash') setGlobalBankStatementEntryId('')
                    }}
                    className="w-full h-8 px-2 rounded border border-ink-300 bg-white text-sm"
                >
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                </select>
            </div>

            {globalPaymentMode === 'Online' && (
                <div className="space-y-1 w-96">
                    <Label className="text-xs">Global Bank Statement Entry</Label>
                    <select 
                        value={globalBankStatementEntryId}
                        onChange={e => setGlobalBankStatementEntryId(e.target.value)}
                        className="w-full h-8 px-2 rounded border border-ink-300 bg-white text-sm"
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
        </div>
      </div>

      {jobId && (
        <div className="bg-white p-6 rounded-lg border border-ink-200 shadow-sm">
          <JobProgressBar 
            jobId={jobId} 
            title="Processing Payroll Settlement"
            onComplete={() => setJobId(null)}
          />
        </div>
      )}

      <div className="flex-1 bg-white border border-ink-200 rounded-lg overflow-hidden flex flex-col">
        {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-ink-500">Generating preview...</div>
        ) : isError ? (
            <div className="flex-1 flex items-center justify-center text-red-500">Error loading salary preview.</div>
        ) : data.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-500">
                <p>No active employees found for payroll.</p>
            </div>
        ) : (
            <div className="overflow-y-auto flex-1 scrollbar-thin">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="bg-ink-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-ink-200">Employee</th>
                            <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-ink-200 text-right">Base</th>
                            <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-ink-200 text-right text-red-600">Deductions</th>
                            <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-ink-200 text-right text-green-600">Additions</th>
                            <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-ink-200 text-right font-bold">Net Salary</th>
                            <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-ink-200">Override Mode</th>
                            <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-ink-200">Override Statement</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                        {data.map((emp: any) => {
                            const rowMode = overrides[emp.employee_id]?.payment_mode || 'Default'
                            const isOnline = rowMode === 'Online' || (rowMode === 'Default' && globalPaymentMode === 'Online')

                            return (
                                <tr key={emp.employee_id} className="hover:bg-ink-50/50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-ink-900 text-sm">{emp.full_name}</div>
                                        <div className="text-xs text-ink-500 font-mono">{emp.employee_code}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-ink-600">₹{Number(emp.adjusted_base_salary).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-sm text-red-600">₹{Number(emp.total_deductions).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-sm text-green-600">₹{Number(emp.total_additions).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-brand-700">₹{Number(emp.net_salary).toLocaleString()}</td>
                                    
                                    <td className="px-4 py-3">
                                        <select 
                                            value={rowMode}
                                            onChange={e => handleOverrideChange(emp.employee_id, 'payment_mode', e.target.value)}
                                            className="w-28 h-8 px-2 rounded border border-ink-300 bg-white text-xs"
                                        >
                                            <option value="Default">Default</option>
                                            <option value="Cash">Cash</option>
                                            <option value="Online">Online</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 min-w-[200px]">
                                        {isOnline ? (
                                            <select 
                                                value={overrides[emp.employee_id]?.bank_statement_entry_id || ''}
                                                onChange={e => handleOverrideChange(emp.employee_id, 'bank_statement_entry_id', e.target.value)}
                                                className="w-full max-w-[250px] h-8 px-2 rounded border border-ink-300 bg-white text-xs"
                                            >
                                                <option value="">{rowMode === 'Default' ? '(Using Global)' : '-- Select Transaction --'}</option>
                                                {debits.map((d: any) => (
                                                <option key={d.id} value={d.id}>
                                                    {new Date(d.transaction_date).toLocaleDateString()} - {d.particulars}
                                                </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="text-xs text-ink-400 italic">Not applicable (Cash)</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  )
}
