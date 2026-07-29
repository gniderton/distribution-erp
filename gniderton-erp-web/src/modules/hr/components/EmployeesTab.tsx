import { useState } from 'react'
import { AutoTable } from '@/components/shared/AutoTable'
import { useEmployees } from '../hooks'
import { EmployeeForensicDrawer } from './EmployeeForensicDrawer'
import { CreateEmployeeDrawer } from './CreateEmployeeDrawer'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'

export function EmployeesTab() {
  const { data, isLoading, isError } = useEmployees()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-ink-900">Employee Directory</h2>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Employee
        </Button>
      </div>

      <AutoTable
        data={data}
        isLoading={isLoading}
        isError={isError}
        emptyTitle="No Employees"
        emptyDescription="Add your first employee to get started."
        onRowClick={(row) => setSelectedId(row.id)}
      />

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
