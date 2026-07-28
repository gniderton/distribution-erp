import { Drawer } from '@/components/ui/Drawer'
import { useEmployeeProfile } from '../hooks'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { User, DollarSign, Clock, AlertTriangle } from 'lucide-react'

interface Props {
  employeeId: string | null
  onClose: () => void
}

export function EmployeeForensicDrawer({ employeeId, onClose }: Props) {
  const { data, isLoading } = useEmployeeProfile(employeeId)

  return (
    <Drawer isOpen={!!employeeId} onClose={onClose} title="Employee Profile" size="xl">
      {isLoading ? (
        <div className="p-6 text-center text-ink-500">Loading profile...</div>
      ) : data ? (
        <div className="p-6 space-y-8">
          
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 text-2xl font-bold">
                {data.profile?.first_name?.[0]}{data.profile?.last_name?.[0]}
              </div>
              <div>
                <h3 className="text-xl font-bold text-ink-900">
                  {data.profile?.first_name} {data.profile?.last_name}
                </h3>
                <p className="text-ink-600">{data.profile?.designation}</p>
                <div className="flex space-x-2 mt-2">
                  <Badge variant={data.profile?.status === 'Active' ? 'success' : 'secondary'}>
                    {data.profile?.status}
                  </Badge>
                  <Badge variant="outline">{data.profile?.department}</Badge>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">Update Salary</Button>
              <Button variant="danger" size="sm">Resign</Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-lg border border-ink-200">
              <div className="flex items-center space-x-2 text-ink-600 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="font-medium">Base Salary</span>
              </div>
              <div className="text-2xl font-bold">₹{Number(data.profile?.base_salary).toLocaleString()}</div>
            </div>
            <div className="p-4 bg-white rounded-lg border border-ink-200">
              <div className="flex items-center space-x-2 text-ink-600 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Outstanding Liability</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                ₹{Number(data.financials?.outstanding_liability).toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-white rounded-lg border border-ink-200">
              <div className="flex items-center space-x-2 text-ink-600 mb-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Attendance (30 Days)</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {data.performance?.attendance_30d?.present_days || 0} Present
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-ink-200 p-4">
            <h4 className="font-semibold text-ink-900 mb-4">Raw Data Inspector</h4>
            <pre className="bg-ink-50 p-4 rounded text-xs overflow-auto max-h-64">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>

        </div>
      ) : (
        <div className="p-6 text-center text-ink-500">Failed to load profile.</div>
      )}
    </Drawer>
  )
}
