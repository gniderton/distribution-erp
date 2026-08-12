const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'modules', 'debit-notes', 'utils', 'pdf.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Update margin
content = content.replace('const margin = 20', 'const margin = 12');

// 2. Replace _drawSimpleBox
const oldDrawBox = /function _drawSimpleBox.*?\}\n/s;
const newDrawBox = `function _drawSimpleBox(doc: any, x: number, y: number, width: number, height: number, rows: [string, string][]) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(x, y, width, height);
  let rowY = y + 11;
  rows.forEach(([label, value]) => {
    if (!value) return;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const labelStr = String(label) + ":";
    doc.text(labelStr, x + 5, rowY);
    doc.setFont("helvetica", "normal");
    const val = String(value || "-");
    const splitVal = doc.splitTextToSize(val, width - 40 - 5);
    doc.text(splitVal, x + 40, rowY);
    rowY += splitVal.length * 9.5 + 1.5;
  });
}\n`;
content = content.replace(oldDrawBox, newDrawBox);

// 3. Add groupDnLines
const groupFn = `
function groupDnLines(lines: any[]) {
  const map = new Map<string, any>();
  lines.forEach(line => {
    const key = line['product_code'] + '_' + line['MRP'];
    if (!map.has(key)) {
      map.set(key, { ...line, Batches: new Set([line['Batch No']]), Expiries: new Set([line['Expiry']]) });
    } else {
      const existing = map.get(key);
      existing['Qty'] = Number(existing['Qty'] || 0) + Number(line['Qty'] || 0);
      existing['Gross $'] = Number(existing['Gross $'] || 0) + Number(line['Gross $'] || 0);
      existing['Taxable $'] = Number(existing['Taxable $'] || 0) + Number(line['Taxable $'] || 0);
      existing['GST $'] = Number(existing['GST $'] || 0) + Number(line['GST $'] || 0);
      existing['Net $'] = Number(existing['Net $'] || 0) + Number(line['Net $'] || 0);
      if (line['Batch No']) existing.Batches.add(line['Batch No']);
      if (line['Expiry']) existing.Expiries.add(line['Expiry']);
    }
  });
  return Array.from(map.values()).map(item => {
    item['Batch No'] = Array.from(item.Batches).filter(Boolean).join(', ');
    item['Expiry'] = Array.from(item.Expiries).filter(Boolean)[0];
    return item;
  });
}
`;
content = content.replace('export async function generateDebitNotePdf', groupFn + '\nexport async function generateDebitNotePdf');

// 4. Use grouped lines
content = content.replace('const summaryData = getDNTaxSummary(dnLines || [])', 'const groupedLines = groupDnLines(dnLines || [])\n    const summaryData = getDNTaxSummary(groupedLines)');

// 5. Update autoTable for items
const oldTable = /autoTable\(doc, \{\n      startY: 160.*?\n      headStyles.*?\}\)/s;
const newTable = `autoTable(doc, {
      startY: 160,
      margin: { left: margin, right: margin, top: 160, bottom: 12 },
      head: [["S.N", "ITEM NAME", "HSN", "BATCH\\nEXPIRY", "MRP", "QTY", "PRICE", "GROSS", "SCH", "D%", "D.AMT", "TXBL", "GST%", "GST$", "NET$"]],
      body: groupedLines.map((row: any, index: number) => {
        const expiryStr = row['Expiry'] ? new Date(row['Expiry']).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' }) : "-"
        return [
          index + 1,
          \`\${row['Item Name']}\\nEAN: \${row['EAN Code'] || row['product_code'] || ""}\`,
          row['hsn_code'] || "-",
          \`\${row['Batch No'] || ""}\\n\${expiryStr}\`,
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
        1: { cellWidth: 100 }
      }
    })`;
content = content.replace(oldTable, newTable);

// 6. Fix slipY
content = content.replace('const slipY = pageHeight - 100', 'const slipY = pageHeight - 160');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done!');
