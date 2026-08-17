import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { api } from '@/lib/axios'
import { formatDate } from '@/lib/utils'

const drawSimpleBox = (doc: any, x: number, y: number, width: number, height: number, rows: (string | null)[][], labelWidth: number = 58) => {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(x, y, width, height);
  let rowY = y + 11;
  rows.forEach((r) => {
    if (!r[1]) return; // skip if value is null
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const label = String(r[0]) + ":";
    doc.text(label, x + 5, rowY);
    doc.setFont("helvetica", "normal");
    const val = String(r[1] || "-");
    const splitVal = doc.splitTextToSize(val, width - labelWidth - 5);
    doc.text(splitVal, x + labelWidth, rowY);
    rowY += splitVal.length * 9.5 + 1.5;
  });
}

export const generateSalesOrderPDF = async (orderData: any, lines: any[]) => {
  if (!orderData) throw new Error("No Order data selected.");
  
  const doc = new jsPDF('p', 'pt', 'a4');
  
  // Fetch brand settings
  let brand: any = {};
  try {
    const settingsRes = await api.get('/api/company-settings').catch(() => ({ data: {} }));
    brand = {
      regt_name: settingsRes.data?.company_name || settingsRes.data?.regt_name || "Company",
      address: settingsRes.data?.address || "-",
      District: settingsRes.data?.district || "-",
      pin: settingsRes.data?.pin_code || "-",
      gst: settingsRes.data?.gstin || "-",
      fssai_no: settingsRes.data?.fssai_no || "-",
      email: settingsRes.data?.email || "-",
      contact_no: settingsRes.data?.contact_no || "-",
      logo: settingsRes.data?.logo || null
    };
  } catch (err) {
    console.error(err);
  }

  const margin = 12;
  const pageWidth = doc.internal.pageSize.width;

  const drawMainHeader = (currentPage: number, totalPages: number) => {
    const headerY = margin;
    try {
      if (brand.logo) {
        const logoData = brand.logo.startsWith('data:image') ? brand.logo : `data:image/png;base64,${brand.logo}`;
        doc.addImage(logoData, 'PNG', margin, headerY, 90, 30);
      }
    } catch (e) {}
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SALES ORDER", pageWidth / 2, headerY + 15, { align: "center" });
    
    doc.setFontSize(11);
    doc.text(String(orderData.so_number || `SO-${orderData.id}`), pageWidth / 2, headerY + 30, { align: "center" });
    
    const boxesY = headerY + 40;
    const gap = 8;
    const boxWidth = (pageWidth - margin * 2 - gap * 2) / 3;
    const boxHeight = 95;
    
    drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
      ["From", String(brand.regt_name)],
      ["Address", String(brand.address)],
      ["Dist/PIN", `${brand.District} - ${brand.pin}`],
      ["GST", String(brand.gst)],
      ["FSSAI", String(brand.fssai_no)],
      ["Email", String(brand.email)],
      ["Contact No", String(brand.contact_no)]
    ]);
    
    const cAddr = [orderData.customer_address, orderData.district, orderData.pin_code ? "PIN: " + orderData.pin_code : null].filter(Boolean).join(", ");
    drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
      ["To", String(orderData.customer_name || "-")],
      ["Address", cAddr || "-"],
      ["GSTIN", String(orderData.gstin || "-")],
      ["Phone", String(orderData.customer_phone || "-")],
      ["Email", "-"]
    ], 60);

    drawSimpleBox(doc, margin + boxWidth * 2 + gap * 2, boxesY, boxWidth, boxHeight, [
      ["Order No", String(orderData.so_number || `SO-${orderData.id}`)],
      ["Date", orderData.order_date ? formatDate(orderData.order_date) : "-"],
      ["Status", String(orderData.status || "Confirmed")],
      ["TOTAL AMT", Number(orderData.total_amount || 0).toFixed(2)],
      ["DSE", String(orderData.dse_name || "-")],
      ["Route", String(orderData.route_name || "-")],
      ["PAGE", `${currentPage} / ${totalPages}`]
    ], 65);

    return boxesY + boxHeight;
  };

  autoTable(doc as any, {
    startY: margin + 40 + 95 + 10,
    margin: { left: margin, right: margin, top: 157, bottom: 12 },
    head: [["S.N", "PRODUCT NAME", "RATE", "QTY", "TAXABLE", "GST", "NET"]],
    body: lines.map((row, index) => {
      const taxable = Number(row.amount || (row.qty * row.rate));
      const taxAmount = Number(row.tax_amount || row.tax || 0); // fallback if not present
      const net = taxable + taxAmount;
      return [
        index + 1, 
        row.product_name || `Product ID: ${row.product_id}`, 
        Number(row.rate || 0).toFixed(2), 
        row.qty, 
        taxable.toFixed(2),
        taxAmount.toFixed(2),
        net.toFixed(2)
      ];
    }).map(row => row.map(cell => String(cell || ""))),
    didDrawPage: (data: any) => {
      drawMainHeader(data.pageNumber, (doc as any).internal.getNumberOfPages());
    },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 50, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' },
      4: { cellWidth: 70, halign: 'right' },
      5: { cellWidth: 70, halign: 'right' },
      6: { cellWidth: 70, halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Amount: ${Number(orderData.total_amount || 0).toFixed(2)}`, pageWidth - margin, finalY, { align: "right" });
  
  const fileName = (orderData.so_number || `SO-${orderData.id}`) + ".pdf";
  doc.save(fileName);
}
