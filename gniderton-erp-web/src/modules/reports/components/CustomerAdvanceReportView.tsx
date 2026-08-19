import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api';
import { DataTable } from '@/components/shared/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, Filter, Download, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Skeleton } from '@/components/ui/Skeleton';

export const CustomerAdvanceReportView: React.FC = () => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [dseId, setDseId] = useState('all');

  // Fetch DSEs (Sales Reps) for the filter dropdown
  const { data: dses } = useQuery({
    queryKey: ['dses'],
    queryFn: () => fetch('/api/employees?role=DSE').then(res => res.json()),
  });

  // Determine date bounds
  const getDates = () => {
    const today = new Date()
    let start = ''
    let end = today.toISOString().split('T')[0]

    if (dateFilter === 'today') {
      start = end
    } else if (dateFilter === 'this_week') {
      const firstDay = new Date(today.setDate(today.getDate() - today.getDay()))
      start = firstDay.toISOString().split('T')[0]
    } else if (dateFilter === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
    } else if (dateFilter === 'custom') {
      start = customStartDate
      end = customEndDate
    }
    return { start_date: start || undefined, end_date: end || undefined }
  }

  const dateParams = getDates()

  const { data, isLoading } = useQuery({
    queryKey: ['customer-advances', dateParams.start_date, dateParams.end_date, dseId],
    queryFn: () => reportsApi.customerAdvances({ 
      start_date: dateParams.start_date, 
      end_date: dateParams.end_date, 
      dse_id: dseId !== 'all' ? dseId : undefined 
    }),
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

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="glass-card p-4 rounded-xl border border-[#e6e9ee] bg-white shadow-sm flex flex-col xl:flex-row gap-4 items-center justify-between w-full">
        
        <div className="relative w-full xl:max-w-md">
          <Search className="absolute left-3.5 top-3 text-ink-600" size={15} />
          <input 
            type="text" 
            placeholder="Search customers or DSE..." 
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="w-full bg-surface border border-[#e6e9ee] rounded-lg pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-brand-400 text-ink-900 placeholder:text-ink-600"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center justify-end">
          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
            <Filter size={12} className="text-ink-600" />
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="bg-transparent text-xs text-ink-900 focus:outline-none pr-2 cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={customStartDate} 
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-surface border border-[#e6e9ee] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-400"
              />
              <span className="text-xs text-ink-500">to</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-surface border border-[#e6e9ee] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-400"
              />
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
            <Users size={12} className="text-ink-600" />
            <select
              value={dseId}
              onChange={e => setDseId(e.target.value)}
              className="bg-transparent text-xs text-ink-900 focus:outline-none pr-2 cursor-pointer max-w-[120px] truncate"
            >
              <option value="all">All DSEs</option>
              {dses?.data?.map((d: any) => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              )) || dses?.map((d: any) => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 ml-2">
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors border border-emerald-200">
              <Download size={14} /> Excel
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-medium transition-colors border border-rose-200">
              <Download size={14} /> PDF
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <DataTable columns={columns} data={filteredData} hideSearchBar />
      </div>
    </div>
  );
};

