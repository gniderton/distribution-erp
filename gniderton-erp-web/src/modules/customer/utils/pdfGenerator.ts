import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate, formatCurrency } from '@/lib/utils'

// Helper for boxes
const drawSimpleBox = (doc: any, x: number, y: number, width: number, height: number, rows: (any[])[], labelWidth: number = 58) => {
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.rect(x, y, width, height)
  let rowY = y + 11

  rows.forEach(r => {
    doc.setFontSize(8.5)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    const label = String(r[0]) + ":"
    doc.text(label, x + 5, rowY)
    doc.setFont("helvetica", "normal")

    const val = String(r[1] || "-")
    const isRightAlign = r[2] === true

    if (isRightAlign) {
      doc.text(val, x + width - 5, rowY, { align: 'right' })
      rowY += 11
    } else {
      const splitVal = doc.splitTextToSize(val, width - labelWidth - 5)
      doc.text(splitVal, x + labelWidth, rowY)
      rowY += (splitVal.length * 9.5) + 1.5
    }
  })
}

export const generateLedgerPDF = (customerName: string, customerPhone: string, ledgerData: any) => {
  const doc = new jsPDF('p', 'pt', 'a4')
  
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

  const formatStartDate = "Start" // You can pass dates if needed
  const formatEndDate = "End"
  const downloadTimestamp = formatDate(new Date().toISOString())

  const drawMainHeader = (currentPage: number, totalPages: number) => {
    let headerY = margin

    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("CUSTOMER LEDGER STATEMENT", pageWidth / 2, headerY + 15, { align: "center" })
    doc.setFontSize(11)
    doc.text(`${formatStartDate} to ${formatEndDate}`, pageWidth / 2, headerY + 30, { align: "center" })

    const boxesY = headerY + 40
    const gap = 8
    const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3
    const boxHeight = 95

    // BOX 1: Our Details (Brand details would come from API, using placeholders or empty if missing)
    drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
      ["From", "GNIDERTON ERP"],
      ["Address", "-"],
      ["Dist/PIN", "-"],
      ["GST", "-"],
      ["Email", "-"],
      ["Phone", "-"]
    ])

    // BOX 2: Customer Details
    drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
      ["To", customerName || "-"],
      ["Address", "-"],
      ["Code", "-"],
      ["GSTIN", "-"],
      ["Phone", customerPhone || "-"]
    ], 50)

    // BOX 3: Ledger Summary
    const opening = ledgerData?.opening_balance || 0
    const tDebit = ledgerData?.total_debit || 0
    const tCredit = ledgerData?.total_credit || 0
    const closing = ledgerData?.closing_balance || 0

    drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
      ["Opening Bal", formatCurrency(opening), true],
      ["Total Debit", formatCurrency(tDebit), true],
      ["Total Credit", formatCurrency(tCredit), true],
      ["Closing Bal", formatCurrency(closing), true],
      ["Printed On", String(downloadTimestamp)],
      ["PAGE", `${currentPage} / ${totalPages}`]
    ], 65)

    return boxesY + boxHeight
  }

  // --- 2. LEDGER TABLE ---
  const tableStartY = margin + 40 + 95 + 10
  
  const movements = Array.isArray(ledgerData) ? ledgerData : (ledgerData?.ledger || [])
  const ledgerRows = movements.length > 0 
    ? movements 
    : [{ date: new Date().toISOString(), type: "-", reference_number: "-", description: "No transactions in this period", debit_amount: 0, credit_amount: 0, running_balance: ledgerData?.opening_balance || 0 }]

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin, top: 157, bottom: 15 },
    head: [["DATE", "TYPE", "REFERENCE #", "DESCRIPTION", "DEBIT", "CREDIT", "BALANCE"]],
    body: ledgerRows.map((row: any) => {
      return [
        formatDate(row.date), 
        row.type, 
        row.reference_number || "-", 
        row.description || "-", 
        Number(row.debit_amount || 0).toFixed(2), 
        Number(row.credit_amount || 0).toFixed(2), 
        Number(row.running_balance || 0).toFixed(2)
      ]
    }),
    didDrawPage: (data: any) => {
      drawMainHeader(data.pageNumber, (doc.internal as any).getNumberOfPages())
    },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0], overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.5 },
    columnStyles: { 
      0: { cellWidth: 55 }, // Date
      1: { cellWidth: 55 }, // Type
      2: { cellWidth: 80 }, // Ref
      3: { cellWidth: 'auto', minCellWidth: 100 }, // Desc
      4: { halign: 'right', cellWidth: 60 }, // Debit
      5: { halign: 'right', cellWidth: 60 }, // Credit
      6: { halign: 'right', cellWidth: 70, fontStyle: 'bold' }  // Balance
    }
  })

  // Save the PDF
  const safeCustomerName = (customerName || "Customer").replace(/[^a-zA-Z0-9]/g, '_')
  const fileName = `Ledger_${safeCustomerName}_${new Date().getTime()}.pdf`
  doc.save(fileName)
}
