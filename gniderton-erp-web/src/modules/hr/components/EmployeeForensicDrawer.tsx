import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { useEmployeeProfile } from '../hooks'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { User, DollarSign, Clock, AlertTriangle } from 'lucide-react'
import { UpdateSalaryDialog } from './UpdateSalaryDialog'
import { RecordLiabilityDialog } from './RecordLiabilityDialog'
import { useEmployeeLiabilities, useDeleteLiability } from '../hooks'
import { Trash2 } from 'lucide-react'
interface Props {
  employeeId: string | null
  onClose: () => void
}

export function EmployeeForensicDrawer({ employeeId, onClose }: Props) {
  const { data, isLoading } = useEmployeeProfile(employeeId)
  const { data: liabilities, isLoading: isLiabilitiesLoading } = useEmployeeLiabilities(employeeId)
  const { mutate: deleteLiability } = useDeleteLiability()
  
  const [isSalaryOpen, setIsSalaryOpen] = useState(false)
  const [isLiabilityOpen, setIsLiabilityOpen] = useState(false)

  // Extract the profile object from the data payload
  const profile = data?.profile

  return (
    <Drawer open={!!employeeId} onClose={onClose} title="Employee Profile" widthClass="max-w-3xl w-full">
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
              <Button variant="secondary" size="sm" onClick={() => setIsLiabilityOpen(true)}>Record Liability</Button>
              <Button variant="secondary" size="sm" onClick={() => setIsSalaryOpen(true)}>Update Salary</Button>
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

          {employeeId && isSalaryOpen && (
            <UpdateSalaryDialog
              open={isSalaryOpen}
              onClose={() => setIsSalaryOpen(false)}
              employeeId={employeeId}
              currentSalary={profile?.current_salary || 0}
            />
          )}

          {employeeId && isLiabilityOpen && (
            <RecordLiabilityDialog
              open={isLiabilityOpen}
              onClose={() => setIsLiabilityOpen(false)}
              employeeId={employeeId}
            />
          )}

          <div className="mt-8">
            <h4 className="text-lg font-bold text-ink-900 mb-4">Pending Liabilities</h4>
            <div className="glass-card rounded-xl border border-border-subtle overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle">Description</th>
                    <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle text-right">Amount</th>
                    <th className="px-4 py-3 text-xs font-semibold text-ink-600 border-b border-border-subtle text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {isLiabilitiesLoading ? (
                    <tr><td colSpan={5} className="px-4 py-4 text-center text-ink-500">Loading...</td></tr>
                  ) : liabilities?.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-4 text-center text-ink-500">No pending liabilities found.</td></tr>
                  ) : (
                    liabilities?.map((l: any) => (
                      <tr key={l.id} className="hover:bg-surface/50">
                        <td className="px-4 py-3 text-sm">{new Date(l.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm font-medium">{l.type}</td>
                        <td className="px-4 py-3 text-sm text-ink-600">{l.description}</td>
                        <td className="px-4 py-3 text-sm text-right text-red-600 font-bold">₹{Number(l.amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          <button 
                            onClick={() => deleteLiability(l.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Cancel Liability"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        <div className="p-6 text-center text-ink-500">Failed to load profile.</div>
      )}
    </Drawer>
  )
}
