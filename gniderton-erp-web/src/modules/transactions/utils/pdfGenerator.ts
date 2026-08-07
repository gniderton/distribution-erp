import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from '@/lib/utils'

// Helper for boxes
const _drawSimpleBox = (doc: any, x: number, y: number, width: number, height: number, rows: (any[])[], labelWidth: number = 58) => {
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

// Helper for Currency Formatter
const formatINR = (amt: any) => {
  return "Rs. " + Number(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const generateEntityLedgerPDF = (entity: any, type: 'expense' | 'income', data: any[], totalAmount: number, brandData?: any) => {
  try {
    const doc = new jsPDF('p', 'pt', 'a4')
    const brand = brandData || {}

    const downloadTimestamp = formatDate(new Date().toISOString())

    const margin = 12
    const pageWidth = doc.internal.pageSize.width

    const drawMainHeader = (currentPage: number, totalPages: number) => {
      const headerY = margin

      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.text(`${type === 'expense' ? 'VENDOR' : 'INCOME SOURCE'} LEDGER STATEMENT`, pageWidth / 2, headerY + 15, { align: "center" })
      doc.setFontSize(11)
      doc.text(entity.name, pageWidth / 2, headerY + 30, { align: "center" })

      const boxesY = headerY + 40
      const gap = 8
      const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3
      const boxHeight = 95

      // BOX 1: Our Details
      _drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
        ["From", String(brand.company_name || brand.regt_name || "GNIDERTON ERP")],
        ["Address", String(brand.address || "")],
        ["Dist/PIN", `${brand.district || brand.District || ""} - ${brand.pin || brand.pincode || ""}`],
        ["GST", String(brand.gstin || brand.gst || "")],
        ["Email", String(brand.email || "")],
        ["Phone", String(brand.contact_no || "")]
      ])

      // BOX 2: Entity Details
      _drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
        ["Ledger Of", entity.name],
        ["Phone", entity.phone],
        ["GST No", entity.gst_no]
      ], 50)

      // BOX 3: Ledger Summary
      _drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
        ["Total Trans.", String(data.length), true],
        ["Total Volume", formatINR(totalAmount), true],
        ["Printed On", String(downloadTimestamp)],
        ["PAGE", `${currentPage} / ${totalPages}`]
      ], 65)

      return boxesY + boxHeight
    }

    // --- 2. LEDGER TABLE ---
    const tableStartY = margin + 40 + 95 + 10
    
    const bodyRows = data.length > 0 
      ? data.map((row: any) => [
          formatDate(row.date),
          row.type || '-',
          row.reference || '-',
          row.description || '-',
          Number(row.debit || 0).toFixed(2),
          Number(row.credit || 0).toFixed(2)
        ])
      : [['-', '-', '-', 'No transactions in this period', '0.00', '0.00']]

    autoTable(doc, {
      startY: tableStartY,
      margin: { left: margin, right: margin, top: 157, bottom: 15 },
      head: [["DATE", "TYPE", "REFERENCE", "DESCRIPTION", "DEBIT", "CREDIT"]],
      body: bodyRows,
      didDrawPage: (dataObj: any) => {
        drawMainHeader(dataObj.pageNumber, (doc.internal as any).getNumberOfPages())
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
        5: { halign: 'right', cellWidth: 60 }  // Credit
      }
    })

    // --- 3. DIRECT DOWNLOAD ---
    const safeTitle = entity.name.replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `${type === 'expense' ? 'Vendor' : 'IncomeSource'}_Ledger_${safeTitle}_${formatDate(new Date().toISOString()).replace(/\//g, '')}.pdf`
    doc.save(fileName)

  } catch (error: any) {
    console.error("Ledger PDF Error: " + error.message)
    throw error
  }
}
