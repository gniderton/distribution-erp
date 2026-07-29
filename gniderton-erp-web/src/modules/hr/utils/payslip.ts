import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function generatePayslip(salaryData: any) {
  try {
    if (!salaryData || !salaryData.header) throw new Error("No Salary/Payslip data loaded.");

    const doc = new jsPDF("p", "pt", "a4");

    const h = salaryData.header;
    const breakdown = salaryData.breakdown || {};
    
    // Hardcode company info for now, as Global_Assets is from Appsmith
    const company = {
      regt_name: "GNIDERTON INC.",
      address: "123 Business Avenue, Tech Park",
      gst: "29ABCDE1234F1Z5"
    };

    /* ── Layout constants (Very Tight Margins) ── */
    const PW   = doc.internal.pageSize.width;   // 595
    const PH   = doc.internal.pageSize.height;  // 842
    const ML   = 16;   // Margins at 16pt for maximum space
    const MR   = 16;   
    const CW   = PW - ML - MR;  // Content Width: 563

    /* ── Premium Modern SaaS Palette ── */
    const C = {
      primaryIndigo: [79, 70, 229] as [number, number, number],
      accentCoral: [249, 115, 22] as [number, number, number],
      textDark:    [15, 23, 42] as [number, number, number],
      textSlate:   [71, 85, 105] as [number, number, number],
      textLight:   [148, 163, 184] as [number, number, number],
      webBg:       [248, 250, 252] as [number, number, number],
      netSalaryBg: [238, 242, 255] as [number, number, number],
      cardBorder:  [226, 232, 240] as [number, number, number],
      emerald:     [16, 185, 129] as [number, number, number],
      rose:        [244, 63, 94] as [number, number, number],
      bannerPeach: [255, 247, 237] as [number, number, number],
    };

    /* ── Helpers ── */
    const setFont = (style: string, size: number, color?: [number, number, number]) => {
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
      if (color) doc.setTextColor(...color);
    };
    const setFill  = (rgb: [number, number, number]) => doc.setFillColor(...rgb);
    const setDraw  = (rgb: [number, number, number]) => doc.setDrawColor(...rgb);
    const fmt  = (v: any) => "Rs." + Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtN = (v: any) => Number(v).toLocaleString("en-IN");
    
    const getMonthName = (mNum: number) => {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return months[mNum - 1] || "Month";
    };

    const toWords = (num: number) => {
      const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
      const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
      const n = ("000000000" + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!n) return ''; 
      let str = '';
      str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
      str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
      str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
      str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
      str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) + 'Only ' : 'Only ';
      return str;
    };

    /* ================================================================
       1. SAAS APP NAVBAR & COMPANY WATERMARK
       ================================================================ */
    let Y = 20;

    // Decorative top gradient strip
    setFill(C.primaryIndigo);
    doc.rect(0, 0, PW, 6, "F");

    // Company info Right aligned
    setFont("bold", 12, C.textDark);
    doc.text(company.regt_name, PW - MR, Y + 10, { align: "right" });
    setFont("normal", 8, C.textSlate);
    doc.text(`${company.address} | GSTIN: ${company.gst}`, PW - MR, Y + 22, { align: "right" });

    Y += 40;
    setDraw(C.cardBorder);
    doc.setLineWidth(0.75);
    doc.line(ML, Y, PW - MR, Y);

    /* ================================================================
       2. PAYSLIP WEB HEADER (Premium Tag)
       ================================================================ */
    Y += 12;
    const salaryPeriod = `${getMonthName(h.month).toUpperCase()} ${h.year}`;
    
    // Rounded Card Background
    setFill(C.bannerPeach);
    setDraw([251, 146, 60]); // Light coral border
    doc.setLineWidth(0.5);
    doc.roundedRect(ML, Y, CW, 30, 4, 4, "FD");
    
    setFont("bold", 10.5, C.accentCoral);
    doc.text(`SALARY CREDIT ADVICE — ${salaryPeriod}`, ML + 12, Y + 19);
    
    setFont("bold", 9, C.textSlate);
    doc.text(`REFERENCE ID: PAY-${h.id}`, PW - MR - 12, Y + 19, { align: "right" });

    /* ================================================================
       3. CUSTOMER GRID CARD (Employee Metadata Table Style)
       ================================================================ */
    Y += 42;
    
    // Clean modern bordered table style card
    setFill(C.webBg);
    setDraw(C.cardBorder);
    doc.roundedRect(ML, Y, CW, 65, 4, 4, "FD");

    // Left Meta Columns
    setFont("bold", 7.5, C.textSlate);
    doc.text("EMPLOYEE DETAILS", ML + 15, Y + 16);
    setFont("normal", 8.5, C.textSlate);
    doc.text("Name:", ML + 15, Y + 30);
    doc.text("Emp Code:", ML + 15, Y + 44);
    doc.text("Joining Date:", ML + 15, Y + 56);

    setFont("bold", 9, C.textDark);
    doc.text(String(h.full_name), ML + 80, Y + 30);
    setFont("normal", 9, C.textDark);
    doc.text(String(h.employee_code), ML + 80, Y + 44);
    doc.text(h.joining_date ? h.joining_date.slice(0, 10) : "-", ML + 80, Y + 56);

    // Middle Vertical Split Line
    setDraw(C.cardBorder);
    doc.line(ML + 270, Y + 10, ML + 270, Y + 55);

    // Right Meta Columns
    setFont("bold", 7.5, C.textSlate);
    doc.text("TRANSACTION DETAILS", ML + 285, Y + 16);
    setFont("normal", 8.5, C.textSlate);
    doc.text("Credit Date:", ML + 285, Y + 30);
    doc.text("Mode / Source:", ML + 285, Y + 44);
    doc.text("Journal Entry:", ML + 285, Y + 56);

    setFont("normal", 9, C.textDark);
    doc.text(h.payment_date ? h.payment_date.slice(0, 10) : "-", ML + 375, Y + 30);
    doc.text(`${h.payment_mode} (${h.source_account || '-'})`, ML + 375, Y + 44);
    doc.text(String(h.journal_entry_id || "-"), ML + 375, Y + 56);

    Y += 80;

    /* ================================================================
       4. FINANCIAL COMPILATION TABLE
       ================================================================ */
    autoTable(doc, {
      startY: Y,
      margin: { left: ML, right: MR },
      head: [["EARNINGS & ADDITIONS", "AMOUNT (Rs.)", "DEDUCTIONS & RECOVERIES", "AMOUNT (Rs.)"]],
      body: [
        [
          "Basic Salary (Adjusted)",
          fmtN(Number(h.adjusted_base_salary).toFixed(2)),
          "Absentee / Leave Deductions",
          fmtN(Number(h.leave_deduction).toFixed(2))
        ],
        [
          "Incentive / Bonus Additions",
          fmtN(Number(h.bonus_addition).toFixed(2)),
          "Salary Advances Recovered",
          fmtN(Number(h.advance_deduction).toFixed(2))
        ],
        [
          "Leave Encashments",
          fmtN(Number(h.leave_encashment).toFixed(2)),
          "Personal Loan Deductions",
          fmtN(Number(h.loan_deduction).toFixed(2))
        ],
        [
          "—",
          "—",
          "Miscellaneous / Other Deductions",
          fmtN(Number(h.other_deductions).toFixed(2))
        ]
      ],
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 4.5, lineColor: C.cardBorder, lineWidth: 0.5, textColor: C.textDark, valign: "middle" },
      headStyles: { fillColor: C.primaryIndigo, textColor: [255,255,255], fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 180 },
        1: { halign: "right", cellWidth: 100 },
        2: { cellWidth: 180 },
        3: { halign: "right", cellWidth: 100 }
      },
      alternateRowStyles: { fillColor: [255,255,255] },
      foot: [[
        { content: "TOTAL ADDITIONS", styles: { fontStyle: "bold", fillColor: C.webBg } },
        { content: fmtN(Number(h.total_additions || 0).toFixed(2)), styles: { halign: "right", fontStyle: "bold", textColor: C.emerald, fillColor: C.webBg } },
        { content: "TOTAL DEDUCTIONS", styles: { fontStyle: "bold", fillColor: C.webBg } },
        { content: fmtN(Number(h.total_deductions || 0).toFixed(2)), styles: { halign: "right", fontStyle: "bold", textColor: C.rose, fillColor: C.webBg } }
      ]],
      footStyles: { lineColor: C.cardBorder, lineWidth: 0.5 },
    });

    Y = (doc as any).lastAutoTable.finalY + 16;

    /* ================================================================
       5. NESTED BREAKDOWNS (Detail Grid)
       ================================================================ */
    const halfWidth = (CW - 16) / 2;

    // Bonus data (TYPE, REMARKS, AMOUNT)
    const bonusRows = (breakdown.additions?.bonuses || []).map((b: any) => [
      b.bonus_type,
      b.remarks || "Salary Incentive",
      fmtN(Number(b.amount).toFixed(2))
    ]);
    if (bonusRows.length === 0) bonusRows.push(["—", "No adjustments", "0.00"]);

    // COMBINED DEDUCTION & RECOVERY DATA (Advances, Liabilities, Loans)
    const deductionRows: any[] = [];
    
    (breakdown.deductions?.advances || []).forEach((a: any) => {
        deductionRows.push([
            a.date ? a.date.slice(5, 10) : "-",
            `Advance: ${a.remarks || "Recovery"}`,
            fmtN(Number(a.amount).toFixed(2))
        ]);
    });

    (breakdown.deductions?.liabilities || []).forEach((l: any) => {
        deductionRows.push([
            "-",
            `Liability: ${l.type} - ${l.description}`,
            fmtN(Number(l.amount).toFixed(2))
        ]);
    });

    (breakdown.deductions?.loans || []).forEach((l: any) => {
        deductionRows.push([
            l.transaction_date ? l.transaction_date.slice(5, 10) : "-",
            `Loan #${l.loan_id} Repayment`,
            fmtN(Number(l.amount).toFixed(2))
        ]);
    });

    if (deductionRows.length === 0) deductionRows.push(["—", "No recoveries", "0.00"]);

    // Titles
    setFont("bold", 9, C.primaryIndigo);
    doc.text("Bonus Earnings Breakdown", ML, Y);
    doc.text("Deductions & Recoveries Ledger", ML + halfWidth + 16, Y);
    
    Y += 6;

    // Draw Left Breakdown Table (Vibrant Emerald Theme Header)
    autoTable(doc, {
      startY: Y,
      margin: { left: ML },
      tableWidth: halfWidth,
      head: [["TYPE", "REMARKS", "AMOUNT"]],
      body: bonusRows,
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 4, lineColor: C.cardBorder, lineWidth: 0.5, textColor: C.textDark },
      headStyles: { fillColor: C.emerald, textColor: [255,255,255], fontStyle: "bold" },
      columnStyles: { 
        0: { cellWidth: 70 },
        1: { cellWidth: 'auto' },
        2: { halign: "right", cellWidth: 55 } 
      }
    });
    const bonusFinalY = (doc as any).lastAutoTable.finalY;

    // Draw Right Breakdown Table (Vibrant Orange Theme Header)
    autoTable(doc, {
      startY: Y,
      margin: { left: ML + halfWidth + 16 },
      tableWidth: halfWidth,
      head: [["DATE", "REMARKS", "AMOUNT"]],
      body: deductionRows,
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 4, lineColor: C.cardBorder, lineWidth: 0.5, textColor: C.textDark },
      headStyles: { fillColor: C.accentCoral, textColor: [255,255,255], fontStyle: "bold" },
      columnStyles: { 
        0: { cellWidth: 45 },
        1: { cellWidth: 'auto' },
        2: { halign: "right", cellWidth: 55 } 
      }
    });
    const advanceFinalY = (doc as any).lastAutoTable.finalY;

    Y = Math.max(bonusFinalY, advanceFinalY) + 20;

    /* ================================================================
       6. PREMIUM SAAS STYLE NET PAYABLE BLOCK
       ================================================================ */
    // Card Panel
    setFill(C.netSalaryBg);
    setDraw(C.primaryIndigo);
    doc.setLineWidth(1.5);
    doc.roundedRect(ML, Y, CW, 45, 4, 4, "FD");

    // Left Accent bar in Warm Coral
    setFill(C.accentCoral);
    doc.rect(ML, Y, 4, 45, "F");

    // Net Text
    setFont("bold", 7.5, C.primaryIndigo);
    doc.text("NET SALARY DISBURSED OUTFLOW", ML + 18, Y + 18);
    setFont("bold", 8, C.textDark);
    
    // In our backend, absence data isn't directly on deductions.leave object like Appsmith, we'll just skip absent days count here to avoid errors or fetch it if needed.
    doc.text(`TOTAL NET PAYABLE`, ML + 18, Y + 32);

    // Amount Highlight
    setFont("bold", 15, C.primaryIndigo);
    doc.text(fmt(h.net_salary), PW - MR - 15, Y + 28, { align: "right" });

    Y += 60;

    // Text amount representation
    setFont("bold", 8.5, C.textDark);
    doc.text("Amount Disbursed (in words):", ML, Y);
    setFont("normal", 8.5, C.textSlate);
    doc.text(toWords(Math.round(h.net_salary)), ML + 125, Y);

    Y += 30;

    /* ================================================================
       7. SIGNATURE BLOCKS & INTERNAL AUDIT COMPLIANCE
       ================================================================ */
    setFont("normal", 8, C.textLight);
    doc.text("This document is generated by the Gniderton Accounts System and does not require physical signatures.", ML, Y);

    Y += 40;

    setDraw(C.textLight);
    doc.setLineWidth(0.5);
    
    // Signature lines
    doc.line(ML + 10, Y, ML + 150, Y);
    setFont("bold", 8, C.textDark);
    doc.text("Employee Acknowledgment", ML + 25, Y + 12);

    doc.line(PW - MR - 150, Y, PW - MR - 10, Y);
    doc.text("Authorized Payroll Signatory", PW - MR - 145, Y + 12);

    // Page footer border line
    setDraw(C.cardBorder);
    doc.line(ML, PH - 24, PW - MR, PH - 24);

    setFont("normal", 7.5, C.textLight);
    doc.text(`${company.regt_name} • Internal Payroll Credit Advice Slip`, ML, PH - 12);
    doc.text(`Confidential • Page 1 of 1`, PW - MR, PH - 12, { align: "right" });

    /* ── Download action ── */
    const fileName = `PAYSLIP_${h.employee_code}_${getMonthName(h.month)}_${h.year}.pdf`;
    doc.save(fileName);

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}
