import { useCustomerLedger } from '../hooks'
import { DataTable } from '@/components/shared/DataTable'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Download, FileText } from 'lucide-react'
import { generateLedgerPDF, exportLedgerToExcel } from '../utils/pdfGenerator'
import { api } from '@/lib/axios'
import { useState, useEffect } from 'react'

export function CustomerLedgerTab({ customer }: { customer: any }) {
  const { data: ledger, isLoading } = useCustomerLedger(customer?.id)
  const [companySettings, setCompanySettings] = useState<any>(null)

  useEffect(() => {
    api.get('/api/company-settings')
      .then(res => setCompanySettings(res.data))
      .catch(err => console.error('Failed loading company settings:', err))
  }, [])

  if (isLoading) {
    return <div className="p-8 text-center text-ink-500 animate-pulse">Loading ledger...</div>
  }

  const handleExportPDF = () => {
    generateLedgerPDF(customer, ledger, undefined, undefined, companySettings)
  }

  const handleExportExcel = () => {
    exportLedgerToExcel(customer, ledger)
  }

  const movements = Array.isArray(ledger) ? ledger : ledger?.ledger || []

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
          <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={movements.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportPDF} disabled={movements.length === 0}>
            <FileText className="w-4 h-4 mr-2 text-danger-500" />
            PDF
          </Button>
        </div>
      </div>
      
      <DataTable 
        data={movements}
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
  )
}
