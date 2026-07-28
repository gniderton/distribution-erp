import { useState } from 'react'
import { AutoTable } from '@/components/shared/AutoTable'
import { useSalaryPreview, useBulkSalaryPayment } from '../hooks'
import { Button } from '@/components/ui/Button'
import { JobProgressBar } from '@/components/ui/JobProgressBar'
import { Play } from 'lucide-react'

export function PayrollProcessingTab() {
  const { data, isLoading, isError } = useSalaryPreview()
  const [jobId, setJobId] = useState<string | null>(null)
  
  const settleMutation = useBulkSalaryPayment()

  const handleSettlePayroll = () => {
    // In reality, this would gather the payload from form selections
    const payload = {
      month: 7,
      year: 2026,
      bank_account_id: 'default-account',
      employees: data?.map((e: any) => e.employee_id) || []
    }
    
    settleMutation.mutate(payload, {
      onSuccess: (res: any) => {
        if (res && res.jobId) {
          setJobId(res.jobId)
        } else {
          console.log("Fallback successful response")
        }
      }
    })
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-ink-200">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Payroll Processing</h2>
          <p className="text-ink-600 text-sm">Preview generated salaries and execute bulk settlement.</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select className="border border-ink-300 rounded-md px-3 py-1.5 text-sm">
            <option>July 2026</option>
            <option>June 2026</option>
          </select>
          <Button onClick={handleSettlePayroll} disabled={settleMutation.isPending || !!jobId}>
            <Play className="w-4 h-4 mr-2" />
            Settle Payroll Batch
          </Button>
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

      <div className="flex-1 bg-white border border-ink-200 rounded-lg overflow-hidden">
        <AutoTable
          data={data}
          isLoading={isLoading}
          isError={isError}
          emptyTitle="No Salary Data"
          emptyDescription="No salary preview available for this month."
        />
      </div>
    </div>
  )
}
