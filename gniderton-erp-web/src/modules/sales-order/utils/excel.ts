import * as ExcelJS from 'exceljs';
import { formatCurrency } from '@/lib/utils';

export async function generateSalesOrderExcel(order: any, lines: any[]) {
  if (!order) return;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(order.so_number || `SO-${order.id}`);

  // Add Header Info
  sheet.addRow(['Sales Order Details']);
  sheet.addRow(['Order Number', order.so_number || `SO-${order.id}`]);
  sheet.addRow(['Customer', order.customer_name]);
  sheet.addRow(['Route', order.route_name || '-']);
  sheet.addRow(['DSE Rep', order.dse_name || '-']);
  sheet.addRow(['Order Date', order.order_date ? new Date(order.order_date).toLocaleDateString() : '-']);
  sheet.addRow(['Status', order.status || 'Confirmed']);
  sheet.addRow(['Total Amount', formatCurrency(order.total_amount || 0)]);
  sheet.addRow([]);

  if (lines && lines.length > 0) {
    sheet.addRow(['Line Items']);
    // Define columns
    sheet.columns = [
      { header: 'Product Name', key: 'productName', width: 40 },
      { header: 'MRP', key: 'mrp', width: 15 },
      { header: 'Rate', key: 'rate', width: 15 },
      { header: 'Quantity', key: 'qty', width: 15 },
      { header: 'Taxable', key: 'taxable', width: 15 },
      { header: 'GST', key: 'taxAmt', width: 15 },
      { header: 'Net', key: 'net', width: 15 }
    ];

    // Style the header row
    const headerRow = sheet.getRow(11);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    lines.forEach((line) => {
      const taxable = Number(line.amount || (line.qty * line.rate));
      const taxAmount = Number(line.tax_amount || line.tax || 0);
      const net = taxable + taxAmount;

      sheet.addRow({
        productName: line.product_name || `Product ID: ${line.product_id}`,
        mrp: Number(line.mrp || 0),
        rate: Number(line.rate || 0),
        qty: Number(line.qty || 0),
        taxable: taxable,
        taxAmt: taxAmount,
        net: net
      });
    });
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${order.so_number || 'SO-' + order.id}.xlsx`;
  a.click();
}
