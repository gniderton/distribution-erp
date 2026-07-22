import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { api } from '@/lib/axios'

const getCompanySettings = async () => {
  try {
    const res = await api.get('/api/company-settings')
    return {
      regt_name: res.data?.company_name || res.data?.regt_name || "Company",
      address: res.data?.address || "-",
      contact_no: res.data?.contact_no || "-",
      email: res.data?.email || "-",
      logo: res.data?.logo || null
    }
  } catch (err) {
    return { regt_name: "Company", address: "-", contact_no: "-", email: "-", logo: null }
  }
}

const drawSimpleBox = (doc: any, x: number, y: number, width: number, height: number, rows: (string | null)[][]) => {
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(250, 250, 250)
  doc.setLineWidth(0.5)
  doc.roundedRect(x, y, width, height, 3, 3, 'FD')
  let rowY = y + 14
  rows.forEach(r => {
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(100, 100, 100)
    doc.text(String(r[0]), x + 6, rowY)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    const val = String(r[1] || "0.00")
    doc.text(val, x + width - 6, rowY, { align: 'right' })
    rowY += 12
  })
}

export const generateTripHistoryPDF = async (syncId: number | string, data: any) => {
  const doc = new jsPDF('p', 'pt', 'a4')
  const margin = 15
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height

  const brand = await getCompanySettings()

  let currentY = margin + 5

  try {
    if (brand.logo) {
      const logoData = brand.logo.startsWith('data:image') ? brand.logo : `data:image/png;base64,${brand.logo}`
      doc.addImage(logoData, 'PNG', margin, currentY, 80, 25)
    }
  } catch(e) {}

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text(`TRIP HISTORY REPORT #${syncId}`, pageWidth / 2, currentY + 15, { align: "center" })
  
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text(`Company: ${brand.regt_name}`, margin, currentY + 40)
  doc.text(`Date: ${format(new Date(), "dd MMM yyyy hh:mm a")}`, pageWidth - margin, currentY + 40, { align: 'right' })

  // Dashboard KPI Boxes
  const totalDelivered = data.delivered?.reduce((acc: number, val: any) => acc + Number(val.grand_total), 0) || 0
  const collectedCash = data.payments?.reduce((acc: number, val: any) => acc + Number(val.amount), 0) || 0
  const tripExpenses = data.expenses?.reduce((acc: number, val: any) => acc + Number(val.amount), 0) || 0
  const netSettled = collectedCash - tripExpenses

  const gap = 10
  const boxWidth = (pageWidth - (margin * 2) - (gap * 3)) / 4
  const boxHeight = 35
  const boxY = currentY + 50
  
  drawSimpleBox(doc, margin, boxY, boxWidth, boxHeight, [["TOTAL DELIVERED", `Rs. ${totalDelivered.toFixed(2)}`]])
  drawSimpleBox(doc, margin + boxWidth + gap, boxY, boxWidth, boxHeight, [["COLLECTED CASH", `Rs. ${collectedCash.toFixed(2)}`]])
  drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxY, boxWidth, boxHeight, [["TRIP EXPENSES", `Rs. ${tripExpenses.toFixed(2)}`]])
  drawSimpleBox(doc, margin + (boxWidth * 3) + (gap * 3), boxY, boxWidth, boxHeight, [["NET SETTLED", `Rs. ${netSettled.toFixed(2)}`]])

  currentY = boxY + boxHeight + 20

  const themeStyles = {
    theme: 'grid' as const,
    styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0] as [number, number, number], lineColor: [0, 0, 0] as [number, number, number], lineWidth: 0.1 },
    headStyles: { fillColor: [240, 240, 240] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: 'bold' as const, lineWidth: 0.1, lineColor: [0, 0, 0] as [number, number, number] },
    margin: { left: margin, right: margin }
  }

  // 1. Delivered Invoices
  if (data.delivered && data.delivered.length > 0) {
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Delivered Invoices", "Customer", "Amount"]],
      body: data.delivered.map((d: any) => [d.invoice_number, d.customer_name, `Rs. ${Number(d.grand_total).toFixed(2)}`])
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // 2. Not Delivered List
  const notDelivered = [...(data.undelivered || []), ...(data.rejected || [])]
  if (notDelivered.length > 0) {
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Not Delivered / Rejected", "Customer", "DSE Status", "Verification Status"]],
      body: notDelivered.map(d => [d.invoice_number, d.customer_name, d.delivery_status || '-', d.verification_status || '-'])
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // 3. Picklist (Product Delivery Summary)
  if (data.delivered_summary && data.delivered_summary.length > 0) {
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Product Delivery Summary", "MRP", "Delivered Qty", "Returned Qty"]],
      body: data.delivered_summary.map((s: any) => {
          const ret = data.returns_summary?.find((rs: any) => rs.product_name === s.product_name);
          return [s.product_name, `Rs. ${Number(s.mrp).toFixed(2)}`, s.total_qty, ret?.total_qty || 0]
      })
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // 3.5 Products from Undelivered Invoices
  const undeliveredSummary = [...(data.rejected_summary || []), ...(data.undelivered_summary || [])]
  if (undeliveredSummary.length > 0) {
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Products from Undelivered / Rejected Invoices", "MRP", "Undelivered Qty"]],
      body: undeliveredSummary.map((m: any) => [m.product_name, `Rs. ${Number(m.mrp).toFixed(2)}`, m.total_qty])
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  const returns = data.returns || []
  
  // 4. Goods returned (Not Delivered)
  const returnsNotDelivered = returns.filter((r: any) => 
    !r.reason?.toLowerCase().includes('expiry') && !r.reason?.toLowerCase().includes('damage') &&
    !r.return_type?.toLowerCase().includes('expiry') && !r.return_type?.toLowerCase().includes('damage')
  )
  if (returnsNotDelivered.length > 0) {
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Returns (Not Delivered/Other)", "Customer", "Qty", "Reason"]],
      body: returnsNotDelivered.map((r: any) => [r.product_name, r.customer_name, r.qty, r.reason || r.return_type || '-'])
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // 5. Goods returned (Expiry / Damage)
  const returnsExpiryDamage = returns.filter((r: any) => 
    r.reason?.toLowerCase().includes('expiry') || r.reason?.toLowerCase().includes('damage') ||
    r.return_type?.toLowerCase().includes('expiry') || r.return_type?.toLowerCase().includes('damage')
  )
  if (returnsExpiryDamage.length > 0) {
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Returns (Expiry/Damage)", "Customer", "Qty", "Reason"]],
      body: returnsExpiryDamage.map((r: any) => [r.product_name, r.customer_name, r.qty, r.reason || r.return_type || '-'])
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // 6. Credit Notes Generated
  if (data.credit_notes && data.credit_notes.length > 0) {
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Credit Notes Generated", "Customer", "Amount"]],
      body: data.credit_notes.map((c: any) => [c.return_number, c.customer_name, `Rs. ${Number(c.total_amount).toFixed(2)}`])
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // 7. Payments Collected
  if (data.payments && data.payments.length > 0) {
    autoTable(doc, {
      ...themeStyles,
      startY: currentY,
      head: [["Payments Collected", "Customer", "Mode", "Amount"]],
      body: data.payments.map((p: any) => [p.payment_number, p.customer_name, p.payment_mode, `Rs. ${Number(p.amount).toFixed(2)}`])
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  doc.save(`Trip_History_Report_${syncId}.pdf`)
}
