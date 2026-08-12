import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { api } from '@/lib/axios'
import { formatDate } from '@/lib/utils'

// Helper to convert numbers to Indian words
const toWordsIndian = (num: number): string => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = ("000000000" + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += Number(n[4]) !== 0 ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += Number(n[5]) !== 0 ? (str !== '' ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) + 'Only ' : 'Only ';
  return str;
}

const drawSimpleBox = (doc: any, x: number, y: number, width: number, height: number, rows: (string | null)[][], labelWidth: number = 58) => {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(x, y, width, height);
  let rowY = y + 11;
  rows.forEach((r) => {
    if (!r[1]) return; // skip if value is null
    doc.setFontSize(8);
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

const getTaxSummary = (lines: any[]) => {
  const groups: Record<string, any> = {};
  lines.forEach(row => {
    const gstPct = row.tax_percent || 0;
    const taxName = gstPct + '% GST';
    if (!groups[taxName]) {
      groups[taxName] = { PARTICULARS: taxName, Pcs: 0, Gross: 0, Sch: 0, Disc: 0, Taxable: 0, Tax: 0, Net: 0 };
    }
    const g = groups[taxName];
    g.Pcs += Number(row.qty || 0);
    g.Gross += Number(row.gross_amount || 0);
    g.Sch += Number(row.scheme_amount || 0);
    g.Disc += Number(row.discount_amount || 0);
    g.Taxable += Number(row.taxable_amount || 0);
    g.Tax += Number(row.tax_amount || 0);
    g.Net += Number(row.amount || 0);
  });
  
  const resultRows = Object.values(groups);
  if (resultRows.length > 0) {
    const totalRow = resultRows.reduce((acc, curr) => {
      acc.Pcs += curr.Pcs; 
      acc.Gross += curr.Gross; 
      acc.Sch += curr.Sch;
      acc.Disc += curr.Disc; 
      acc.Taxable += curr.Taxable; 
      acc.Tax += curr.Tax;
      acc.Net += curr.Net; 
      return acc;
    }, { PARTICULARS: 'Total', Pcs: 0, Gross: 0, Sch: 0, Disc: 0, Taxable: 0, Tax: 0, Net: 0 });
    resultRows.push(totalRow);
  }
  return resultRows;
}

export const generateCreditNotePDF = async (cnHeader: any) => {
  if (!cnHeader || !cnHeader.id) throw new Error("No Credit Note data selected.");
  
  const doc = new jsPDF('p', 'pt', 'a4');
  const cnLines = cnHeader.lines || []; 
  const summaryData = getTaxSummary(cnLines); 
  const grandTotal = Number(cnHeader.amount || cnHeader.grand_total || 0);

  // Fetch brand and company settings
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
  const pageHeight = doc.internal.pageSize.height;

  const drawMainHeader = (currentPage: number, totalPages: number) => {
    const headerY = margin;
    try {
      if (brand.logo) {
        const logoData = brand.logo.startsWith('data:image') ? brand.logo : \`data:image/png;base64,\${brand.logo}\`;
        doc.addImage(logoData, 'PNG', margin, headerY, 90, 30);
      }
    } catch(e) {}
    
    doc.setTextColor(0, 0, 0); 
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CREDIT NOTE", pageWidth / 2, headerY + 15, { align: "center" });
    
    doc.setFontSize(11);
    doc.text(String(cnHeader.return_number || "-"), pageWidth / 2, headerY + 30, { align: "center" });

    const boxesY = headerY + 40;
    const gap = 8;
    const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3;
    const boxHeight = 85; 

    // Box 1: Document Details
    drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
      ["CN NUMBER", String(cnHeader.return_number || "-")],
      ["DATE", cnHeader.return_date ? new Date(cnHeader.return_date).toLocaleDateString('en-GB') : "-"],
      ["LINKED INV", String(cnHeader.linked_invoice_number || cnHeader.original_invoice_number || "-")],
      ["TOTAL AMT", Number(grandTotal).toFixed(2)],
      ["PAGE", \`\${currentPage} / \${totalPages}\`]
    ]);

    // Box 2: Company Details
    drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
      ["From", String(brand.regt_name)],
      ["Address", String(brand.address)],
      ["Dist/PIN", \`\${brand.District} - \${brand.pin}\`],
      ["GST", String(brand.gst)],
      ["FSSAI", String(brand.fssai_no)],
      ["Email", String(brand.email)],
      ["Contact No", String(brand.contact_no)]
    ], 50);

    // Box 3: Customer Details
    const cArr = [cnHeader.customer_address, cnHeader.customer_district, cnHeader.customer_pin ? "PIN: " + cnHeader.customer_pin : null].filter(Boolean).join(", ");
    drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
      ["Customer", String(cnHeader.customer_name || "-")],
      ["Address", cArr || "-"],
      ["GST", String(cnHeader.customer_gst || "-")],
      ["Contact", String(cnHeader.customer_contact || "-")],
      ["Email", String(cnHeader.customer_email || "-")]
    ], 50);
    
    return boxesY + boxHeight; 
  };

  // --- 3. ITEMS TABLE ---
  autoTable(doc, {
    startY: margin + 40 + 85 + 10,
    margin: { left: margin, right: margin, top: margin + 140, bottom: 120 },
    head: [["S.N", "ITEM NAME", "CODE\\nEAN", "HSN", "BATCH\\nEXPIRY", "MRP", "QTY", "PRICE", "GROSS", "SCH", "D%", "D.AMT", "TXBL", "GST%", "GST$", "NET$"]],
    body: cnLines.map((row: any, index: number) => {
      const expiryStr = row.expiry_date ? new Date(row.expiry_date).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' }) : "-";
      return [
        index + 1, 
        row.product_name || "-", 
        \`\${row.product_code || "-"}\\n\${row.ean_code || "-"}\`, 
        row.hsn_code || "-", 
        \`\${row.batch_number || row.batch_code || "-"}\\n\${expiryStr}\`,
        Number(row.mrp || 0).toFixed(2), 
        row.qty || 0, 
        Number(row.rate || 0).toFixed(2),
        Number(row.gross_amount || 0).toFixed(2), 
        Number(row.scheme_amount || 0).toFixed(2), 
        (row.discount_percent || 0) + "%", 
        Number(row.discount_amount || 0).toFixed(2),
        Number(row.taxable_amount || 0).toFixed(2), 
        (row.tax_percent || 0) + "%",
        Number(row.tax_amount || 0).toFixed(2), 
        Number(row.amount || 0).toFixed(2)
      ];
    }),
    didDrawPage: (data: any) => {
      const totalPages = doc.internal.getNumberOfPages();
      drawMainHeader(data.pageNumber, totalPages);
    },
    theme: 'grid',
    styles: { 
      fontSize: 6, 
      cellPadding: 2, 
      lineColor: [0, 0, 0], 
      lineWidth: 0.5, 
      textColor: [0, 0, 0],
      valign: 'middle' 
    },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.5, valign: 'middle' },
    columnStyles: { 
      0: { cellWidth: 15 }, 1: { cellWidth: 'auto', minCellWidth: 80 },
      2: { cellWidth: 40 }, 3: { cellWidth: 30 }, 4: { cellWidth: 40 },
      5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' },
      8: { halign: 'right' }, 9: { halign: 'right' }, 10: { halign: 'right' },
      11: { halign: 'right' }, 12: { halign: 'right' }, 13: { halign: 'center' },
      14: { halign: 'right' }, 15: { halign: 'right' }
    }
  });

  // --- 4. TAX SUMMARY ---
  let currentY = (doc as any).lastAutoTable.finalY + 8;
  
  if (currentY + 150 > pageHeight) {
    doc.addPage();
    const totalPages = doc.internal.getNumberOfPages();
    currentY = drawMainHeader(totalPages, totalPages) + 10;
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin },
    head: [["TAX SUMMARY", "PCS", "GROSS", "SCH", "DISC", "TAXABLE", "TAX", "NET"]],
    body: summaryData.map(row => [
      row.PARTICULARS, 
      row.Pcs, 
      Number(row.Gross).toFixed(2), 
      Number(row.Sch).toFixed(2),
      Number(row.Disc).toFixed(2), 
      Number(row.Taxable).toFixed(2), 
      Number(row.Tax).toFixed(2), 
      Number(row.Net).toFixed(2)
    ]),
    theme: 'grid',
    styles: { 
      fontSize: 7.5, 
      cellPadding: 2, 
      lineColor: [0, 0, 0], 
      lineWidth: 0.5, 
      textColor: [0, 0, 0],
      valign: 'middle'
    },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' }
  });

  // Footer Total in Words
  const wordsY = (doc as any).lastAutoTable.finalY + 25;
  doc.setFontSize(11); 
  doc.setFont("helvetica", "bold");
  doc.text("Total Amount (in words):", margin, wordsY);
  doc.setFont("helvetica", "normal");
  doc.text(toWordsIndian(Math.round(grandTotal)), margin + 140, wordsY);

  // Ack Slip
  const slipY = pageHeight - 110;
  doc.setLineDashPattern([3, 3], 0); 
  doc.line(margin, slipY, pageWidth - margin, slipY); 
  doc.setLineDashPattern([], 0); 
  
  doc.setFontSize(9); 
  doc.setFont("helvetica", "bold");
  doc.text("DETACHABLE ACKNOWLEDGEMENT SLIP", pageWidth / 2, slipY + 20, { align: "center" });
  
  const slipContentY = slipY + 45; 
  doc.setFont("helvetica", "normal");
  doc.text(\`Credit Note: \${cnHeader.return_number || "-"}\`, margin, slipContentY);
  doc.text(\`Date: \${cnHeader.return_date ? new Date(cnHeader.return_date).toLocaleDateString('en-GB') : "-"}\`, margin + 180, slipContentY);
  doc.text(\`Amt: \${grandTotal.toFixed(2)}\`, margin + 350, slipContentY);
  doc.text(\`Customer: \${cnHeader.customer_name || "-"}\`, margin, slipContentY + 20);
  doc.text(\`Auth. Signature: ___________________________\`, margin + 310, slipContentY + 35);

  const fileName = (cnHeader.return_number || "CreditNote") + ".pdf";
  doc.save(fileName);
}
