import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { api } from '@/lib/axios'

const drawSimpleBox = (doc: any, x: number, y: number, width: number, height: number, rows: (string | null)[][]) => {
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.rect(x, y, width, height)
  let rowY = y + 12 
  rows.forEach(r => {
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.text(String(r[0]) + ":", x + 5, rowY)
    doc.setFont("helvetica", "normal")
    const val = String(r[1] || "-")
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
      contact_no: res.data?.contact_no || "-",
      email: res.data?.email || "-",
      gst: res.data?.gstin || "-",
      logo: res.data?.logo || null
    }
  } catch (err) {
    return { regt_name: "Company", address: "-", contact_no: "-", email: "-", gst: "-", logo: null }
  }
}

export const generateTripHistoryPDF = async (syncId: number | string, data: any) => {
  const doc = new jsPDF('p', 'pt', 'a4')
  const margin = 15
  const pageWidth = doc.internal.pageSize.width
  
  const brand = await getCompanySettings()

  let currentY = margin + 5
  
  try {
    if (brand.logo) {
      const logoData = brand.logo.startsWith('data:image') ? brand.logo : `data:image/png;base64,${brand.logo}`;
      doc.addImage(logoData, 'PNG', margin, currentY, 80, 25)
    }
  } catch(e) {}

  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("TRIP SETTLEMENT REPORT", pageWidth / 2, currentY + 15, { align: "center" })

  currentY += 35
  const gap = 10
  const boxWidth = (pageWidth - (margin * 2) - gap) / 2
  const boxHeight = 55

  drawSimpleBox(doc, margin, currentY, boxWidth, boxHeight, [
    ["COMPANY", String(brand.regt_name)],
    ["GST", String(brand.gst)],
    ["CONTACT", String(brand.contact_no)],
    ["EMAIL", String(brand.email)]
  ])

  drawSimpleBox(doc, margin + boxWidth + gap, currentY, boxWidth, boxHeight, [
    ["SYNC ID", String(syncId)],
    ["DATE", data.header?.created_at ? format(new Date(data.header.created_at), "dd MMM yyyy HH:mm") : "-"],
    ["TOTAL DELIVERED", `${data.delivered?.length || 0} Invoices`],
    ["TOTAL RETURNED", `${data.rejected?.length || 0} Invoices`]
  ])

  currentY += boxHeight + 10 // Added a small gap
  const kpiHeight = 50
  doc.setFillColor(43, 51, 120) // Dark Blue
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), kpiHeight, 6, 6, 'F')

  const totalDelivered = data.delivered?.reduce((acc: number, val: any) => acc + Number(val.grand_total), 0) || 0
  const collectedCash = data.payments?.reduce((acc: number, val: any) => acc + Number(val.amount), 0) || 0
  const tripExpenses = data.expenses?.reduce((acc: number, val: any) => acc + Number(val.amount), 0) || 0
  const netSettled = collectedCash - tripExpenses

  const cols = 4
  const colWidth = (pageWidth - (margin * 2)) / cols

  const drawKPIColumn = (idx: number, label: string, val: string) => {
    const x = margin + (idx * colWidth)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(200, 200, 230) // Light blueish text for label
    doc.text(label, x + (colWidth / 2), currentY + 20, { align: 'center' })
    
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(255, 255, 255) // White text for value
    doc.text(val, x + (colWidth / 2), currentY + 38, { align: 'center' })
    
    // Draw separator line
    if (idx < cols - 1) {
      doc.setDrawColor(80, 80, 150)
      doc.setLineWidth(1)
      doc.line(x + colWidth, currentY + 10, x + colWidth, currentY + 40)
    }
  }

  drawKPIColumn(0, "TOTAL DELIVERED", `Rs. ${totalDelivered.toFixed(2)}`)
  drawKPIColumn(1, "COLLECTED CASH", `Rs. ${collectedCash.toFixed(2)}`)
  drawKPIColumn(2, "TRIP EXPENSES", `Rs. ${tripExpenses.toFixed(2)}`)
  drawKPIColumn(3, "NET SETTLED", `Rs. ${netSettled.toFixed(2)}`)

  currentY += kpiHeight + 20

  const themeStyles = {
    theme: 'plain' as const, // We use plain to remove harsh grid borders and customize row backgrounds
    styles: { fontSize: 8, cellPadding: 6, textColor: [30, 30, 30] as [number, number, number] },
    headStyles: { fillColor: [242, 235, 226] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: 'bold' as const },
    alternateRowStyles: { fillColor: [252, 250, 245] as [number, number, number] },
    margin: { left: margin, right: margin }
  }

  const drawSectionHeader = (title: string, yPos: number) => {
    doc.setFillColor(242, 235, 226)
    doc.rect(margin, yPos, pageWidth - (margin * 2), 20, 'F')
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text(title, margin + 5, yPos + 14)
    return yPos + 25
  }

  // 1. Delivered Invoices
  if (data.delivered && data.delivered.length > 0) {
    currentY = drawSectionHeader("DELIVERED INVOICES", currentY)
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Invoice Number", "Customer Name", "Total Amount"]],
      body: data.delivered.map((d: any) => [d.invoice_number, d.customer_name, `Rs. ${Number(d.grand_total).toFixed(2)}`])
    });
    currentY = (doc as any).lastAutoTable.finalY + 20;
  }

  // 2. Not Delivered List
  const notDelivered = [...(data.undelivered || []), ...(data.rejected || [])]
  if (notDelivered.length > 0) {
    currentY = drawSectionHeader("UNDELIVERED / REJECTED INVOICES", currentY)
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Invoice Number", "Customer Name", "DSE Status", "Verification Status"]],
      body: notDelivered.map(d => [d.invoice_number, d.customer_name, d.delivery_status || '-', d.verification_status || '-'])
    });
    currentY = (doc as any).lastAutoTable.finalY + 20;
  }

  // 3. Picklist (Product Delivery Summary)
  if (data.delivered_summary && data.delivered_summary.length > 0) {
    currentY = drawSectionHeader("PRODUCT DELIVERY SUMMARY", currentY)
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Product Name", "MRP", "Delivered Qty", "Returned Qty"]],
      body: data.delivered_summary.map((s: any) => {
          const ret = data.returns_summary?.find((rs: any) => rs.product_name === s.product_name);
          return [s.product_name, `Rs. ${Number(s.mrp).toFixed(2)}`, s.total_qty, ret?.total_qty || 0]
      })
    });
    currentY = (doc as any).lastAutoTable.finalY + 20;
  }

  // 3.5 Products from Undelivered Invoices
  const undeliveredSummary = [...(data.rejected_summary || []), ...(data.undelivered_summary || [])]
  if (undeliveredSummary.length > 0) {
    currentY = drawSectionHeader("PRODUCTS FROM UNDELIVERED INVOICES", currentY)
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Product Name", "MRP", "Undelivered Qty"]],
      body: undeliveredSummary.map((m: any) => [m.product_name, `Rs. ${Number(m.mrp).toFixed(2)}`, m.total_qty])
    });
    currentY = (doc as any).lastAutoTable.finalY + 20;
  }

  const returns = data.returns || []
  
  // 4. Goods returned (Not Delivered)
  const returnsNotDelivered = returns.filter((r: any) => 
    !r.reason?.toLowerCase().includes('expiry') && !r.reason?.toLowerCase().includes('damage') &&
    !r.return_type?.toLowerCase().includes('expiry') && !r.return_type?.toLowerCase().includes('damage')
  )
  if (returnsNotDelivered.length > 0) {
    currentY = drawSectionHeader("RETURNS (NOT DELIVERED / OTHER)", currentY)
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Product Name", "Customer Name", "Qty", "Reason"]],
      body: returnsNotDelivered.map((r: any) => [r.product_name, r.customer_name, r.qty, r.reason || r.return_type || '-'])
    });
    currentY = (doc as any).lastAutoTable.finalY + 20;
  }

  // 5. Goods returned (Expiry / Damage)
  const returnsExpiryDamage = returns.filter((r: any) => 
    r.reason?.toLowerCase().includes('expiry') || r.reason?.toLowerCase().includes('damage') ||
    r.return_type?.toLowerCase().includes('expiry') || r.return_type?.toLowerCase().includes('damage')
  )
  if (returnsExpiryDamage.length > 0) {
    currentY = drawSectionHeader("RETURNS (EXPIRY / DAMAGE)", currentY)
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Product Name", "Customer Name", "Qty", "Reason"]],
      body: returnsExpiryDamage.map((r: any) => [r.product_name, r.customer_name, r.qty, r.reason || r.return_type || '-'])
    });
    currentY = (doc as any).lastAutoTable.finalY + 20;
  }

  // 6. Credit Notes Generated
  if (data.credit_notes && data.credit_notes.length > 0) {
    currentY = drawSectionHeader("CREDIT NOTES GENERATED", currentY)
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Credit Note Number", "Customer Name", "Amount"]],
      body: data.credit_notes.map((c: any) => [c.return_number, c.customer_name, `Rs. ${Number(c.grand_total).toFixed(2)}`])
    });
    currentY = (doc as any).lastAutoTable.finalY + 20;
  }

  // 7. Payments Collected
  if (data.payments && data.payments.length > 0) {
    currentY = drawSectionHeader("PAYMENTS COLLECTED", currentY)
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Receipt Number", "Customer Name", "Payment Mode", "Amount"]],
      body: data.payments.map((p: any) => [p.payment_number, p.customer_name, p.payment_mode, `Rs. ${Number(p.amount).toFixed(2)}`])
    });
    currentY = (doc as any).lastAutoTable.finalY + 20;
  }

  doc.save(`Trip_History_Report_${syncId}.pdf`)
}

export const generateVehicleInventoryPDF = async (syncId: number | string, data: any) => {
  const doc = new jsPDF('p', 'pt', 'a4')
  const margin = 15
  const pageWidth = doc.internal.pageSize.width
  
  const brand = await getCompanySettings()

  let currentY = margin + 5
  
  try {
    if (brand.logo) {
      const logoData = brand.logo.startsWith('data:image') ? brand.logo : `data:image/png;base64,${brand.logo}`;
      doc.addImage(logoData, 'PNG', margin, currentY, 80, 25)
    }
  } catch(e) {}

  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("VEHICLE INVENTORY REPORT", pageWidth / 2, currentY + 15, { align: "center" })

  currentY += 35
  const gap = 10
  const boxWidth = (pageWidth - (margin * 2) - gap) / 2
  const boxHeight = 55

  drawSimpleBox(doc, margin, currentY, boxWidth, boxHeight, [
    ["COMPANY", String(brand.regt_name)],
    ["GST", String(brand.gst)],
    ["CONTACT", String(brand.contact_no)],
    ["EMAIL", String(brand.email)]
  ])

  drawSimpleBox(doc, margin + boxWidth + gap, currentY, boxWidth, boxHeight, [
    ["SYNC ID", String(syncId)],
    ["DATE", data.header?.created_at ? format(new Date(data.header.created_at), "dd MMM yyyy HH:mm") : format(new Date(), 'dd MMM yyyy HH:mm')],
    ["UNDELIVERED", `${data.undelivered_summary?.length || 0} Items`],
    ["REJECTED", `${data.rejected_summary?.length || 0} Items`]
  ])

  currentY += boxHeight + 15

  const themeStyles = {
    theme: 'grid' as const,
    styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0] as [number, number, number], lineColor: [0, 0, 0] as [number, number, number], lineWidth: 0.1 },
    headStyles: { fillColor: [240, 240, 240] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: 'bold' as const, lineWidth: 0.1, lineColor: [0, 0, 0] as [number, number, number] }
  }

  if (data.undelivered_summary?.length > 0 || data.rejected_summary?.length > 0) {
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("Products from Undelivered & Rejected Invoices", margin, currentY)
    currentY += 10
    
    let body: any[] = []
    if (data.undelivered_summary) {
      body = [...body, ...data.undelivered_summary.map((p: any) => [p.product_name, `Rs. ${Number(p.mrp).toFixed(2)}`, p.total_qty, `Rs. ${Number(p.total_amount).toFixed(2)}`])]
    }
    if (data.rejected_summary) {
      body = [...body, ...data.rejected_summary.map((p: any) => [p.product_name, `Rs. ${Number(p.mrp).toFixed(2)}`, p.total_qty, `Rs. ${Number(p.total_amount).toFixed(2)}`])]
    }

    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Product", "MRP", "Qty in Vehicle", "Total Value"]],
      body: body
    });
    currentY = (doc as any).lastAutoTable.finalY + 30;
  }

  if (data.returns_summary?.length > 0) {
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("Partial Returns / Expiry / Damage from Doorstep", margin, currentY)
    currentY += 10
    
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Product", "Returned Qty"]],
      body: data.returns_summary.map((p: any) => [p.product_name, p.total_qty])
    });
    currentY = (doc as any).lastAutoTable.finalY + 30;
  }

  doc.save(`Vehicle_Inventory_${syncId}.pdf`)
}
