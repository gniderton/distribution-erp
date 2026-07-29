import { useState, useMemo } from 'react'
import { FileText, Calendar, Landmark, Download, Loader2 } from 'lucide-react'
import { AutoTable } from '@/components/shared/AutoTable'
import { DataTable } from '@/components/shared/DataTable'
import { api } from '@/lib/axios'
import { hrApi } from '../api'
import { useSalaryPaymentHeaders, useAttendanceReport, useEmployeeAdvances } from '../hooks'
import { generatePayslip } from '../utils/payslip'
import toast from 'react-hot-toast'

function SalaryRegisterReport() {
    const { data, isLoading, isError } = useSalaryPaymentHeaders()
    const [downloadingId, setDownloadingId] = useState<string | number | null>(null)
    
    const handleDownload = async (id: string | number) => {
        try {
            setDownloadingId(id)
            const [details, settingsRes] = await Promise.all([
                hrApi.getEmployeesSalaryPaymentDetails(id),
                api.get('/api/company-settings').catch(() => ({ data: {} }))
            ])
            const companySettings = {
                regt_name: settingsRes.data?.company_name || settingsRes.data?.regt_name || "GNIDERTON INC.",
                address: settingsRes.data?.address || "123 Business Avenue, Tech Park",
                gst: settingsRes.data?.gstin || "29ABCDE1234F1Z5",
                logo: settingsRes.data?.logo || null
            }
            await generatePayslip(details, companySettings)
            toast.success('Payslip downloaded successfully')
        } catch (err: any) {
            toast.error(err.message || 'Failed to download payslip')
        } finally {
            setDownloadingId(null)
        }
    }

    const columns = useMemo(() => [
        {
            accessorKey: 'employee_code',
            header: 'Employee',
            cell: (c: any) => `${c.row.original.full_name} (${c.getValue()})`
        },
        {
            accessorKey: 'month',
            header: 'Payroll Period',
            cell: (c: any) => {
                const date = new Date(c.row.original.year, c.getValue() - 1)
                return date.toLocaleString('default', { month: 'long', year: 'numeric' })
            }
        },
        {
            accessorKey: 'net_salary',
            header: 'Net Payout',
            cell: (c: any) => `₹${Number(c.getValue()).toLocaleString()}`
        },
        {
            accessorKey: 'payment_mode',
            header: 'Payment Mode',
        },
        {
            accessorKey: 'source_account',
            header: 'Source Account',
            cell: (c: any) => c.getValue() || '—'
        },
        {
            accessorKey: 'payment_date',
            header: 'Payment Date',
            cell: (c: any) => c.getValue() ? new Date(c.getValue()).toLocaleDateString() : '—'
        },
        {
            id: 'actions',
            cell: (c: any) => {
                const isDownloading = downloadingId === c.row.original.id
                return (
                    <button 
                        onClick={() => handleDownload(c.row.original.id)}
                        disabled={isDownloading}
                        className="p-1 text-ink-500 hover:text-brand-600 transition-colors disabled:opacity-50"
                        title="Download Payslip PDF"
                    >
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                )
            }
        }
    ], [downloadingId])

    return (
        <div className="h-full flex flex-col space-y-4">
            <div>
                <h3 className="font-semibold text-ink-900">Salary Register</h3>
                <p className="text-sm text-ink-500">Detailed historical record of all individual salary payments.</p>
            </div>
            <div className="flex-1 border border-ink-200 rounded-lg overflow-hidden bg-white">
                <DataTable
                    data={data}
                    columns={columns}
                    isLoading={isLoading}
                    isError={isError}
                    emptyTitle="No Salary Records"
                    emptyDescription="No historical salary payments found."
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
    
    const formattedData = useMemo(() => {
        return data?.map((r: any) => ({
            'Employee': `${r.full_name} (${r.employee_code})`,
            'Designation': r.designation_name || '—',
            'Full Days Absent': r.total_absent,
            'Half Days': r.total_half_day
        }))
    }, [data])

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
                    data={formattedData}
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
    
    const formattedData = useMemo(() => {
        return data?.map((r: any) => ({
            'Employee': `${r.employee_name} (${r.employee_code})`,
            'Advance Date': new Date(r.advance_date).toLocaleDateString(),
            'Amount Issued': `₹${Number(r.amount).toLocaleString()}`,
            'Payment Mode': r.payment_mode,
            'Status': r.is_settled ? 'Settled (Recovered)' : 'Pending',
            'Settled In Salary ID': r.salary_payment_id || '—'
        }))
    }, [data])

    return (
        <div className="h-full flex flex-col space-y-4">
            <div>
                <h3 className="font-semibold text-ink-900">Advances Ledger</h3>
                <p className="text-sm text-ink-500">Historical log of all salary advances issued and their settlement status.</p>
            </div>
            <div className="flex-1 border border-ink-200 rounded-lg overflow-hidden bg-white">
                <AutoTable
                    data={formattedData}
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
