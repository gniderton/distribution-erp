import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmployeesTab } from './components/EmployeesTab'
import { BulkOperationsTab } from './components/BulkOperationsTab'
import { PayrollProcessingTab } from './components/PayrollProcessingTab'
import { EmployeeReportsTab } from './components/EmployeeReportsTab'
import { Users, Calendar, Banknote, PieChart } from 'lucide-react'

type Tab = 'employees' | 'bulk' | 'payroll' | 'reports'

export default function HrPage() {
  const [activeTab, setActiveTab] = useState<Tab>('employees')

  const tabs = [
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'bulk', label: 'Bulk Operations', icon: Calendar },
    { id: 'payroll', label: 'Payroll Processing', icon: Banknote },
    { id: 'reports', label: 'Reports', icon: PieChart },
  ] as const

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 pt-6 pb-2 shrink-0">
        <PageHeader
          eyebrow="HRMS & Payroll"
          title="Human Resources"
          description="Manage employees, attendance, payroll runs, and financial ledgers."
        />
        
        <div className="flex space-x-1 border-b border-ink-200 mt-6 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`
                  flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                  ${isActive 
                    ? 'border-brand-500 text-brand-600' 
                    : 'border-transparent text-ink-600 hover:text-ink-900 hover:border-ink-300'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-500' : 'text-ink-400'}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-ink-50/50 p-6">
        {activeTab === 'employees' && <EmployeesTab />}
        {activeTab === 'bulk' && <BulkOperationsTab />}
        {activeTab === 'payroll' && <PayrollProcessingTab />}
        {activeTab === 'reports' && <EmployeeReportsTab />}
      </div>
    </div>
  )
}
