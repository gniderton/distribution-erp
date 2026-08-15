import * as ExcelJS from 'exceljs';
import { formatCurrency } from '@/lib/utils';

export async function generateDebitNoteExcel(debitNote: any, items: any[]) {
  if (!debitNote) return;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(debitNote.debit_note_number || 'Debit Note');

  // Add Header Info
  sheet.addRow(['Debit Note Details']);
  sheet.addRow(['Note Number', debitNote.debit_note_number]);
  sheet.addRow(['Vendor', debitNote.vendor_name]);
  sheet.addRow(['Type', debitNote.note_type]);
  sheet.addRow(['Status', debitNote.status]);
  sheet.addRow(['Date', debitNote.debit_note_date ? new Date(debitNote.debit_note_date).toLocaleDateString() : '']);
  sheet.addRow(['Total Amount', formatCurrency(debitNote.amount || 0)]);
  sheet.addRow([]);

  if (items && items.length > 0) {
    sheet.addRow(['Line Items']);
    // Define columns
    sheet.columns = [
      { header: 'S.No', key: 'sno', width: 10 },
      { header: 'Item Name', key: 'itemName', width: 30 },
      { header: 'Batch No', key: 'batchNo', width: 20 },
      { header: 'Qty', key: 'qty', width: 10 },
      { header: 'MRP', key: 'mrp', width: 15 },
      { header: 'Unit Rate', key: 'unitRate', width: 15 },
      { header: 'Gross', key: 'gross', width: 15 },
      { header: 'Taxable', key: 'taxable', width: 15 },
      { header: 'Tax %', key: 'taxPct', width: 10 },
      { header: 'Tax Amt', key: 'taxAmt', width: 15 },
      { header: 'Net', key: 'net', width: 15 }
    ];

    // Style the header row
    const headerRow = sheet.getRow(10);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    items.forEach((item) => {
      sheet.addRow({
        sno: item['S.No'],
        itemName: item['Item Name'],
        batchNo: item['Batch No'],
        qty: item['Qty'],
        mrp: Number(item['MRP'] || 0),
        unitRate: Number(item['Price'] || 0),
        gross: Number(item['Gross $'] || 0),
        taxable: Number(item['Taxable $'] || 0),
        taxPct: Number(item['GST %'] || 0),
        taxAmt: Number(item['GST $'] || 0),
        net: Number(item['Net $'] || 0)
      });
    });
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${debitNote.debit_note_number || 'debit_note'}.xlsx`;
  a.click();
}
