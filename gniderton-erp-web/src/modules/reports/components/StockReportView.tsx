import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { DataTable } from '@/components/shared/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { Package, Hash, DollarSign, Search, Filter, Download } from 'lucide-react'
import { Input, Select, Label } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import moment from 'moment'
import { toast } from 'react-hot-toast'

export function StockReportView() {
  const [searchTerm, setSearchTerm] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => api.get('/api/company-settings').then(r => r.data)
  })

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['stock-report-products'],
    queryFn: () => api.get('/api/products').then(r => Array.isArray(r.data) ? r.data : (r.data?.data || []))
  })

  const rawData = productsData || []

  // Extract unique brands and categories for filters
  const brands = useMemo(() => Array.from(new Set(rawData.map((p: any) => p.brand_name).filter(Boolean))), [rawData])
  const categories = useMemo(() => Array.from(new Set(rawData.map((p: any) => p.category_name).filter(Boolean))), [rawData])

  // Filter Data
  const filteredData = useMemo(() => {
    return rawData.filter((row: any) => {
      const name = String(row.product_name || '');
      const code = String(row.product_code || '');
      const matchSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBrand = brandFilter ? row.brand_name === brandFilter : true
      const matchCat = categoryFilter ? row.category_name === categoryFilter : true
      
      let matchStatus = true;
      const qty = Number(row.current_stock || 0);
      if (statusFilter === 'in_stock') matchStatus = qty > 0;
      if (statusFilter === 'out_of_stock') matchStatus = qty <= 0;
      if (statusFilter === 'low_stock') matchStatus = qty > 0 && qty < 10; // assuming < 10 is low

      return matchSearch && matchBrand && matchCat && matchStatus
    })
  }, [rawData, searchTerm, brandFilter, categoryFilter, statusFilter])

  // Calculate Stats
  const stats = useMemo(() => {
    let totalItems = 0;
    let totalValuation = 0;
    let outOfStock = 0;

    filteredData.forEach((row: any) => {
      const qty = Number(row.current_stock || 0)
      const cost = Number(row.purchase_rate || 0)
      totalItems += qty;
      totalValuation += (qty * cost);
      if (qty <= 0) outOfStock++;
    })

    return { totalItems, totalValuation, outOfStock }
  }, [filteredData])

  // Columns definition matching requested fields
  const columns = useMemo(() => [
    { header: 'CODE', accessorKey: 'product_code' },
    { header: 'ITEM NAME', accessorKey: 'product_name' },
    { header: 'BRAND', accessorKey: 'brand_name' },
    { header: 'CATEGORY', accessorKey: 'category_name' },
    { header: 'MRP', accessorKey: 'mrp', cell: (info: any) => Number(info.getValue() || 0).toFixed(2) },
    { header: 'QTY', accessorKey: 'current_stock', cell: (info: any) => <span className="font-bold">{info.getValue() || 0}</span> },
    { header: 'UOM', accessorKey: 'uom' },
    { header: 'COST', accessorKey: 'purchase_rate', cell: (info: any) => Number(info.getValue() || 0).toFixed(2) },
    { 
      header: 'TOTAL VALUE', 
      id: 'total_value',
      accessorFn: (row: any) => Number(row.current_stock || 0) * Number(row.purchase_rate || 0),
      cell: (info: any) => <span className="font-bold text-green-700">₹{info.getValue().toFixed(2)}</span>
    }
  ], [])

  // Helper for drawing PDF info boxes
  const _drawSimpleBox = (doc: any, x: number, y: number, width: number, height: number, rows: (any[])[], labelWidth: number = 70) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(x, y, width, height);
    let rowY = y + 12;

    rows.forEach(r => {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      const label = String(r[0]) + ":";
      doc.text(label, x + 5, rowY);
      doc.setFont("helvetica", "normal");

      const val = String(r[1] || "-");
      const isRightAlign = r[2] === true;

      if (isRightAlign) {
        doc.text(val, x + width - 5, rowY, { align: 'right' });
        rowY += 12;
      } else {
        const splitVal = doc.splitTextToSize(val, width - labelWidth - 5);
        doc.text(splitVal, x + labelWidth, rowY);
        rowY += (splitVal.length * 10.5) + 1.5;
      }
    });
  };

  // Export PDF functionality matching the provided snippet
  const previewStockReport = async () => {
    try {
      const stockData = filteredData;
      if (!stockData || stockData.length === 0) throw new Error("No stock data available to export.");

      const doc = new jsPDF('l', 'pt', 'a4');
      const brand = {
        regt_name: companySettings?.company_name || 'Gniderton ERP',
        gst: companySettings?.gstin || 'N/A',
        logo: companySettings?.company_logo || '',
        address: companySettings?.address || '',
        district: companySettings?.district || '',
        pin: companySettings?.pin || '',
        email: companySettings?.email || '',
        phone: companySettings?.contact_no || ''
      };
      
      const margin = 15;
      const pageWidth = doc.internal.pageSize.width;

      const drawMainHeader = (currentPage: number) => {
        const headerY = margin;
        
        try {
          if (brand.logo && brand.logo.startsWith("data:image/")) {
            doc.addImage(brand.logo, 'PNG', margin, headerY, 90, 30);
          }
        } catch(e) {}

        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        // Nudge the title 15pt right to visually balance the '&' symbol
        doc.text("INVENTORY STATUS & VALUATION REPORT", (pageWidth / 2) + 15, headerY + 15, { align: "center" });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        // Nudge the page string as well
        doc.text(`Page ${currentPage} of {total_pages_count_string}`, (pageWidth / 2) + 15, headerY + 28, { align: "center" });

        const boxesY = headerY + 40;
        const gap = 15;
        const boxWidth = (pageWidth - (margin * 2) - gap) / 2;
        const boxHeight = 75; // Fits 5 lines

        // BOX 1: Company Details
        const addressLines = [brand.address, brand.district, brand.pin].filter(Boolean).join(", ");
        _drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
          ["Company", String(brand.regt_name || "GNIDERTON ERP")],
          ["Address", addressLines || "-"],
          ["Email", String(brand.email || "-")],
          ["Phone", String(brand.phone || "-")],
          ["GSTIN", String(brand.gst || "-")]
        ], 60);

        // BOX 2: Report Details
        _drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
          ["Report Type", "Live Inventory Status & Valuation"],
          ["Date Generated", moment().format("DD MMM YYYY, hh:mm A")],
          ["Total Items", stats.totalItems.toLocaleString()],
          ["Total Value", "Rs. " + stats.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
          ["Generated By", "System Generated"]
        ], 80);
      };

      autoTable(doc, {
        startY: 145,
        margin: { left: margin, right: margin, top: 145, bottom: margin },
        head: [["S.N", "ITEM NAME", "CODE", "BRAND", "CATEGORY", "MRP", "QTY", "UOM", "COST", "TOTAL VALUE", "LAST SOLD"]],
        body: stockData.map((row: any, index: number) => [
          index + 1,
          row.product_name,
          row.product_code,
          row.brand_name || 'N/A',
          row.category_name || 'N/A',
          Number(row.mrp || 0).toFixed(2),
          row.current_stock || 0,
          row.uom || 'N/A',
          Number(row.purchase_rate || 0).toFixed(2),
          (Number(row.current_stock || 0) * Number(row.purchase_rate || 0)).toFixed(2),
          row.last_sold_date ? moment(row.last_sold_date).format("DD/MM/YY") : "N/A"
        ]),
        didDrawPage: (data: any) => {
          drawMainHeader(data.pageNumber);
        },
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.5 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.5 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 'auto' },
          6: { halign: 'right', fontStyle: 'bold' },
          9: { halign: 'right', fontStyle: 'bold' }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 20;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Total Items in Stock: ${stats.totalItems}`, margin, finalY);
      doc.text(`Total Inventory Valuation: INR ${stats.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, margin, finalY + 15);

      if (typeof doc.putTotalPages === 'function') {
        doc.putTotalPages('{total_pages_count_string}');
      }

      const fileName = `Stock_Report_${moment().format("DD_MM_YY")}.pdf`;
      doc.save(fileName);
      toast.success("Stock Report Exported Successfully");

    } catch (error: any) {
      toast.error("Export Error: " + error.message);
    }
  }

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-[400px] w-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Live Stock Report</h2>
          <p className="text-sm text-ink-500">View current inventory holdings, valuations, and stock status.</p>
        </div>
        <Button onClick={previewStockReport} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export to PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          label="Total Items in Stock" 
          value={stats.totalItems.toLocaleString()} 
          icon={Package} 
        />
        <StatCard 
          label="Total Inventory Valuation" 
          value={`₹${stats.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} 
          icon={DollarSign} 
        />
        <StatCard 
          label="Out of Stock Items" 
          value={stats.outOfStock.toString()} 
          icon={Hash} 
          trend="Requires Attention"
          tone="danger"
        />
      </div>

      <div className="bg-white p-4 rounded-xl border border-[#e6e9ee] shadow-sm space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs mb-1 text-ink-500 block">Search Item</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
              <Input
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="w-[180px]">
            <Label className="text-xs mb-1 text-ink-500 block">Brand</Label>
            <Select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
              <option value="">All Brands</option>
              {brands.map((b: any) => <option key={b} value={b}>{b}</option>)}
            </Select>
          </div>
          <div className="w-[180px]">
            <Label className="text-xs mb-1 text-ink-500 block">Category</Label>
            <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((c: any) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="w-[180px]">
            <Label className="text-xs mb-1 text-ink-500 block">Status</Label>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Items</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock (&lt;10)</option>
              <option value="out_of_stock">Out of Stock</option>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredData}
          searchPlaceholder="Search in results..."
        />
      </div>
    </div>
  )
}
