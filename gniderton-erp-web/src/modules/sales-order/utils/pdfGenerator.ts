import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from '@/lib/utils'

export const generateSalesOrderPDF = async (orderData: any, lines: any[]) => {
  if (!orderData) throw new Error("No Order data selected.");
  
  const doc = new jsPDF('p', 'pt', 'a4');
  
  const margin = 12;
  const pageWidth = doc.internal.pageSize.width;

  const drawMainHeader = (currentPage: number, totalPages: number) => {
    const headerY = margin;
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SALES ORDER", pageWidth / 2, headerY + 15, { align: "center" });
    
    doc.setFontSize(11);
    doc.text(String(orderData.so_number || `SO-${orderData.id}`), pageWidth / 2, headerY + 30, { align: "center" });
    
    const boxesY = headerY + 40;
    const gap = 8;
    const boxWidth = (pageWidth - margin * 2 - gap) / 2;
    const boxHeight = 80;
    
    // Customer Box
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(margin, boxesY, boxWidth, boxHeight);
    let rowY = boxesY + 15;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Customer:", margin + 5, rowY);
    doc.setFont("helvetica", "normal");
    doc.text(String(orderData.customer_name || "-"), margin + 65, rowY);
    
    rowY += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Status:", margin + 5, rowY);
    doc.setFont("helvetica", "normal");
    doc.text(String(orderData.status || "Confirmed"), margin + 65, rowY);

    // Details Box
    doc.setDrawColor(0, 0, 0);
    doc.rect(margin + boxWidth + gap, boxesY, boxWidth, boxHeight);
    rowY = boxesY + 15;
    
    doc.setFont("helvetica", "bold");
    doc.text("Order Date:", margin + boxWidth + gap + 5, rowY);
    doc.setFont("helvetica", "normal");
    doc.text(orderData.order_date ? formatDate(orderData.order_date) : "-", margin + boxWidth + gap + 70, rowY);
    
    rowY += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Route:", margin + boxWidth + gap + 5, rowY);
    doc.setFont("helvetica", "normal");
    doc.text(String(orderData.route_name || "-"), margin + boxWidth + gap + 70, rowY);

    rowY += 15;
    doc.setFont("helvetica", "bold");
    doc.text("DSE Rep:", margin + boxWidth + gap + 5, rowY);
    doc.setFont("helvetica", "normal");
    doc.text(String(orderData.dse_name || "-"), margin + boxWidth + gap + 70, rowY);

    rowY += 15;
    doc.setFont("helvetica", "bold");
    doc.text("PAGE:", margin + boxWidth + gap + 5, rowY);
    doc.setFont("helvetica", "normal");
    doc.text(`${currentPage} / ${totalPages}`, margin + boxWidth + gap + 70, rowY);

    return boxesY + boxHeight;
  };

  autoTable(doc as any, {
    startY: margin + 40 + 80 + 15,
    margin: { left: margin, right: margin, bottom: 12 },
    head: [["S.N", "PRODUCT NAME", "RATE", "QTY", "AMOUNT"]],
    body: lines.map((row, index) => {
      return [
        index + 1, 
        row.product_name || `Product ID: ${row.product_id}`, 
        Number(row.rate || 0).toFixed(2), 
        row.qty, 
        Number(row.amount || (row.qty * row.rate)).toFixed(2)
      ];
    }).map(row => row.map(cell => String(cell || ""))),
    didDrawPage: (data: any) => {
      drawMainHeader(data.pageNumber, (doc as any).internal.getNumberOfPages());
    },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 70, halign: 'right' },
      3: { cellWidth: 50, halign: 'right' },
      4: { cellWidth: 80, halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Amount: ${Number(orderData.total_amount || 0).toFixed(2)}`, pageWidth - margin, finalY, { align: "right" });
  
  const fileName = (orderData.so_number || `SO-${orderData.id}`) + ".pdf";
  doc.save(fileName);
}
