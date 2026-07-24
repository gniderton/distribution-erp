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
      // Align to the extreme right edge of the box (with 5px padding)
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

export const generateLedgerPDF = (customerData: any, ledgerData: any, startDate?: string, endDate?: string, brandData?: any) => {
  try {
    const doc = new jsPDF('p', 'pt', 'a4')
    const brand = brandData || {}

    const downloadTimestamp = formatDate(new Date().toISOString())
    const formatStartDate = startDate ? formatDate(startDate) : "Start"
    const formatEndDate = endDate ? formatDate(endDate) : "End"

    const margin = 12
    const pageWidth = doc.internal.pageSize.width

    const drawMainHeader = (currentPage: number, totalPages: number) => {
      const headerY = margin
      
      // If you have a logo base64, uncomment below
      /*
      try {
        const logo = brand.logo;
        if (logo && logo.startsWith("data:image/")) {
          doc.addImage(logo, 'PNG', margin, headerY, 90, 30);
        }
      } catch(e) {}
      */

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

      // BOX 1: Our Details
      _drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
        ["From", String(brand.regt_name || "GNIDERTON ERP")],
        ["Address", String(brand.address || "")],
        ["Dist/PIN", `${brand.District || ""} - ${brand.pin || ""}`],
        ["GST", String(brand.gst || "")],
        ["Email", String(brand.email || "")],
        ["Phone", String(brand.contact_no || "")]
      ])

      // BOX 2: Customer Details
      const cAddr = [customerData.address_line1, customerData.address_line2, customerData.city, customerData.state, customerData.pincode ? "PIN: " + customerData.pincode : null].filter(Boolean).join(", ")
      _drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
        ["To", String(customerData.customer_name || "-")],
        ["Address", cAddr || "-"],
        ["Code", String(customerData.customer_code || "-")],
        ["GSTIN", String(customerData.gstin || "-")],
        ["Phone", String(customerData.customer_phone || customerData.whatsapp_number || "-")]
      ], 50)

      // BOX 3: Ledger Summary
      _drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
        ["Opening Bal", formatINR(ledgerData.opening_balance), true],
        ["Total Debit", formatINR(ledgerData.total_debit), true],
        ["Total Credit", formatINR(ledgerData.total_credit), true],
        ["Closing Bal", formatINR(ledgerData.closing_balance), true],
        ["Printed On", String(downloadTimestamp)],
        ["PAGE", `${currentPage} / ${totalPages}`]
      ], 65)

      return boxesY + boxHeight
    }

    // --- 2. LEDGER TABLE ---
    const tableStartY = margin + 40 + 95 + 10
    
    const ledgerRows = ledgerData.ledger && ledgerData.ledger.length > 0 
      ? ledgerData.ledger 
      : [{ date: new Date(), type: "-", reference_number: "-", description: "No transactions in this period", debit_amount: 0, credit_amount: 0, running_balance: ledgerData.opening_balance || 0 }]

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

    // --- 3. DIRECT DOWNLOAD ---
    const safeCustomerName = (customerData.customer_name || "Customer").replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `Ledger_${safeCustomerName}_${formatDate(new Date().toISOString()).replace(/\//g, '')}.pdf`
    doc.save(fileName)

  } catch (error: any) {
    console.error("Ledger PDF Error: " + error.message)
  }
}

export const exportLedgerToExcel = (customerData: any, ledgerData: any, startDate?: string, endDate?: string) => {
  try {
    const formatStartDate = startDate ? formatDate(startDate) : "Start"
    const formatEndDate = endDate ? formatDate(endDate) : "End"

    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return '""'
      const s = String(str)
      return `"${s.replace(/"/g, '""')}"`
    }

    let csvContent = ""

    // --- 1. SHEET SUMMARY HEADER ---
    csvContent += `CUSTOMER LEDGER STATEMENT\n`
    csvContent += `Customer:,${escapeCSV(customerData.customer_name)}\n`
    csvContent += `Code:,${escapeCSV(customerData.customer_code || "-")}\n`
    csvContent += `Period:,${formatStartDate} to ${formatEndDate}\n`
    csvContent += `Opening Balance:,${Number(ledgerData.opening_balance || 0).toFixed(2)}\n`
    csvContent += `Total Debit:,${Number(ledgerData.total_debit || 0).toFixed(2)}\n`
    csvContent += `Total Credit:,${Number(ledgerData.total_credit || 0).toFixed(2)}\n`
    csvContent += `Closing Balance:,${Number(ledgerData.closing_balance || 0).toFixed(2)}\n`
    csvContent += `\n`

    // --- 2. TABLE HEADERS ---
    csvContent += `DATE,TYPE,REFERENCE,DESCRIPTION,DEBIT,CREDIT,BALANCE\n`

    // --- 3. TABLE ROWS ---
    const ledgerRows = ledgerData.ledger && ledgerData.ledger.length > 0 ? ledgerData.ledger : []
    ledgerRows.forEach((row: any) => {
      const date = formatDate(row.date)
      const type = row.type || ""
      const ref = row.reference_number || ""
      const desc = row.description || ""
      const deb = Number(row.debit_amount || 0).toFixed(2)
      const cred = Number(row.credit_amount || 0).toFixed(2)
      const bal = Number(row.running_balance || 0).toFixed(2)

      csvContent += `${date},${escapeCSV(type)},${escapeCSV(ref)},${escapeCSV(desc)},${deb},${cred},${bal}\n`
    })

    // --- 4. DIRECT FILE DOWNLOAD ---
    const safeCustomerName = (customerData.customer_name || "Customer").replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `Ledger_${safeCustomerName}_${formatDate(new Date().toISOString()).replace(/\//g, '')}.csv`
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

  } catch (error: any) {
    console.error("Export Error: " + error.message)
  }
}
