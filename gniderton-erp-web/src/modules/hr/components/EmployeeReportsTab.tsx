import { useState } from 'react'
import { FileText, Calendar, Landmark } from 'lucide-react'
import { AutoTable } from '@/components/shared/AutoTable'
import { useSalaryBatchSummary, useAttendanceReport, useEmployeeAdvances } from '../hooks'

function SalaryRegisterReport() {
    const { data, isLoading, isError } = useSalaryBatchSummary()
    
    return (
        <div className="h-full flex flex-col space-y-4">
            <div>
                <h3 className="font-semibold text-ink-900">Salary Register</h3>
                <p className="text-sm text-ink-500">Historical summary of all processed payroll batches.</p>
            </div>
            <div className="flex-1 border border-ink-200 rounded-lg overflow-hidden bg-white">
                <AutoTable
                    data={data}
                    isLoading={isLoading}
                    isError={isError}
                    emptyTitle="No Salary Records"
                    emptyDescription="No historical salary batches found."
                />
            </div>
        </div>
    )
}

function AttendanceSummaryReport() {
    // Default to current month
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
    
    const [startDate, setStartDate] = useState(firstDay)
    const [endDate, setEndDate] = useState(lastDay)
    
    const { data, isLoading, isError } = useAttendanceReport(startDate, endDate)
    
    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-semibold text-ink-900">Attendance Summary</h3>
                    <p className="text-sm text-ink-500">Aggregated attendance statistics across all employees.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="h-8 px-2 rounded border border-ink-300 bg-white text-sm"
                    />
                    <span className="text-ink-500">to</span>
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="h-8 px-2 rounded border border-ink-300 bg-white text-sm"
                    />
                </div>
            </div>
            <div className="flex-1 border border-ink-200 rounded-lg overflow-hidden bg-white">
                <AutoTable
                    data={data}
                    isLoading={isLoading}
                    isError={isError}
                    emptyTitle="No Attendance Records"
                    emptyDescription="No attendance data found for the selected period."
                />
            </div>
        </div>
    )
}

function AdvancesLedgerReport() {
    const { data, isLoading, isError } = useEmployeeAdvances()
    
    return (
        <div className="h-full flex flex-col space-y-4">
            <div>
                <h3 className="font-semibold text-ink-900">Advances Ledger</h3>
                <p className="text-sm text-ink-500">Historical log of all salary advances issued and their settlement status.</p>
            </div>
            <div className="flex-1 border border-ink-200 rounded-lg overflow-hidden bg-white">
                <AutoTable
                    data={data}
                    isLoading={isLoading}
                    isError={isError}
                    emptyTitle="No Advances"
                    emptyDescription="No historical advances found."
                />
            </div>
        </div>
    )
}


export function EmployeeReportsTab() {
  const [activeReport, setActiveReport] = useState<'salary' | 'attendance' | 'advances'>('salary')

  return (
    <div className="flex h-[calc(100vh-16rem)] border border-ink-200 rounded-lg overflow-hidden bg-white">
      {/* Sidebar for Sub-Tabs */}
      <div className="w-64 bg-ink-50 border-r border-ink-200 p-4 space-y-2 shrink-0">
        <h3 className="font-semibold text-ink-900 mb-4 px-2">Reports</h3>
        
        <button
          onClick={() => setActiveReport('salary')}
          className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-left text-sm ${activeReport === 'salary' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-600 hover:bg-ink-100'}`}
        >
          <FileText className="w-4 h-4" />
          <span>Salary Register</span>
        </button>

        <button
          onClick={() => setActiveReport('attendance')}
          className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-left text-sm ${activeReport === 'attendance' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-600 hover:bg-ink-100'}`}
        >
          <Calendar className="w-4 h-4" />
          <span>Attendance Summary</span>
        </button>

        <button
          onClick={() => setActiveReport('advances')}
          className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-left text-sm ${activeReport === 'advances' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-600 hover:bg-ink-100'}`}
        >
          <Landmark className="w-4 h-4" />
          <span>Advances Ledger</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-hidden">
        {activeReport === 'salary' && <SalaryRegisterReport />}
        {activeReport === 'attendance' && <AttendanceSummaryReport />}
        {activeReport === 'advances' && <AdvancesLedgerReport />}
      </div>
    </div>
  )
}
