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

  // Extract the first item from the array since the backend wraps the profile in an array
  const profile = data?.profile?.[0]

  return (
    <Drawer open={!!employeeId} onClose={onClose} title="Employee Profile">
      {isLoading ? (
        <div className="p-6 text-center text-ink-500">Loading profile...</div>
      ) : profile ? (
        <div className="p-6 space-y-8">
          
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 text-2xl font-bold uppercase">
                {profile?.full_name?.substring(0, 2) || '?'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-ink-900">
                  {profile?.full_name || 'Unknown Employee'}
                </h3>
                <p className="text-ink-600">{profile?.designation_name || 'No Designation'}</p>
                <div className="flex space-x-2 mt-2">
                  <Badge tone={profile?.employment_status === 'Active' ? 'success' : 'neutral'}>
                    {profile?.employment_status || 'Unknown Status'}
                  </Badge>
                  {profile?.department_name && (
                    <Badge tone="neutral">{profile?.department_name}</Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="secondary" size="sm">Update Salary</Button>
              <Button variant="danger" size="sm">Resign</Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-lg border border-ink-200">
              <div className="flex items-center space-x-2 text-ink-600 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="font-medium">Base Salary</span>
              </div>
              <div className="text-2xl font-bold">₹{Number(profile?.current_salary || 0).toLocaleString()}</div>
            </div>
            <div className="p-4 bg-white rounded-lg border border-ink-200">
              <div className="flex items-center space-x-2 text-ink-600 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Outstanding Liability</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                ₹{Number(data?.financials?.outstanding_liability || 0).toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-white rounded-lg border border-ink-200">
              <div className="flex items-center space-x-2 text-ink-600 mb-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Attendance (30 Days)</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {data?.performance?.attendance_30d?.present_days || 0} Present
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
