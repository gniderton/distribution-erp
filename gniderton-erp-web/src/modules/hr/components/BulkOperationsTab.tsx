import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Calendar, TrendingUp, Gift, Banknote } from 'lucide-react'
import { BulkSalaryGrid } from './BulkSalaryGrid'
import { BulkAttendanceGrid } from './BulkAttendanceGrid'
import { BulkBonusGrid } from './BulkBonusGrid'
import { BulkAdvanceGrid } from './BulkAdvanceGrid'

export function BulkOperationsTab() {
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'salary' | 'bonus' | 'advance'>('attendance')

  return (
    <div className="flex h-[calc(100vh-16rem)] border border-ink-200 rounded-lg overflow-hidden bg-white">
      {/* Sidebar for Sub-Tabs */}
      <div className="w-64 bg-ink-50 border-r border-ink-200 p-4 space-y-2 shrink-0">
        <h3 className="font-semibold text-ink-900 mb-4 px-2">Bulk Tools</h3>
        
        <button
          onClick={() => setActiveSubTab('attendance')}
          className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-left text-sm ${activeSubTab === 'attendance' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-600 hover:bg-ink-100'}`}
        >
          <Calendar className="w-4 h-4" />
          <span>Mark Attendance</span>
        </button>

        <button
          onClick={() => setActiveSubTab('salary')}
          className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-left text-sm ${activeSubTab === 'salary' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-600 hover:bg-ink-100'}`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Update Salaries</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bonus')}
          className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-left text-sm ${activeSubTab === 'bonus' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-600 hover:bg-ink-100'}`}
        >
          <Gift className="w-4 h-4" />
          <span>Issue Bonuses</span>
        </button>

        <button
          onClick={() => setActiveSubTab('advance')}
          className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-left text-sm ${activeSubTab === 'advance' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-600 hover:bg-ink-100'}`}
        >
          <Banknote className="w-4 h-4" />
          <span>Issue Advances</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-hidden">
        {activeSubTab === 'attendance' && (
          <BulkAttendanceGrid />
        )}

        {activeSubTab === 'salary' && (
          <BulkSalaryGrid />
        )}

        {activeSubTab === 'bonus' && (
          <BulkBonusGrid />
        )}

        {activeSubTab === 'advance' && (
          <BulkAdvanceGrid />
        )}
      </div>
    </div>
  )
}
