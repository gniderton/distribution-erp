import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate, formatCurrency } from '@/lib/utils'

export const generateLedgerPDF = (customerName: string, customerPhone: string, ledgerData: any) => {
  const doc = new jsPDF()

  const pageWidth = doc.internal.pageSize.getWidth()
  let yPos = 15

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('GNIDERTON ERP', pageWidth / 2, yPos, { align: 'center' })
  yPos += 8

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('Customer Account Ledger', pageWidth / 2, yPos, { align: 'center' })
  yPos += 15

  // Customer Details Box
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(14, yPos, pageWidth - 28, 25, 3, 3, 'FD')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Customer Name:', 20, yPos + 10)
  doc.setFont('helvetica', 'normal')
  doc.text(customerName || 'N/A', 55, yPos + 10)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Phone:', 20, yPos + 18)
  doc.setFont('helvetica', 'normal')
  doc.text(customerPhone || 'N/A', 55, yPos + 18)

  doc.setFont('helvetica', 'bold')
  doc.text('Date:', 130, yPos + 10)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDate(new Date().toISOString()), 150, yPos + 10)
  
  yPos += 35

  // Extract metrics and movements
  const movements = Array.isArray(ledgerData) ? ledgerData : ledgerData?.ledger || []
  const metrics = ledgerData?.metrics || ledgerData

  // Summary Table (Opening, Debit, Credit, Closing)
  if (metrics && metrics.opening_balance !== undefined) {
    autoTable(doc, {
      startY: yPos,
      margin: { left: 14 },
      headStyles: { fillColor: [63, 81, 181], textColor: 255, halign: 'center' },
      bodyStyles: { halign: 'center', fontStyle: 'bold' },
      head: [['Opening Balance', 'Total Debit', 'Total Credit', 'Closing Balance']],
      body: [[
        formatCurrency(metrics.opening_balance),
        formatCurrency(metrics.total_debit),
        formatCurrency(metrics.total_credit),
        formatCurrency(metrics.closing_balance)
      ]],
      theme: 'grid',
    })
    yPos = (doc as any).lastAutoTable.finalY + 10
  }

  // Movements Table
  autoTable(doc, {
    startY: yPos,
    margin: { left: 14 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 30 }, // Date
      1: { cellWidth: 35 }, // Type
      2: { cellWidth: 35 }, // Ref
      3: { halign: 'right', cellWidth: 28 }, // Debit
      4: { halign: 'right', cellWidth: 28 }, // Credit
      5: { halign: 'right', fontStyle: 'bold' }, // Balance
    },
    head: [['Date', 'Type', 'Reference', 'Debit (Dr)', 'Credit (Cr)', 'Balance']],
    body: movements.map((m: any) => [
      formatDate(m.date),
      m.type,
      m.reference_number || '-',
      m.debit_amount ? formatCurrency(m.debit_amount) : '-',
      m.credit_amount ? formatCurrency(m.credit_amount) : '-',
      m.running_balance ? formatCurrency(m.running_balance) : '0'
    ]),
    theme: 'grid',
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  })

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 15
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(150, 150, 150)
  doc.text('This is a computer-generated document and does not require a signature.', pageWidth / 2, finalY, { align: 'center' })

  // Save the PDF
  doc.save(`Ledger_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getTime()}.pdf`)
}
