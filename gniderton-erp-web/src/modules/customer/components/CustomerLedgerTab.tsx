import { useCustomerLedger } from '../hooks'
import { DataTable } from '@/components/shared/DataTable'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Download, FileText } from 'lucide-react'
import { generateLedgerPDF, exportLedgerToExcel } from '../utils/pdfGenerator'
import { api } from '@/lib/axios'
import { useState, useEffect, useMemo } from 'react'

export function CustomerLedgerTab({ customer }: { customer: any }) {
  const { data: ledger, isLoading } = useCustomerLedger(customer?.id)
  const [companySettings, setCompanySettings] = useState<any>(null)
  
  // Date filters defaulting to current month
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0])

  useEffect(() => {
    api.get('/api/company-settings')
      .then(res => setCompanySettings(res.data))
      .catch(err => console.error('Failed loading company settings:', err))
  }, [])

  const movements = Array.isArray(ledger) ? ledger : ledger?.ledger || []

  // Client-side filtering and running balance calculation
  const filteredLedgerData = useMemo(() => {
    if (!movements.length) return { opening_balance: 0, ledger: [], total_debit: 0, total_credit: 0, closing_balance: 0 }

    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    let openingBal = 0
    let totalDebit = 0
    let totalCredit = 0
    const filtered: any[] = []

    const sorted = [...movements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    sorted.forEach(txn => {
      const txnDate = new Date(txn.date)
      const debit = Number(txn.debit_amount) || 0
      const credit = Number(txn.credit_amount) || 0
      const netChange = debit - credit // debit increases customer balance (they owe us)

      if (txnDate.getTime() < start.getTime()) {
        openingBal += netChange
      } else if (txnDate.getTime() <= end.getTime() && txnDate.getTime() >= start.getTime()) {
        totalDebit += debit
        totalCredit += credit
        filtered.push({ ...txn, net_change: netChange })
      }
    })

    let running = openingBal
    const finalTxns = filtered.map(t => {
      running += t.net_change
      return {
        ...t,
        running_balance: running
      }
    })

    return {
      opening_balance: openingBal,
      total_debit: totalDebit,
      total_credit: totalCredit,
      closing_balance: running,
      ledger: finalTxns
    }
  }, [movements, startDate, endDate])

  if (isLoading) {
    return <div className="p-8 text-center text-ink-500 animate-pulse">Loading ledger...</div>
  }

  const handleExportPDF = () => {
    generateLedgerPDF(customer, filteredLedgerData, startDate, endDate, companySettings)
  }

  const handleExportExcel = () => {
    exportLedgerToExcel(customer, filteredLedgerData, startDate, endDate)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-ink-900">Account Ledger</h3>
          <p className="text-sm text-ink-500">History of all transactions for this customer.</p>
        </div>
        <div className="flex items-center gap-2">
          {ledger?.closing_balance !== undefined && (
            <div className="mr-4 text-sm bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg border border-brand-100">
              <span className="opacity-80">Closing Balance: </span>
              <span className="font-mono-figures font-bold">{formatCurrency(ledger.closing_balance)}</span>
            </div>
          )}
          <div className="flex gap-2">
          <Input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            className="w-40 bg-white"
          />
          <Input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            className="w-40 bg-white"
          />
          <Button variant="secondary" onClick={handleExportPDF} className="bg-white">
            <FileText className="w-4 h-4 mr-2 text-rose-500" /> PDF
          </Button>
          <Button variant="secondary" onClick={handleExportExcel} className="bg-white">
            <Download className="w-4 h-4 mr-2 text-emerald-500" /> CSV
          </Button>
        </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        <DataTable 
          data={filteredLedgerData.ledger}
          columns={[
            { accessorKey: 'date', header: 'Date', cell: c => formatDate(c.getValue() as string) },
            { accessorKey: 'type', header: 'Type' },
            { accessorKey: 'reference_number', header: 'Reference' },
            { accessorKey: 'debit_amount', header: 'Debit (Dr)', cell: c => {
              const val = c.getValue() as number
              return val > 0 ? <span className="font-mono-figures text-danger-600">{formatCurrency(val)}</span> : '—'
            }},
            { accessorKey: 'credit_amount', header: 'Credit (Cr)', cell: c => {
              const val = c.getValue() as number
              return val > 0 ? <span className="font-mono-figures text-success-600">{formatCurrency(val)}</span> : '—'
            }},
            { accessorKey: 'running_balance', header: 'Balance', cell: c => {
              const val = c.getValue() as number
              return <span className="font-mono-figures font-medium">{formatCurrency(val)}</span>
            }},
          ]}
        />
      </div>
    </div>
  )
}
