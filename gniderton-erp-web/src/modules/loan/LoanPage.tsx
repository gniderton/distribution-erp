import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Plus, Users, Wallet, Search, Filter, IndianRupee, ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LoanEntitiesTable } from './components/LoanEntitiesTable'
import { LoansTable } from './components/LoansTable'
import { CreateEntityModal } from './components/CreateEntityModal'
import { CreateLoanModal } from './components/CreateLoanModal'
import { EmiEntryModal } from './components/EmiEntryModal'
import { LedgerModal } from './components/LedgerModal'
import { useEntityLedger, useLoanLedger, useLoanEntities, useLoans } from './hooks'
import { formatCurrency } from '@/lib/utils'

export function LoanPage() {
  const [activeTab, setActiveTab] = useState<'loans' | 'entities'>('loans')
  
  // Modal states
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false)
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false)
  const [emiLoan, setEmiLoan] = useState<any | null>(null)
  
  // Ledger states
  const [entityLedgerId, setEntityLedgerId] = useState<number | null>(null)
  const [loanLedgerId, setLoanLedgerId] = useState<number | null>(null)
  
  const { data: entityLedgerData, isLoading: entityLedgerLoading } = useEntityLedger(entityLedgerId)
  const { data: loanLedgerData, isLoading: loanLedgerLoading } = useLoanLedger(loanLedgerId)
  
  const { data: entities, isLoading: entitiesLoading } = useLoanEntities()
  const { data: loans, isLoading: loansLoading } = useLoans()

  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [loanTypeFilter, setLoanTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('Active')

  // Filtering Logic
  const filteredLoans = useMemo(() => {
    if (!loans) return []
    return loans.filter((loan: any) => {
      const matchesSearch = (loan.party_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (loan.loan_number || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = !loanTypeFilter || loan.loan_type === loanTypeFilter
      const matchesStatus = !statusFilter || loan.status === statusFilter
      return matchesSearch && matchesType && matchesStatus
    })
  }, [loans, searchTerm, loanTypeFilter, statusFilter])

  const filteredEntities = useMemo(() => {
    if (!entities) return []
    return entities.filter((entity: any) => {
      const matchesSearch = (entity.entity_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSearch
    })
  }, [entities, searchTerm])

  // KPI Calculations
  const kpis = useMemo(() => {
    const allLoans = loans || []
    const totalGiven = allLoans.filter((l: any) => l.loan_type === 'GIVEN' && l.status === 'Active').reduce((acc: number, l: any) => acc + (Number(l.balance_principal) || 0), 0)
    const totalTaken = allLoans.filter((l: any) => l.loan_type === 'TAKEN' && l.status === 'Active').reduce((acc: number, l: any) => acc + (Number(l.balance_principal) || 0), 0)
    const activeCount = allLoans.filter((l: any) => l.status === 'Active').length
    const entityCount = entities?.length || 0
    return { totalGiven, totalTaken, activeCount, entityCount }
  }, [loans, entities])

  const handleResetFilters = () => {
    setSearchTerm('')
    setLoanTypeFilter('')
    setStatusFilter('Active')
  }

  const selectedEntityName = entities?.find((e: any) => e.id === entityLedgerId)?.entity_name || ''
  const selectedLoanLabel = loans?.find((l: any) => l.id === loanLedgerId)?.loan_number || ''

  const tabs = [
    { id: 'loans', label: 'Loans & Transactions', icon: Wallet },
    { id: 'entities', label: 'Loan Entities', icon: Users },
  ]

  return (
    <div className="pb-12 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Loan Management" 
          description="Manage borrowed and lent funds, loan entities, and transaction ledgers."
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsEntityModalOpen(true)}>
            <Plus size={16} className="mr-2" /> Create Entity
          </Button>
          <Button onClick={() => setIsLoanModalOpen(true)}>
            <Plus size={16} className="mr-2" /> Disburse Loan
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-xl border border-[#e6e9ee] bg-white flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-ink-500 uppercase font-semibold tracking-wider">Active Loans</span>
            <h4 className="text-2xl font-bold text-ink-900 mt-1">{kpis.activeCount}</h4>
          </div>
          <div className="p-3 bg-brand-500/10 text-brand-600 rounded-lg">
            <Wallet size={20} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-[#e6e9ee] bg-white flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-ink-500 uppercase font-semibold tracking-wider">Total Given (Receivable)</span>
            <h4 className="text-2xl font-bold text-ink-900 mt-1">{formatCurrency(kpis.totalGiven)}</h4>
          </div>
          <div className="p-3 bg-success-500/10 text-success-600 rounded-lg">
            <ArrowUpRight size={20} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-[#e6e9ee] bg-white flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-ink-500 uppercase font-semibold tracking-wider">Total Taken (Payable)</span>
            <h4 className="text-2xl font-bold text-ink-900 mt-1">{formatCurrency(kpis.totalTaken)}</h4>
          </div>
          <div className="p-3 bg-danger-500/10 text-danger-600 rounded-lg">
            <ArrowDownRight size={20} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-[#e6e9ee] bg-white flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-ink-500 uppercase font-semibold tracking-wider">Loan Entities</span>
            <h4 className="text-2xl font-bold text-ink-900 mt-1">{kpis.entityCount}</h4>
          </div>
          <div className="p-3 bg-brand-500/10 text-brand-600 rounded-lg">
            <Users size={20} />
          </div>
        </div>
      </div>

      <div className="flex border-b border-border-subtle mt-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as 'loans' | 'entities')
              handleResetFilters()
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-[1px] transition-all ${
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-ink-600 hover:text-ink-900'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dynamic Filters Panel */}
      <div className="glass-card p-4 rounded-xl border border-[#e6e9ee] bg-white shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between w-full">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3 text-ink-600" size={15} />
          <input 
            type="text" 
            placeholder={activeTab === 'loans' ? "Search by party name or loan number..." : "Search by entity name..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-[#e6e9ee] rounded-lg pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-brand-400 text-ink-900 placeholder:text-ink-600"
          />
        </div>

        {activeTab === 'loans' && (
          <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
            <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
              <Filter size={12} className="text-ink-600" />
              <select
                value={loanTypeFilter}
                onChange={e => setLoanTypeFilter(e.target.value)}
                className="bg-transparent text-xs text-ink-900 focus:outline-none pr-6 cursor-pointer"
              >
                <option value="">All Types</option>
                <option value="GIVEN">Loan Given</option>
                <option value="TAKEN">Loan Taken</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
              <Filter size={12} className="text-ink-600" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs text-ink-900 focus:outline-none pr-6 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {(searchTerm || loanTypeFilter || statusFilter !== 'Active') && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-danger-600 hover:bg-danger-500/5 rounded-lg transition"
              >
                <RefreshCcw size={12} />
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        {activeTab === 'loans' ? (
          <LoansTable 
            data={filteredLoans}
            isLoading={loansLoading}
            onViewLedger={id => setLoanLedgerId(id)}
            onPayEmi={loan => setEmiLoan(loan)}
          />
        ) : (
          <LoanEntitiesTable 
            data={filteredEntities}
            isLoading={entitiesLoading}
            onViewLedger={id => setEntityLedgerId(id)}
          />
        )}
      </div>

      {/* Modals */}
      <CreateEntityModal 
        open={isEntityModalOpen} 
        onClose={() => setIsEntityModalOpen(false)} 
      />
      
      <CreateLoanModal 
        open={isLoanModalOpen} 
        onClose={() => setIsLoanModalOpen(false)} 
      />
      
      <EmiEntryModal 
        open={!!emiLoan} 
        onClose={() => setEmiLoan(null)} 
        loan={emiLoan}
      />
      
      <LedgerModal 
        open={!!entityLedgerId}
        onClose={() => setEntityLedgerId(null)}
        title={selectedEntityName}
        data={entityLedgerData}
        isLoading={entityLedgerLoading}
        type="entity"
      />
      
      <LedgerModal 
        open={!!loanLedgerId}
        onClose={() => setLoanLedgerId(null)}
        title={`Loan ${selectedLoanLabel}`}
        data={loanLedgerData}
        isLoading={loanLedgerLoading}
        type="loan"
        loanIdForDeletion={loanLedgerId}
      />

    </div>
  )
}
