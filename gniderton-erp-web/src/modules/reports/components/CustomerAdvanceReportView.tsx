import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api';
import { DataTable } from '@/components/shared/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, Filter, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const CustomerAdvanceReportView: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dseId, setDseId] = useState('');
  const [globalFilter, setGlobalFilter] = useState('');

  // Fetch DSEs (Sales Reps) for the filter dropdown
  const { data: dses } = useQuery({
    queryKey: ['dses'],
    queryFn: () => fetch('/api/employees?role=DSE').then(res => res.json()),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['customer-advances', startDate, endDate, dseId],
    queryFn: () => reportsApi.customerAdvances({ start_date: startDate, end_date: endDate, dse_id: dseId }),
  });

  const filteredData = React.useMemo(() => {
    if (!data) return [];
    if (!globalFilter) return data;
    const lower = globalFilter.toLowerCase();
    return data.filter((row: any) => 
      row.customer_name?.toLowerCase().includes(lower) || 
      row.dse_name?.toLowerCase().includes(lower)
    );
  }, [data, globalFilter]);

  const columns = [
    { header: 'Customer', accessorKey: 'customer_name' },
    { header: 'Sales Rep (DSE)', accessorKey: 'dse_name', cell: (info: any) => info.getValue() || 'Unassigned' },
    { header: 'No. of Advances', accessorKey: 'advance_count' },
    { header: 'Total Balance', accessorKey: 'total_advance_balance', cell: (info: any) => formatCurrency(parseFloat(info.getValue() || 0)) },
    { header: 'Last Advance', accessorKey: 'last_advance_date', cell: (info: any) => formatDate(info.getValue()) },
  ];

  const handleExportExcel = () => {
    if (!filteredData || filteredData.length === 0) return;
    const exportData = filteredData.map((r: any) => ({
      Customer: r.customer_name,
      'Sales Rep': r.dse_name || 'Unassigned',
      'Total Balance': parseFloat(r.total_advance_balance || 0),
      'No. of Advances': r.advance_count,
      'Last Advance Date': r.last_advance_date ? new Date(r.last_advance_date).toLocaleDateString() : 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer Advances");
    XLSX.writeFile(wb, "Customer_Advances_Report.xlsx");
  };

  const handleExportPDF = () => {
    if (!filteredData || filteredData.length === 0) return;
    const doc = new jsPDF();
    doc.text("Customer Advances Report", 14, 15);
    const tableData = filteredData.map((r: any) => [
      r.customer_name,
      r.dse_name || 'Unassigned',
      formatCurrency(parseFloat(r.total_advance_balance || 0)),
      r.advance_count,
      r.last_advance_date ? new Date(r.last_advance_date).toLocaleDateString() : 'N/A'
    ]);
    (doc as any).autoTable({
      head: [['Customer', 'Sales Rep', 'Total Balance', 'No. of Advances', 'Last Advance Date']],
      body: tableData,
      startY: 20
    });
    doc.save("Customer_Advances_Report.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-4 rounded-xl border border-border-subtle bg-white shadow-sm flex flex-col md:flex-row gap-4 items-end justify-between">
        
        <div className="flex flex-wrap gap-4 items-end flex-1">
          <div className="relative w-64">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-ink-500" size={15} />
              <input 
                type="text" 
                placeholder="Search customer or DSE..." 
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                className="w-full bg-surface border border-border-subtle rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand-400"
              />
            </div>
          </div>

          <div className="w-40">
            <Label>Start Date</Label>
            <input 
              type="date"
              className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          
          <div className="w-40">
            <Label>End Date</Label>
            <input 
              type="date"
              className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>

          <div className="w-48">
            <Label>Sales Rep (DSE)</Label>
            <select 
              className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
              value={dseId}
              onChange={e => setDseId(e.target.value)}
            >
              <option value="">All Sales Reps</option>
              {dses?.data?.map((d: any) => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              )) || dses?.map((d: any) => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors border border-emerald-200">
            <Download size={16} /> Excel
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-sm font-medium transition-colors border border-rose-200">
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      <div className="glass-card bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <DataTable columns={columns} data={filteredData} isLoading={isLoading} hideSearchBar />
      </div>
    </div>
  );
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-xs font-medium text-ink-600 mb-1.5">{children}</label>
);
