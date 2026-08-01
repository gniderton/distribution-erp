import { Drawer } from '@/components/ui/Drawer'
import { AutoTable } from '@/components/shared/AutoTable'
import { useExpenseLedger, useIncomeLedger } from '../hooks'
import { Building, Phone, FileText, DollarSign, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'

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

  const handleDownloadPDF = () => {
    if (!entity) return
    try {
      const doc = new jsPDF('p', 'pt', 'a4')
      const margin = 17.5
      const pageWidth = 595
      const downloadTimestamp = new Date().toLocaleString()

      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.text(`${type === 'expense' ? 'VENDOR' : 'INCOME SOURCE'} LEDGER STATEMENT`, pageWidth / 2, margin + 15, { align: "center" })
      
      const boxesY = margin + 40
      const boxWidth = (pageWidth - (margin * 2) - 8) / 2
      const boxHeight = 80

      const drawSimpleBox = (docObj: any, x: number, y: number, width: number, height: number, rows: any[], labelWidth = 65) => {
        docObj.setDrawColor(0, 0, 0)
        docObj.setLineWidth(0.5)
        docObj.rect(x, y, width, height)
        let rowY = y + 11
        rows.forEach((r: any) => {
          docObj.setFontSize(8)
          docObj.setFont("helvetica", "bold")
          docObj.setTextColor(0, 0, 0)
          docObj.text(String(r[0]) + ":", x + 5, rowY)
          docObj.setFont("helvetica", "normal")
          const val = String(r[1] || "-")
          if (r[2]) {
            docObj.text(val, x + width - 5, rowY, { align: 'right' })
            rowY += 11
          } else {
            const splitVal = docObj.splitTextToSize(val, width - labelWidth - 5)
            docObj.text(splitVal, x + labelWidth, rowY)
            rowY += (splitVal.length * 9.5) + 1.5
          }
        })
      }

      drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
        ["Entity Name", entity.name],
        ["Phone", entity.phone],
        ["GST No", entity.gst_no]
      ], 65)

      drawSimpleBox(doc, margin + boxWidth + 8, boxesY, boxWidth, boxHeight, [
        ["Total Transactions", String(data.length), true],
        ["Total Volume", `Rs. ${totalAmount.toFixed(2)}`, true],
        ["Printed On", downloadTimestamp, true]
      ], 85)

      const tableStartY = margin + 40 + 80 + 15
      
      const bodyRows = data.map((row: any) => [
        row.date?.split('T')[0] || '',
        row.type || '-',
        row.reference || '-',
        row.description || '-',
        Number(row.debit || 0).toFixed(2),
        Number(row.credit || 0).toFixed(2)
      ])

      autoTable(doc, {
        startY: tableStartY,
        margin: { left: margin, right: margin },
        head: [["DATE", "TYPE", "REFERENCE", "DESCRIPTION", "DEBIT", "CREDIT"]],
        body: bodyRows.length > 0 ? bodyRows : [['-', '-', '-', 'No transactions', '0.00', '0.00']],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.5 },
        columnStyles: {
          4: { halign: 'right' },
          5: { halign: 'right' }
        }
      })

      doc.save(`${type === 'expense' ? 'Vendor' : 'IncomeSource'}_Ledger_${entity.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
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
