import { useCustomerLedger } from '../hooks'
import { DataTable } from '@/components/shared/DataTable'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Download, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function CustomerLedgerTab({ customerId }: { customerId: string | number }) {
  const { data: ledger, isLoading } = useCustomerLedger(customerId)

  if (isLoading) {
    return <div className="p-8 text-center text-ink-500 animate-pulse">Loading ledger...</div>
  }

  const movements = Array.isArray(ledger) ? ledger : ledger?.ledger || []

  const handleExportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`Customer Ledger`, 14, 20)
    
    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Type', 'Reference', 'Debit (Dr)', 'Credit (Cr)', 'Balance']],
      body: movements.map((m: any) => [
        formatDate(m.date),
        m.type,
        m.reference_number || '-',
        m.debit_amount ? m.debit_amount.toString() : '-',
        m.credit_amount ? m.credit_amount.toString() : '-',
        m.running_balance ? m.running_balance.toString() : '-'
      ])
    })
    
    doc.save(`Customer_${customerId}_Ledger.pdf`)
  }

  const handleExportExcel = () => {
    // Generate CSV string
    const headers = ['Date', 'Type', 'Reference', 'Debit', 'Credit', 'Balance']
    const rows = movements.map((m: any) => [
      formatDate(m.date),
      m.type,
      m.reference_number || '-',
      m.debit_amount || '0',
      m.credit_amount || '0',
      m.running_balance || '0'
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.join(','))
    ].join('\n')

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `Customer_${customerId}_Ledger.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
