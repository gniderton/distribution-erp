import { Drawer } from '@/components/ui/Drawer'
import { AutoTable } from '@/components/shared/AutoTable'
import { useExpenseLedger, useIncomeLedger } from '../hooks'
import { Building, Phone, FileText, DollarSign, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'
import { generateEntityLedgerPDF } from '../utils/pdfGenerator'
import { api } from '@/lib/axios'
import { useState, useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  entity: any | null
  type: 'expense' | 'income'
}

export function EntityLedgerModal({ open, onClose, entity, type }: Props) {
  const expenseLedger = useExpenseLedger(entity?.id || '')
  const incomeLedger = useIncomeLedger(entity?.id || '')

  const { data = [], isLoading, isError } = type === 'expense' ? expenseLedger : incomeLedger

  const totalAmount = data.reduce((sum: number, row: any) => sum + parseFloat(row.debit || row.credit || 0), 0)

  const [companySettings, setCompanySettings] = useState<any>(null)

  useEffect(() => {
    api.get('/api/company-settings')
      .then(res => setCompanySettings(res.data))
      .catch(err => console.error('Failed loading company settings:', err))
  }, [])

  const handleDownloadPDF = () => {
    if (!entity) return
    try {
      generateEntityLedgerPDF(entity, type, data, totalAmount, companySettings)
      toast.success('Ledger PDF downloaded!')
    } catch (err: any) {
      toast.error(`PDF generation failed: ${err.message}`)
    }
  }

  return (
    <Drawer widthClass="max-w-4xl" open={open} onClose={onClose} title={`${type === 'expense' ? 'Vendor' : 'Income Source'} Ledger`} description={entity?.name || "Full transaction history"}>
      <div className="h-full flex flex-col space-y-6">
        
        {entity && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
            <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm flex flex-col gap-1">
              <div className="flex items-center gap-2 text-ink-500 mb-1">
                <Building size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">Entity Name</span>
              </div>
              <span className="text-sm font-medium text-ink-900 truncate" title={entity.name}>{entity.name || '—'}</span>
            </div>
            
            <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm flex flex-col gap-1">
              <div className="flex items-center gap-2 text-ink-500 mb-1">
                <Phone size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">Phone</span>
              </div>
              <span className="text-sm font-medium text-ink-900">{entity.phone || '—'}</span>
            </div>

            <div className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm flex flex-col gap-1">
              <div className="flex items-center gap-2 text-ink-500 mb-1">
                <FileText size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">GST No</span>
              </div>
              <span className="text-sm font-medium text-ink-900">{entity.gst_no || '—'}</span>
            </div>

            <div className="p-4 bg-brand-50 border border-brand-200 rounded-xl shadow-sm flex flex-col gap-1">
              <div className="flex items-center gap-2 text-brand-700 mb-1">
                <DollarSign size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">Total Volume</span>
              </div>
              <span className="text-lg font-bold text-brand-900">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-end">
          <span className="text-sm font-semibold text-ink-900">Transaction History</span>
          <Button variant="secondary" size="sm" onClick={handleDownloadPDF} disabled={!entity || data.length === 0}>
            <Download size={14} className="mr-2" /> Download PDF Statement
          </Button>
        </div>

        <div className="flex-1 overflow-auto border border-border-subtle rounded-xl bg-white shadow-sm">
          <AutoTable
            data={data}
            isLoading={isLoading}
            isError={isError}
            emptyTitle="No ledger entries found"
            emptyDescription="This entity does not have any recorded transactions yet."
          />
        </div>
      </div>
    </Drawer>
  )
}
