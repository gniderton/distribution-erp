import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { api } from '@/lib/axios'
import type { Invoice, InvoiceLine } from '../types'
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

const getSummary = (lines: InvoiceLine[]) => {
  if (!lines || lines.length === 0) return [];
  const groups: Record<string, any> = {};
  lines.forEach(row => {
    const taxRate = Number(row.tax_percent || 0);
    const taxName = taxRate > 0 ? `${taxRate}% GST` : 'No Tax';
    if (!groups[taxName]) {
      groups[taxName] = {
        PARTICULARS: taxName,
        Pcs: 0, Gross: 0, Sch: 0, Disc: 0, Taxable: 0, Tax: 0, Net: 0
      };
    }
    const g = groups[taxName];
    g.Pcs += Number(row.shipped_qty || 0);
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
    }, { PARTICULARS: 'Grand Total', Pcs: 0, Gross: 0, Sch: 0, Disc: 0, Taxable: 0, Tax: 0, Net: 0 });
    resultRows.push(totalRow);
  }
  return resultRows.map(row => ({
    PARTICULARS: row.PARTICULARS,
    Pcs: row.Pcs,
    Gross: row.Gross.toFixed(2),
    Sch: row.Sch.toFixed(2),
    Disc: row.Disc.toFixed(2),
    Taxable: row.Taxable.toFixed(2),
    Tax: row.Tax.toFixed(2),
    Net: Math.round(row.Net).toFixed(2)
  }));
}

export const generateInvoicePDF = async (invoiceData: Invoice) => {
  if (!invoiceData || !invoiceData.invoice_id) throw new Error("No Invoice data selected.");
  
  const doc = new jsPDF('p', 'pt', 'a4');
  const lines = invoiceData.invoice_lines || [];
  const summaryData = getSummary(lines);
  const grandTotal = Number(invoiceData.grand_total || 0);

  // Fetch brand and bank settings
  let brand: any = {};
  let bank: any = {};
  try {
    const [settingsRes, bankRes] = await Promise.all([
      api.get('/api/company-settings').catch(() => ({ data: {} })),
      api.get('/api/sales/bank-details/3').catch(() => ({ data: {} }))
    ]);
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
    bank = bankRes.data;
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
    doc.text("SALES INVOICE", pageWidth / 2, headerY + 15, { align: "center" });
    doc.setFontSize(11);
    doc.text(String(invoiceData.invoice_number || ""), pageWidth / 2, headerY + 30, { align: "center" });
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
    
    const cAddr = [invoiceData.customer_address, invoiceData.district, invoiceData.pin_code ? "PIN: " + invoiceData.pin_code : null].filter(Boolean).join(", ");
    drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
      ["To", String(invoiceData.customer_name || "-")],
      ["Address", cAddr || "-"],
      ["GSTIN", String(invoiceData.gstin || "-")],
      ["Phone", "-"], // invoiceData doesn't have customer_phone directly in blueprint?
      ["Email", "-"]
    ], 60);

    drawSimpleBox(doc, margin + boxWidth * 2 + gap * 2, boxesY, boxWidth, boxHeight, [
      ["INV No", String(invoiceData.invoice_number || "-")],
      ["Date", invoiceData.invoice_date ? formatDate(invoiceData.invoice_date) : "-"],
      ["Order Date", invoiceData.order_date ? formatDate(invoiceData.order_date) : "-"],
      ["TOTAL AMT", Number(grandTotal).toFixed(2)],
      ["DSE", String(invoiceData.dse_name || "-")],
      ["Route", String(invoiceData.route || "-")],
      ["DSE Phone", "-"],
      ["PAGE", `${currentPage} / ${totalPages}`]
    ], 65);
    return boxesY + boxHeight;
  };

  autoTable(doc as any, {
    startY: margin + 40 + 95 + 10,
    margin: { left: margin, right: margin, top: 157, bottom: 12 },
    head: [["S.N", "ITEM NAME", "EAN CODE", "HSN", "BATCH\nEXPIRY", "MRP", "QTY", "PRICE", "GROSS", "SCH", "D%", "D.AMT", "TXBL", "GST%", "GST$", "NET$"]],
    body: lines.map((row, index) => {
      const expiryStr = row.expiry_date ? new Date(row.expiry_date).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' }) : "-";
      return [
        index + 1, row.product_name, row.ean_code || "-", row.hsn_code || "-", `${row.batch_code || ""}\n${expiryStr}`,
        Number(row.mrp || 0).toFixed(2), row.shipped_qty, Number(row.rate || 0).toFixed(2), Number(row.gross_amount || 0).toFixed(2),
        Number(row.scheme_amount || 0).toFixed(2), (row.discount_percent || 0) + "%", Number(row.discount_amount || 0).toFixed(2),
        Number(row.taxable_amount || 0).toFixed(2), (row.tax_percent || 0) + "%", Number(row.tax_amount || 0).toFixed(2), Number(row.amount || 0).toFixed(2)
      ];
    }).map(row => row.map(cell => String(cell || ""))),
    didDrawPage: (data: any) => {
      drawMainHeader(data.pageNumber, (doc as any).internal.getNumberOfPages());
    },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0], overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.5 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 'auto', minCellWidth: 100 },
      2: { cellWidth: 45 },
      3: { cellWidth: 35 },
      4: { cellWidth: 45 },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
      9: { halign: 'right' },
      10: { halign: 'right' },
      11: { halign: 'right' },
      12: { halign: 'right' },
      13: { halign: 'center' },
      14: { halign: 'right' },
      15: { halign: 'right' }
    }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 20;
  const pageHeight = doc.internal.pageSize.height;
  
  let totalSchemeAmt = 0;
  let schemeLines = (invoiceData.invoice_lines || []).filter(l => l.tier_applied).map(l => {
    const amt = Number(l.scheme_amount || 0);
    totalSchemeAmt += amt;
    return [l.product_name, l.tier_applied, amt.toFixed(2)];
  });
  if (schemeLines.length === 0) {
    schemeLines = (invoiceData.order_lines || []).filter(l => l.tier_applied).map(l => {
      const amt = Number(l.scheme_amount || 0);
      totalSchemeAmt += amt;
      return [l.product_name, l.tier_applied, amt.toFixed(2)];
    });
  }
  if (schemeLines.length > 0) {
    schemeLines.push([
      { content: 'Total Scheme Discount', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } } as any,
      { content: totalSchemeAmt.toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } } as any
    ]);
  }
  
  const estimatedFooterHeight = summaryData.length * 20 + schemeLines.length * 20 + 210;
  if (currentY + estimatedFooterHeight > pageHeight) {
    doc.addPage();
    drawMainHeader((doc as any).internal.getNumberOfPages(), (doc as any).internal.getNumberOfPages());
    currentY = 157;
  }

  autoTable(doc as any, {
    startY: currentY,
    margin: { left: margin },
    head: [["TAX SUMMARY", "PCS", "GROSS", "SCH", "DISC", "TAXABLE", "TAX", "NET"]],
    body: summaryData.map(row => [row.PARTICULARS, row.Pcs, row.Gross, row.Sch, row.Disc, row.Taxable, row.Tax, row.Net].map(String)),
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.row.raw[0] && data.row.raw[0].includes('Total')) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [250, 250, 250];
      }
    }
  });

  if (schemeLines.length > 0) {
    autoTable(doc as any, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      margin: { left: margin },
      head: [["PRODUCT NAME", "SCHEMES / TIER APPLIED", "SCHEME AMT"]],
      body: schemeLines as string[][],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
      headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 70, halign: 'right' } }
    });
  }

  const wordsY = (doc as any).lastAutoTable.finalY + 38;
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.text(`Grand Total: ${Number(grandTotal).toFixed(2)}`, margin, wordsY - 14);
  doc.text("Total Amount (in words):", margin, wordsY);
  doc.setFont("helvetica", "normal");
  doc.text(toWordsIndian(Math.round(grandTotal)), margin + 140, wordsY);
  doc.setFontSize(8.5);
  doc.text("This is a computer generated document and does not require a physical signature.", margin, pageHeight - 170);
  
  const slipY = pageHeight - 160;
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, slipY, pageWidth - margin, slipY);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("RECEIPT ACKNOWLEDGEMENT", pageWidth / 2, slipY + 20, { align: "center" });
  
  const contentWidth = pageWidth - margin * 2;
  const slipBoxY = slipY + 30;
  doc.rect(margin, slipBoxY, contentWidth, 100);
  
  // Left part of slip (Invoice Info)
  doc.setFont("helvetica", "bold");
  doc.text(`Invoice No: ${invoiceData.invoice_number || "-"}`, margin + 10, slipBoxY + 10);
  doc.text(`Date: ${invoiceData.invoice_date ? formatDate(invoiceData.invoice_date) : "-"}`, margin + 10, slipBoxY + 20);
  
  // Right part of slip (E-Way Bill Info)
  if (invoiceData.eway_bill_number) {
    doc.setFont("helvetica", "bold");
    doc.text(`E-Way Bill No: ${invoiceData.eway_bill_number}`, margin + (contentWidth / 2) + 10, slipBoxY + 10);
  }
  
  const bottomBoxY = slipBoxY + 35;
  doc.setFontSize(9);
  doc.text(`Customer: ${invoiceData.customer_name || "-"}`, margin + 10, bottomBoxY + 10);
  doc.text(`Total Amount: ${Number(grandTotal).toFixed(2)}`, margin + 10, bottomBoxY + 25);
  
  const bankInfoX = pageWidth / 2 + 5;
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT BANK DETAILS", bankInfoX, bottomBoxY + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Bank: ${bank.bank_name || "-"}`, bankInfoX, bottomBoxY + 25);
  doc.text(`Acc No: ${bank.account_number || "-"}`, bankInfoX, bottomBoxY + 35);
  doc.text(`IFSC: ${bank.ifsc_code || "-"}`, bankInfoX, bottomBoxY + 45);
  
  doc.setFontSize(9);
  doc.text(`Receiver's Signature: __________________`, margin + 10, slipBoxY + 90);
  doc.text(`Authorized Signatory: __________________`, bankInfoX, slipBoxY + 90);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Terms and Condition: ALL LEGAL DISPUTES ARE SUBJECT TO CALICUT JURIDICTION ONLY", margin, pageHeight - 15);
  
  const fileName = (invoiceData.invoice_number || "INV") + ".pdf";
  doc.save(fileName);
}
