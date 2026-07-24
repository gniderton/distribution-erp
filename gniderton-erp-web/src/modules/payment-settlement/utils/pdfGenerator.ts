import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { api } from '@/lib/axios'
import dayjs from 'dayjs'

const drawSimpleBox = (doc: any, x: number, y: number, width: number, height: number, rows: (string | null)[][], labelWidth: number = 58) => {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(x, y, width, height);
  let rowY = y + 11;
  rows.forEach((r) => {
    if (!r[1]) return;
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

export const generatePaymentSettlementPDF = async (reportData: any) => {
  if (!reportData || !reportData.summary) throw new Error("No report data selected.");
  
  const doc = new jsPDF('p', 'pt', 'a4');
  const summary = reportData.summary;
  const payments = reportData.payments || [];
  const expenses = reportData.expenses || [];
  const denominations = reportData.denominations || {};
  const isSettled = summary.settlement_status === 'Settled';

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
    doc.text("PAYMENT SETTLEMENT REPORT", pageWidth / 2, headerY + 15, { align: "center" });
    doc.setFontSize(11);
    doc.text(`Report #${summary.report_id}`, pageWidth / 2, headerY + 30, { align: "center" });
    
    const boxesY = headerY + 40;
    const gap = 8;
    const boxWidth = (pageWidth - margin * 2 - gap) / 2;
    const boxHeight = 70;
    
    drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
      ["Company", String(brand.regt_name)],
      ["Address", String(brand.address)],
      ["Dist/PIN", `${brand.District} - ${brand.pin}`],
      ["Email", String(brand.email)],
      ["Contact No", String(brand.contact_no)]
    ]);
    
    drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
      ["Report ID", String(summary.report_id || "-")],
      ["Report Date", summary.report_date ? dayjs(summary.report_date).format('DD/MM/YYYY') : "-"],
      ["DSE Name", String(summary.dse_name || "-")],
      ["Status", String(summary.settlement_status || "-")],
      ["PAGE", `${currentPage} / ${totalPages}`]
    ], 65);
    return boxesY + boxHeight;
  };

  drawMainHeader(1, 1);
  let currentY = margin + 40 + 70 + 20;

  // Expected vs Actual Summary Table
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("COLLECTION SUMMARY", margin, currentY);
  currentY += 10;

  autoTable(doc as any, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["MODE", "EXPECTED (₹)", "ACTUAL (₹)", "DIFFERENCE"]],
    body: [
      ["Cash", Number(summary.expected_cash || 0).toFixed(2), Number(summary.actual_cash || 0).toFixed(2), (Number(summary.actual_cash || 0) - Number(summary.expected_cash || 0)).toFixed(2)],
      ["Cheque", Number(summary.expected_cheque || 0).toFixed(2), Number(summary.actual_cheque || 0).toFixed(2), (Number(summary.actual_cheque || 0) - Number(summary.expected_cheque || 0)).toFixed(2)],
      ["Online", Number(summary.expected_neft_rtgs || 0).toFixed(2), Number(summary.actual_neft_rtgs || 0).toFixed(2), (Number(summary.actual_neft_rtgs || 0) - Number(summary.expected_neft_rtgs || 0)).toFixed(2)],
      ["Total", 
        (Number(summary.expected_cash || 0) + Number(summary.expected_cheque || 0) + Number(summary.expected_neft_rtgs || 0)).toFixed(2), 
        (Number(summary.actual_cash || 0) + Number(summary.actual_cheque || 0) + Number(summary.actual_neft_rtgs || 0)).toFixed(2),
        ((Number(summary.actual_cash || 0) + Number(summary.actual_cheque || 0) + Number(summary.actual_neft_rtgs || 0)) - (Number(summary.expected_cash || 0) + Number(summary.expected_cheque || 0) + Number(summary.expected_neft_rtgs || 0))).toFixed(2)
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.row.raw[0] === 'Total') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [250, 250, 250];
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 20;

  // Payments Table
  if (payments.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENTS / COLLECTIONS", margin, currentY);
    currentY += 10;
    
    autoTable(doc as any, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [["S.N", "CUSTOMER", "INVOICES", "MODE", "REF / CHEQUE", "STATUS", "AMOUNT (₹)"]],
      body: payments.map((row: any, index: number) => {
        return [
          index + 1,
          row.customer_name || "-",
          row.selected_invoices || "-",
          row.payment_mode || "-",
          row.payment_mode === 'Cheque' ? row.cheque_number : row.payment_mode === 'Cash' ? '-' : row.transaction_reference,
          row.verification_status || "-",
          Number(row.amount || 0).toFixed(2)
        ];
      }),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0], overflow: 'linebreak' },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        6: { halign: 'right' }
      }
    });
    currentY = (doc as any).lastAutoTable.finalY + 20;
  }

  // Expenses Table
  if (expenses.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("EXPENSES", margin, currentY);
    currentY += 10;
    
    autoTable(doc as any, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [["S.N", "EXPENSE TYPE", "VERIFIED BY", "STATUS", "AMOUNT (₹)"]],
      body: expenses.map((row: any, index: number) => {
        return [
          index + 1,
          row.expense_type || "-",
          row.verified_by_name || "-",
          row.status || "-",
          Number(row.amount || 0).toFixed(2)
        ];
      }),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        4: { halign: 'right' }
      }
    });
    currentY = (doc as any).lastAutoTable.finalY + 20;
  }

  // Cash Denominations (if settled)
  if (isSettled && Object.keys(denominations).length > 0) {
    const denomRows = [
      { note: 500, count: denominations.note_500 || 0 },
      { note: 200, count: denominations.note_200 || 0 },
      { note: 100, count: denominations.note_100 || 0 },
      { note: 50, count: denominations.note_50 || 0 },
      { note: 20, count: denominations.note_20 || 0 },
      { note: 10, count: denominations.note_10 || 0 },
      { note: 1, count: denominations.coins || 0 }
    ].filter(d => d.count > 0);

    if (denomRows.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("PHYSICAL CASH DENOMINATIONS", margin, currentY);
      currentY += 10;
      
      autoTable(doc as any, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["NOTE (₹)", "COUNT", "TOTAL (₹)"]],
        body: denomRows.map((row: any) => {
          return [
            row.note,
            row.count,
            (row.note * row.count).toFixed(2)
          ];
        }),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'right' },
          1: { halign: 'center' },
          2: { halign: 'right' }
        }
      });
    }
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated by GNIDERTON ERP on ${dayjs().format('DD/MM/YYYY HH:mm')}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 20,
      { align: "center" }
    );
  }

  const fileName = `Payment_Settlement_${summary.report_id}.pdf`;
  doc.save(fileName);
}
