import { useState, useMemo } from 'react'
import { DataTable } from '@/components/shared/DataTable'
import type { ColumnDef } from '@tanstack/react-table'
import { useEmployees } from '../hooks'
import { EmployeeForensicDrawer } from './EmployeeForensicDrawer'
import { CreateEmployeeDrawer } from './CreateEmployeeDrawer'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

export function EmployeesTab() {
  const [statusFilter, setStatusFilter] = useState<'Active' | 'Resigned'>('Active')
  const { data, isLoading, isError } = useEmployees(statusFilter)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'employee_code',
      header: 'Code',
    },
    {
      accessorKey: 'full_name',
      header: 'Name',
      cell: (info) => <div className="font-medium text-ink-900">{String(info.getValue())}</div>
    },
    {
      accessorKey: 'designation_name',
      header: 'Designation',
    },
    {
      accessorKey: 'department_name',
      header: 'Department',
    },
    {
      accessorKey: 'contact_primary',
      header: 'Phone',
      cell: (info) => info.getValue() || '—'
    },
    {
      accessorKey: 'employment_status',
      header: 'Status',
      cell: (info) => {
        const val = String(info.getValue())
        return <Badge tone={val === 'Active' ? 'success' : 'neutral'}>{val}</Badge>
      }
    }
  ], [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-ink-900">Employee Directory</h2>
          
          <div className="flex bg-ink-100 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter('Active')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'Active' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('Resigned')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'Resigned' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              Resigned
            </button>
          </div>
        </div>

        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Employee
        </Button>
      </div>

      <div className="glass-card bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <DataTable
          data={data}
          columns={columns}
          isLoading={isLoading}
          isError={isError}
          emptyTitle="No Employees Found"
          emptyDescription={`There are no ${statusFilter.toLowerCase()} employees in the directory.`}
          onRowClick={(row) => setSelectedId(row.id)}
        />
      </div>

      {selectedId && (
        <EmployeeForensicDrawer
          employeeId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}

      {isCreateOpen && (
        <CreateEmployeeDrawer 
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </div>
  )
}
