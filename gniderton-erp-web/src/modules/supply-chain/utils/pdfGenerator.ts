import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { api } from '@/lib/axios'

// --- HELPER: Info Box Grid ---
const drawSimpleBox = (doc: any, x: number, y: number, width: number, height: number, rows: (string | null)[][]) => {
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.rect(x, y, width, height)
  let rowY = y + 12 // Start slightly lower 
  rows.forEach(r => {
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.text(String(r[0]) + ":", x + 5, rowY)
    doc.setFont("helvetica", "normal")
    const val = String(r[1] || "-")
    // Offset text to align nicely next to the label
    const splitVal = doc.splitTextToSize(val, width - 75)
    doc.text(splitVal, x + 70, rowY)
    rowY += (splitVal.length * 10) + 1
  })
}

const getCompanySettings = async () => {
  try {
    const res = await api.get('/api/company-settings')
    return {
      regt_name: res.data?.company_name || res.data?.regt_name || "Company",
      address: res.data?.address || "-",
      District: res.data?.district || "-",
      pin: res.data?.pin_code || "-",
      gst: res.data?.gstin || "-",
      fssai_no: res.data?.fssai_no || "-",
      email: res.data?.email || "-",
      contact_no: res.data?.contact_no || "-",
      logo: res.data?.logo || null
    }
  } catch (err) {
    return {
      regt_name: "Company", address: "-", District: "-", pin: "-", gst: "-", fssai_no: "-", email: "-", contact_no: "-", logo: null
    }
  }
}

export const generatePicklistPDF = async (tripInfo: any, data: any[]) => {
  const doc = new jsPDF('p', 'pt', 'a4')
  const margin = 15
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height

  const brand = await getCompanySettings()

  // --- HEADER BLOCK (Page 1 Only) ---
  const drawTopSection = () => {
    const headerY = margin + 5
    try {
      if (brand.logo) {
        const logoData = brand.logo.startsWith('data:image') ? brand.logo : `data:image/png;base64,${brand.logo}`;
        doc.addImage(logoData, 'PNG', margin, headerY, 80, 25)
      }
    } catch(e) {}

    doc.setTextColor(0, 0, 0) // Black
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text("WAREHOUSE PICKLIST", pageWidth / 2, headerY + 15, { align: "center" })

    const boxesY = headerY + 35
    const gap = 10
    const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3
    const boxHeight = 55

    // BOX 1: Company
    drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
      ["COMPANY", String(brand.regt_name)],
      ["GST", String(brand.gst)],
      ["CONTACT", String(brand.contact_no)],
      ["EMAIL", String(brand.email)]
    ])

    // BOX 2: Trip Details
    drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
      ["TEAM", String(tripInfo.team_name || "General Team")],
      ["DRIVER", String(tripInfo.driver_name || "Unassigned")],
      ["VEHICLE", String(tripInfo.vehicle_number || "Not Assigned")]
    ])

    // BOX 3: Item Metrics
    const totalQty = data.reduce((sum, r) => sum + Number(r.total_qty || 0), 0)
    drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
      ["TRIP NO", String(tripInfo.trip_number || "-")],
      ["DATE", tripInfo.date ? format(new Date(tripInfo.date), "dd MMM yyyy") : "-"],
      ["TOTAL ITEMS", `${data.length} Products`],
      ["TOTAL QTY", `${totalQty.toFixed(0)} Units`]
    ])

    return boxesY + boxHeight + 2.5
  }

  const firstPageTableStart = drawTopSection()

  // --- TABLE ---
  autoTable(doc as any, {
    startY: firstPageTableStart,
    margin: { left: margin, right: margin, bottom: 40, top: 2.5 },
    head: [["S.N", "CODE", "ITEM DESCRIPTION", "BATCHES", "MRP", "QTY", "LOADED [ ]"]],
    body: data.map((row, index) => [
      String(index + 1),
      row.product_code || "-",
      { content: row.product_name || "-", styles: { fontStyle: 'bold' } },
      row.batches || "-",
      Number(row.mrp || 0).toFixed(2),
      { content: Number(row.total_qty || 0).toFixed(0), styles: { fontStyle: 'bold', halign: 'center', fontSize: 10 } },
      ""
    ]),
    didDrawPage: (data: any) => {
      // Clean Footer
      doc.setFontSize(8)
      doc.setTextColor(100)
      doc.setFont("helvetica", "normal")
      const timestamp = `Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`
      doc.text(timestamp, margin, pageHeight - 15)
      doc.text(`Page ${data.pageNumber} of ${(doc as any).internal.getNumberOfPages()}`, pageWidth - margin - 40, pageHeight - 15)
      
      // Signatures on last page
      if (data.pageNumber === (doc as any).internal.getNumberOfPages()) {
        doc.setDrawColor(150)
        doc.setLineWidth(0.5)
        doc.line(margin, pageHeight - 40, margin + 120, pageHeight - 40)
        doc.text("Warehouse Supervisor", margin, pageHeight - 30)
        
        doc.line(pageWidth - margin - 120, pageHeight - 40, pageWidth - margin, pageHeight - 40)
        doc.text("Driver Signature", pageWidth - margin - 120, pageHeight - 30)
      }
    },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 5, lineColor: [0, 0, 0], lineWidth: 0.5, minCellHeight: 20, textColor: [0,0,0], valign: 'middle' },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.5, lineColor: [0,0,0] },
    columnStyles: { 0: { cellWidth: 25 }, 2: { cellWidth: 'auto' }, 4: { cellWidth: 40 }, 5: { cellWidth: 45 }, 6: { cellWidth: 60 } }
  })

  doc.save(`PickList_${tripInfo.trip_number || 'TRIP'}.pdf`)
}

export const generateManifestPDF = async (tripInfo: any, data: any[]) => {
  const doc = new jsPDF('p', 'pt', 'a4')
  const margin = 15
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height

  const brand = await getCompanySettings()

  // --- HEADER BLOCK (Page 1 Only) ---
  const drawTopSection = () => {
    const headerY = margin + 5
    try {
      if (brand.logo) {
        const logoData = brand.logo.startsWith('data:image') ? brand.logo : `data:image/png;base64,${brand.logo}`;
        doc.addImage(logoData, 'PNG', margin, headerY, 80, 25)
      }
    } catch(e) {}

    doc.setTextColor(0, 0, 0) // Black
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text("DELIVERY & COLLECTION SHEET", pageWidth / 2, headerY + 15, { align: "center" })

    const boxesY = headerY + 35
    const gap = 10
    const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3
    const boxHeight = 55

    // BOX 1: Company
    drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
      ["COMPANY", String(brand.regt_name)],
      ["GST", String(brand.gst)],
      ["CONTACT", String(brand.contact_no)],
      ["EMAIL", String(brand.email)]
    ])

    // BOX 2: Trip Details
    drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
      ["TEAM", String(tripInfo.team_name || "General Team")],
      ["DRIVER", String(tripInfo.driver_name || "Unassigned")],
      ["VEHICLE", String(tripInfo.vehicle_number || "Not Assigned")]
    ])

    // BOX 3: Route Metrics
    const totalAmnt = data.reduce((sum, r) => sum + Number(r.grand_total || 0), 0)
    drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
      ["TRIP NO", String(tripInfo.trip_number || "-")],
      ["DATE", tripInfo.date ? format(new Date(tripInfo.date), "dd MMM yyyy") : "-"],
      ["TOTAL SHOPS", `${data.length} Customers`],
      ["EXPECTED", `Rs. ${totalAmnt.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`]
    ])

    return boxesY + boxHeight + 2.5
  }

  const firstPageTableStart = drawTopSection()

  // --- TABLE ---
  autoTable(doc as any, {
    startY: firstPageTableStart,
    margin: { left: margin, right: margin, bottom: 40, top: 2.5 },
    head: [["SEQ", "INVOICE #", "CUSTOMER NAME", "ADDRESS/CONTACT", "BILL AMT", "COLLECTED [ ]", "REMARKS"]],
    body: data.map((row, index) => [
      String(index + 1),
      row.invoice_number,
      { content: row.customer_name, styles: { fontStyle: 'bold' } },
      `${row.address || ""}\nPh: ${row.phone || "-"}`,
      { content: Number(row.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
      "", 
      "" 
    ]),
    didDrawPage: (data: any) => {
      // Clean Footer
      doc.setFontSize(8)
      doc.setTextColor(100)
      doc.setFont("helvetica", "normal")
      const timestamp = `Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`
      doc.text(timestamp, margin, pageHeight - 15)
      doc.text(`Page ${data.pageNumber} of ${(doc as any).internal.getNumberOfPages()}`, pageWidth - margin - 40, pageHeight - 15)
      
      // Signatures on last page
      if (data.pageNumber === (doc as any).internal.getNumberOfPages()) {
        doc.setDrawColor(150)
        doc.setLineWidth(0.5)
        doc.line(margin, pageHeight - 40, margin + 120, pageHeight - 40)
        doc.text("Driver Signature", margin, pageHeight - 30)
        
        doc.line(pageWidth - margin - 120, pageHeight - 40, pageWidth - margin, pageHeight - 40)
        doc.text("Manager Signature", pageWidth - margin - 120, pageHeight - 30)
      }
    },
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 4, lineColor: [0, 0, 0], lineWidth: 0.5, minCellHeight: 25, textColor: [0,0,0], valign: 'middle' },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.5, lineColor: [0,0,0] },
    columnStyles: { 0: { cellWidth: 25 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 110 }, 4: { cellWidth: 60 }, 5: { cellWidth: 70 }, 6: { cellWidth: 70 } }
  })

  doc.save(`DeliverySheet_${tripInfo.trip_number || 'TRIP'}.pdf`)
}

export const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
