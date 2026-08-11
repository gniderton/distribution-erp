import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { api } from '@/lib/axios'

// Helper to convert number to words (Indian Number System)
function toWordsIndian(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen ']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const n = ('000000000' + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/)
  if (!n) return ''
  let str = ''
  str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : ''
  str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : ''
  str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : ''
  str += Number(n[4]) !== 0 ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : ''
  str += Number(n[5]) !== 0 ? (str !== '' ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) + 'Only' : 'Only'
  return str
}

function _drawSimpleBox(doc: any, x: number, y: number, width: number, height: number, rows: [string, string][], labelWidth: number = 55) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(x, y, width, height);
  let rowY = y + 11;
  rows.forEach(([label, value]) => {
    if (!value) return;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(String(label) + ":", x + 5, rowY);
    doc.setFont("helvetica", "normal");
    const val = String(value || "-");
    const splitVal = doc.splitTextToSize(val, width - labelWidth - 5);
    doc.text(splitVal, x + labelWidth, rowY);
    rowY += splitVal.length * 9.5 + 1.5;
  });
}

function groupDnLines(lines: any[]) {
  const map = new Map<string, any>();
  lines.forEach(line => {
    const key = line['product_code'] + '_' + line['MRP'];
    if (!map.has(key)) {
      map.set(key, { 
        ...line, 
        maxQtyBatch: { qty: Number(line['Qty']), batch: line['Batch No'], expiry: line['Expiry'] } 
      });
    } else {
      const existing = map.get(key);
      const currentQty = Number(line['Qty'] || 0);
      existing['Qty'] = Number(existing['Qty'] || 0) + currentQty;
      existing['Gross $'] = Number(existing['Gross $'] || 0) + Number(line['Gross $'] || 0);
      existing['Taxable $'] = Number(existing['Taxable $'] || 0) + Number(line['Taxable $'] || 0);
      existing['GST $'] = Number(existing['GST $'] || 0) + Number(line['GST $'] || 0);
      existing['Net $'] = Number(existing['Net $'] || 0) + Number(line['Net $'] || 0);
      if (currentQty > existing.maxQtyBatch.qty) {
        existing.maxQtyBatch = { qty: currentQty, batch: line['Batch No'], expiry: line['Expiry'] };
      }
    }
  });
  return Array.from(map.values()).map(item => {
    item['Batch No'] = item.maxQtyBatch.batch || '';
    item['Expiry'] = item.maxQtyBatch.expiry || null;
    return item;
  });
}

function getDNTaxSummary(lines: any[]) {
  const summary: any = {}
  lines.forEach(l => {
    const taxPct = l['GST %'] || 0
    if (!summary[taxPct]) summary[taxPct] = { Pcs: 0, Taxable: 0, Tax: 0, Net: 0 }
    summary[taxPct].Pcs += Number(l['Qty'] || 0)
    summary[taxPct].Taxable += Number(l['Taxable $'] || 0)
    summary[taxPct].Tax += Number(l['GST $'] || 0)
    summary[taxPct].Net += Number(l['Net $'] || 0)
  })
  
  const rows = Object.keys(summary).map(pct => ({
    PARTICULARS: `GST @ ${pct}%`,
    ...summary[pct]
  }))

  const total = { PARTICULARS: 'Total', Pcs: 0, Taxable: 0, Tax: 0, Net: 0 }
  rows.forEach(r => {
    total.Pcs += r.Pcs
    total.Taxable += r.Taxable
    total.Tax += r.Tax
    total.Net += r.Net
  })

  return [...rows, total]
}

export async function generateDebitNotePdf(dnHeader: any) {
  try {
    const { data: dnLines } = await api.get(`/api/debit-notes/${dnHeader.id}/items`)
    
    const doc = new jsPDF('p', 'pt', 'a4')
    const groupedLines = groupDnLines(dnLines || [])
    const summaryData = getDNTaxSummary(groupedLines)
    const grandTotal = Number(dnHeader.amount || 0)

    const brand = {
      regt_name: "Gniderton Private Limited",
      address: "No.57/1003-C, Near Abu Haji Hall, Pallikkandy Road, Kozhikode, Kerala 673003",
      gst: "32AALCG2360H1ZT",
      contact_no: "+919567987408",
      email: "office@gniderton.com"
    }

    const margin = 12
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height

    const drawMainHeader = (currentPage: number, totalPages: number) => {
      const headerY = margin
      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      const title = (dnHeader.note_type || "DEBIT NOTE").toUpperCase()
      doc.text(title, pageWidth / 2, headerY + 15, { align: "center" })
      
      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      doc.text(String(dnHeader.debit_note_number), pageWidth / 2, headerY + 30, { align: "center" })
      
      const boxesY = headerY + 45
      const gap = 8
      const boxWidth = (pageWidth - margin * 2 - gap * 2) / 3
      const boxHeight = 90
      
      _drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
        ["DN NO", String(dnHeader.debit_note_number)],
        ["DATE", new Date(dnHeader.debit_note_date).toLocaleDateString('en-GB')],
        ["BILL REF", String(dnHeader.linked_invoice_number || "-")],
        ["AMT", "INR " + Number(grandTotal).toFixed(2)],
        ["PAGE", `${currentPage} / ${totalPages}`]
      ], 60)
      
      _drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
        ["From", String(brand.regt_name)],
        ["Addr", String(brand.address)],
        ["GST", String(brand.gst)],
        ["Contact", String(brand.contact_no)],
        ["Email", String(brand.email)]
      ], 45)
      
      const vAddr = [dnHeader.vendor_address, dnHeader.vendor_city, dnHeader.vendor_pin].filter(Boolean).join(", ")
      _drawSimpleBox(doc, margin + boxWidth * 2 + gap * 2, boxesY, boxWidth, boxHeight, [
        ["Vendor", String(dnHeader.vendor_name)],
        ["Addr", vAddr || "-"],
        ["GST", String(dnHeader.vendor_gst || "-")],
        ["Contact", String(dnHeader.vendor_contact || "-")],
        ["Supply", String(dnHeader.place_of_supply || "-")]
      ], 45)
    }

    autoTable(doc, {
      startY: 160,
      margin: { left: margin, right: margin, top: 160, bottom: 12 },
      head: [["S.N", "ITEM NAME", "HSN", "BATCH\nEXPIRY", "MRP", "QTY", "PRICE", "GROSS", "SCH", "D%", "D.AMT", "TXBL", "GST%", "GST$", "NET$"]],
      body: groupedLines.map((row: any, index: number) => {
        const expiryStr = row['Expiry'] ? new Date(row['Expiry']).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' }) : "-"
        return [
          index + 1,
          `${row['Item Name']}\nEAN: ${row['EAN Code'] || row['product_code'] || ""}`,
          row['hsn_code'] || "-",
          `${row['Batch No'] || ""}\n${expiryStr}`,
          Number(row['MRP'] || 0).toFixed(2),
          row['Qty'],
          Number(row['Price'] || 0).toFixed(2),
          Number(row['Gross $'] || 0).toFixed(2),
          "0.00",
          "0%",
          "0.00",
          Number(row['Taxable $'] || 0).toFixed(2),
          row['GST %'] + "%",
          Number(row['GST $'] || 0).toFixed(2),
          Number(row['Net $'] || 0).toFixed(2)
        ]
      }),
      didDrawPage: (data: any) => drawMainHeader(data.pageNumber, (doc.internal as any).getNumberOfPages()),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, lineColor: [100, 100, 100], lineWidth: 0.5, textColor: [0, 0, 0], overflow: 'linebreak' },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        1: { cellWidth: 120 }
      }
    })

    let currentY = (doc as any).lastAutoTable.finalY + 15
    if (currentY > pageHeight - 220) {
      doc.addPage()
      currentY = 160
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin },
      head: [["TAX SUMMARY", "TOTAL PCS", "TAXABLE VALUE", "TAX AMOUNT", "NET AMOUNT"]],
      body: summaryData.map((row: any) => [row.PARTICULARS, row.Pcs, row.Taxable.toFixed(2), row.Tax.toFixed(2), row.Net.toFixed(2)]),
      didDrawPage: (data: any) => drawMainHeader(data.pageNumber, (doc.internal as any).getNumberOfPages()),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 4, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
      headStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' },
      didParseCell: (data: any) => {
        if (data.row.raw[0] === 'Total') {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [250, 250, 250]
        }
      },
      tableWidth: 400
    })

    let batchTableY = (doc as any).lastAutoTable.finalY + 15
    autoTable(doc, {
      startY: batchTableY,
      margin: { left: margin, right: margin, bottom: 12 },
      head: [["S.N", "BATCH DETAILS (ITEM NAME)", "MRP", "BATCH", "EXPIRY", "QTY"]],
      body: (dnLines || []).map((row: any, i: number) => {
        const expiryStr = row['Expiry'] ? new Date(row['Expiry']).toLocaleDateString('en-GB') : "-"
        return [
          i + 1,
          row['Item Name'],
          Number(row['MRP'] || 0).toFixed(2),
          row['Batch No'] || "-",
          expiryStr,
          row['Qty']
        ]
      }),
      didDrawPage: (data: any) => drawMainHeader(data.pageNumber, (doc.internal as any).getNumberOfPages()),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 3, lineColor: [100, 100, 100], lineWidth: 0.5, textColor: [0, 0, 0] },
      headStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' }
    })

    let wordsY = (doc as any).lastAutoTable.finalY + 25
    if (wordsY > pageHeight - 200) {
      doc.addPage()
      drawMainHeader((doc.internal as any).getNumberOfPages(), (doc.internal as any).getNumberOfPages())
      wordsY = 160
    }

    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Total Amount (in words):", margin, wordsY)
    doc.setFont("helvetica", "normal")
    doc.text(toWordsIndian(Math.round(grandTotal)), margin + 130, wordsY)

    doc.setFontSize(8)
    doc.text("This is a computer generated document and does not require a physical signature.", margin, wordsY + 20)

    const slipY = pageHeight - 160
    ;(doc as any).setLineDash([3, 3], 0)
    doc.line(margin, slipY, pageWidth - margin, slipY)
    ;(doc as any).setLineDash([], 0)

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("DETACHABLE ACKNOWLEDGEMENT SLIP", pageWidth / 2, slipY + 15, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.text(`Debit Note: ${dnHeader.debit_note_number}`, margin, slipY + 35)
    doc.text(`Date: ${new Date(dnHeader.debit_note_date).toLocaleDateString('en-GB')}`, margin + 180, slipY + 35)
    doc.text(`Amount: ${Number(grandTotal).toFixed(2)}`, margin + 350, slipY + 35)
    doc.text(`Vendor: ${dnHeader.vendor_name}`, margin, slipY + 50)
    doc.text(`Receiver's Signature: ___________________________`, margin + 310, slipY + 80)

    doc.save((dnHeader.debit_note_number || "DebitNote") + ".pdf")
  } catch (error: any) {
    alert("PDF Generation Failed: " + error.message)
  }
}
