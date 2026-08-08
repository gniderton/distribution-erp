import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { Download } from 'lucide-react'
import { api } from '@/lib/axios'
import { reportsApi } from '../api'
import moment from 'moment'
import { toast } from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ColumnDef } from '@tanstack/react-table'

export function ReceivablesReportView() {
  const [selectedDseName, setSelectedDseName] = useState('')
  const [selectedRouteName, setSelectedRouteName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Data fetching
  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ['dse-pending-invoices'],
    queryFn: reportsApi.dsePendingInvoices
  })

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => api.get('/api/employees').then(r => r.data)
  })

  const { data: routes = [] } = useQuery({
    queryKey: ['routes-list'],
    queryFn: () => api.get('/api/master/routes').then(r => r.data)
  })

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => api.get('/api/company-settings').then(r => r.data).catch(() => ({})),
    staleTime: Infinity
  })

  // Derived filtered data
  const filteredData = useMemo(() => {
    let data = Array.isArray(rawData) ? rawData : (rawData?.data || rawData?.results || [])
    return data.filter((row: any) => {
      const matchDse = selectedDseName ? (row.dse_name === selectedDseName || row.employee_name === selectedDseName) : true;
      const matchRoute = selectedRouteName ? row.route_name === selectedRouteName : true;
      return matchDse && matchRoute;
    })
  }, [rawData, selectedDseName, selectedRouteName])

  // Calculate stats for UI and PDF
  const stats = useMemo(() => {
    const osTotal = filteredData.reduce((sum: number, item: any) => sum + Number(item.balance || 0), 0);
    const invCount = filteredData.length;
    const custCount = [...new Set(filteredData.map((i: any) => i.customer_id))].length;
    const above21DaysAmt = filteredData.filter((i: any) => i.days_from_billed > 21).reduce((s: number, i: any) => s + Number(i.balance || 0), 0);
    const targetAmt = osTotal * 0.30;
    return { osTotal, invCount, custCount, above21DaysAmt, targetAmt };
  }, [filteredData])

  // PDF Export Function (Ported from Appsmith)
  const downloadReceivablesPDF = async () => {
    try {
      const data = filteredData;
      if (!data || data.length === 0) throw new Error("No data available to download.");

      // --- 1. DATA LOOKUPS & SORTING ---
      const dseDetails = employees.find((emp: any) => (emp.full_name || emp.employee_name) === selectedDseName) || {};

      const sortedData = [...data].sort((a: any, b: any) => {
        const nameA = (a.customer_name || "").toUpperCase();
        const nameB = (b.customer_name || "").toUpperCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime();
      });

      // --- 3. LIBRARY SETUP ---
      const doc = new jsPDF('p', 'pt', 'a4');
      const brand = companySettings || { regt_name: 'Company', gst: '', contact_no: '', email: '' };

      const margin = 5;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      const _drawSimpleBox = (doc: any, x: number, y: number, width: number, height: number, rows: any[]) => {
        doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5); doc.rect(x, y, width, height);
        let rowY = y + 11;
        rows.forEach(r => {
          doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
          doc.text(String(r[0]) + ":", x + 4, rowY);
          doc.setFont("helvetica", "normal");
          const val = String(r[1] || "-");
          const splitVal = doc.splitTextToSize(val, width - 65);
          doc.text(splitVal, x + 63, rowY);
          rowY += (splitVal.length * 8.5) + 2;
        });
      };

      // --- HEADER & RECONCILIATION BLOCK (Page 1 Only) ---
      const drawTopSection = () => {
        const headerY = margin;
        try {
          if (brand.company_logo) {
            doc.addImage(brand.company_logo, 'PNG', margin, headerY, 80, 25);
          }
        } catch (e) {}

        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("PAYMENT COLLECTION MASTER", pageWidth / 2, headerY + 12, { align: "center" });

        const boxesY = headerY + 35;
        const gap = 5;
        const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3;
        const boxHeight = 50;

        _drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
          ["COMPANY", String(brand.regt_name || brand.name || '-')],
          ["GST", String(brand.gst || '-')],
          ["CONTACT", String(brand.contact_no || brand.phone || '-')],
          ["EMAIL", String(brand.email || '-')]
        ]);

        _drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
          ["DSE CODE", String(dseDetails.employee_code || "-")],
          ["DSE NAME", selectedDseName || "ALL SALES"],
          ["ROUTE", selectedRouteName || "ALL ROUTES"],
          ["DATE", moment().format("DD/MM/YYYY")]
        ]);

        _drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
          ["O/S TOTAL", `Rs. ${stats.osTotal.toFixed(0)}`],
          ["INV/CUST", `${stats.invCount} / ${stats.custCount}`],
          ["> 21 DAYS", `Rs. ${stats.above21DaysAmt.toFixed(0)}`],
          ["TARGET 30%", `Rs. ${stats.targetAmt.toFixed(0)}`]
        ]);

        const reconY = boxesY + boxHeight + 5;

        autoTable(doc, {
          startY: reconY,
          margin: { left: margin },
          tableWidth: boxWidth,
          head: [["DENOMINATION", "QTY", "AMOUNT"]],
          body: [["500", "", ""], ["200", "", ""], ["100", "", ""], ["50", "", ""], ["20", "", ""], ["10", "", ""], ["Others", "", ""], ["TOTAL CASH", "", ""]],
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 3, lineColor: [0, 0, 0], textColor: [0, 0, 0], minCellHeight: 18 },
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            lineWidth: 0.5,
            lineColor: [0, 0, 0]
          }
        });

        autoTable(doc, {
          startY: reconY,
          margin: { left: margin + boxWidth + gap },
          tableWidth: (boxWidth * 2) + gap,
          head: [["COLLECTION SUMMARY", "AMOUNT"]],
          body: [
            ["TOTAL CASH RECEIPT", ""],
            ["CHEQUE TOTAL", ""],
            ["ONLINE / UPI TOTAL", ""],
            ["EXPENSES (IF ANY)", ""],
            ["GRAND TOTAL COLLECTED", ""]
          ],
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 3, minCellHeight: 27, lineColor: [0, 0, 0], textColor: [0, 0, 0], valign: 'middle' },
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            lineWidth: 0.5,
            lineColor: [0, 0, 0]
          }
        });

        return (doc as any).lastAutoTable.finalY + 2.5;
      };

      const firstPageTableStart = drawTopSection();

      // --- 4. MAIN BILL TABLE (UPDATED FONT SIZE) ---
      autoTable(doc, {
        startY: firstPageTableStart,
        margin: { left: margin, right: margin, bottom: 13, top: 5 },
        head: [["Date", "Inv No", "Customer", "Amt", "Bal", "P.Date", "Mode", "Bank/Ref No", "Paid", "D"]],
        body: sortedData.map((row: any) => [
          moment(row.invoice_date).format("DD/MM/YY"),
          String(row.invoice_number || "").replace("INV-26-", ""),
          row.customer_name,
          Number(row.bill_amount || 0).toFixed(0),
          Number(row.balance || 0).toFixed(0),
          "", "", "", "",
          row.days_from_billed || 0
        ]),
        didDrawPage: (data: any) => {
          doc.setFontSize(6);
          doc.setTextColor(100);
          doc.setFont("helvetica", "normal");
          const footerText = `Page ${data.pageNumber}`;
          const timestamp = `Generated on: ${moment().format("DD MMM YYYY, hh:mm A")}`;
          doc.text(footerText, pageWidth - margin - 30, pageHeight - 5);
          doc.text(timestamp, margin, pageHeight - 5);
        },
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 3,
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
          minCellHeight: 20,
          textColor: [0, 0, 0],
          valign: 'middle'
        },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 48 }, // Date
          1: { cellWidth: 42 }, // Inv No
          2: { cellWidth: 'auto' }, // Customer
          3: { halign: 'right', cellWidth: 38 }, // Amt
          4: { halign: 'right', cellWidth: 38 }, // Bal
          5: { cellWidth: 48 }, // P.Date
          6: { cellWidth: 38 }, // Mode
          7: { cellWidth: 65 }, // Bank/Ref No
          8: { cellWidth: 42 }, // Paid
          9: { halign: 'center', cellWidth: 18 } // D (Days)
        }
      });

      doc.save(`Collection_${selectedDseName || 'Global'}.pdf`);
      toast.success("Receivables PDF Exported Successfully");
    } catch (error: any) {
      toast.error("PDF Error: " + error.message);
    }
  }

  // React Table Columns
  const columns = useMemo<ColumnDef<any>[]>(() => [
    { accessorKey: 'invoice_date', header: 'Date', cell: (c) => moment(c.getValue() as string).format('DD/MM/YY') },
    { accessorKey: 'invoice_number', header: 'Inv No' },
    { accessorKey: 'customer_name', header: 'Customer' },
    { accessorKey: 'bill_amount', header: 'Amount', cell: (c) => Number(c.getValue() || 0).toFixed(2) },
    { accessorKey: 'balance', header: 'Balance', cell: (c) => <span className="font-semibold text-danger-600">{Number(c.getValue() || 0).toFixed(2)}</span> },
    { accessorKey: 'days_from_billed', header: 'Days', cell: (c) => c.getValue() || 0 }
  ], [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-ink-900">DSE Pending Invoices (Receivables)</h2>
          <p className="text-sm text-ink-500">View and export the Payment Collection Master for DSEs.</p>
        </div>
        <Button onClick={downloadReceivablesPDF} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Master PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-5 rounded-xl border border-[#e6e9ee] shadow-sm flex flex-col justify-center">
          <p className="text-sm text-ink-600 font-medium mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-ink-900 font-mono-figures">₹{stats.osTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <div className="flex gap-4 mt-2">
            <p className="text-xs text-ink-500">Invoices: {stats.invCount.toLocaleString()}</p>
            {stats.above21DaysAmt > 0 && <p className="text-xs text-danger-600 font-medium">&gt; 21 Days: ₹{stats.above21DaysAmt.toLocaleString('en-IN')}</p>}
          </div>
        </div>
        
        <div className="md:col-span-2 flex items-center gap-4 bg-white p-5 rounded-xl border border-[#e6e9ee] shadow-sm">
          <div className="flex-1">
            <label className="block text-xs font-medium text-ink-700 mb-1">Select DSE Name</label>
            <Select value={selectedDseName} onChange={e => setSelectedDseName(e.target.value)}>
              <option value="">All Sales Executives</option>
              {employees.map((emp: any) => (
                <option key={emp.id || emp.employee_id} value={emp.full_name || emp.employee_name}>
                  {emp.full_name || emp.employee_name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-ink-700 mb-1">Select Route</label>
            <Select value={selectedRouteName} onChange={e => setSelectedRouteName(e.target.value)}>
              <option value="">All Routes</option>
              {routes.map((rt: any) => (
                <option key={rt.id || rt.route_id} value={rt.route_name || rt.name}>
                  {rt.route_name || rt.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        globalFilter={searchTerm}
        onGlobalFilterChange={setSearchTerm}
        searchPlaceholder="Search by customer, invoice..."
      />
    </div>
  )
}
