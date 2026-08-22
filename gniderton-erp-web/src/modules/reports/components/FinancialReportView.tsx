import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../api'
import { DataTable } from '@/components/shared/DataTable'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, formatCurrency } from '@/lib/utils'
import { ChevronDown, ChevronRight, FileText, Download } from 'lucide-react'
import Papa from 'papaparse'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'

type FinancialReportType = 'pnl' | 'balanceSheet' | 'cashFlow'

interface FinancialReportViewProps {
  type: FinancialReportType
}

export function FinancialReportView({ type }: FinancialReportViewProps) {
  // P&L Filters
  const [fy, setFy] = useState<string>('2026')
  const [quarter, setQuarter] = useState<string>('')
  const [month, setMonth] = useState<string>('')

  // Cash Flow Filters
  const [cfFilterType, setCfFilterType] = useState<string>('currentFy')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  useEffect(() => {
    const today = new Date();
    if (cfFilterType === 'currentMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (cfFilterType === 'currentFy') {
      // Assuming April to March FY
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth(); // 0-11
      const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
      const firstDay = new Date(startYear, 3, 1); // April 1st
      const lastDay = new Date(startYear + 1, 2, 31); // March 31st next year
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    }
  }, [cfFilterType]);

  // Determine which API to call
  const { data, isLoading, error } = useQuery({
    queryKey: ['financial-report', type, fy, quarter, month, startDate, endDate],
    queryFn: () => {
      if (type === 'pnl') return reportsApi.profitAndLoss({ fy, quarter, month })
      if (type === 'balanceSheet') return reportsApi.balanceSheet()
      if (type === 'cashFlow') return reportsApi.cashFlow({ start_date: startDate || undefined, end_date: endDate || undefined })
      return Promise.resolve(null)
    }
  })

  // ---- RENDER LOGIC FOR PROFIT & LOSS ----
  if (type === 'pnl') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
          <h3 className="text-lg font-display font-medium text-ink-900">Profit & Loss Statement</h3>
          
          <div className="flex flex-wrap items-center gap-2">
            <select 
              value={fy} 
              onChange={e => setFy(e.target.value)}
              className="text-sm rounded-md border-border-subtle bg-surface text-ink-900 px-3 py-1.5 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="2023">FY 2023-24</option>
              <option value="2024">FY 2024-25</option>
              <option value="2025">FY 2025-26</option>
              <option value="2026">FY 2026-27</option>
              <option value="2027">FY 2027-28</option>
            </select>

            <select 
              value={quarter} 
              onChange={e => { setQuarter(e.target.value); setMonth(''); }}
              className="text-sm rounded-md border-border-subtle bg-surface text-ink-900 px-3 py-1.5 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">All Quarters</option>
              <option value="1">Q1 (Apr-Jun)</option>
              <option value="2">Q2 (Jul-Sep)</option>
              <option value="3">Q3 (Oct-Dec)</option>
              <option value="4">Q4 (Jan-Mar)</option>
            </select>

            <select 
              value={month} 
              onChange={e => { setMonth(e.target.value); setQuarter(''); }}
              className="text-sm rounded-md border-border-subtle bg-surface text-ink-900 px-3 py-1.5 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">All Months</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
            </select>

            <button className="px-3 py-1.5 text-sm font-medium text-ink-700 bg-white border border-border-subtle rounded hover:bg-surface transition">
              Export CSV
            </button>
          </div>
        </div>

        {isLoading && <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>}
        {error && <div className="p-4 text-red-600 bg-red-50 rounded-lg">Failed to load P&L data.</div>}
        
        {data && data.sections && (
          <div className="bg-white rounded-xl border border-border-subtle overflow-hidden">
            <div className="bg-surface px-6 py-3 border-b border-border-subtle">
              <span className="text-sm text-ink-500">
                Period: {new Date(data.period.start).toLocaleDateString()} to {new Date(data.period.end).toLocaleDateString()}
              </span>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Revenue Section */}
              <SectionBlock section={data.sections.revenue} />
              
              {/* COGS Section */}
              <SectionBlock section={data.sections.cogs} />

              {/* Gross Profit Summary */}
              <div className="flex justify-between items-center py-4 px-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <span className="font-display font-semibold text-emerald-900">Gross Profit</span>
                <span className="font-display font-bold text-emerald-900 text-lg">{formatCurrency(data.summary.gross_profit)}</span>
              </div>

              {/* Operating Expenses Section */}
              <SectionBlock section={data.sections.operating_expenses} />

              {/* Other Income Section */}
              <SectionBlock section={data.sections.other_income} />

              {/* Net Profit Summary */}
              <div className="flex justify-between items-center py-5 px-4 bg-brand-50 rounded-lg border border-brand-100 shadow-sm mt-4">
                <div>
                  <span className="block font-display font-bold text-brand-900 text-lg">Net Profit</span>
                  <span className="text-sm text-brand-700 mt-1">Margin: {data.summary.net_margin} | Gross Margin: {data.summary.gross_margin}</span>
                </div>
                <span className="font-display font-black text-brand-900 text-2xl">{formatCurrency(data.summary.net_profit)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---- RENDER LOGIC FOR BALANCE SHEET ----
  if (type === 'balanceSheet') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
          <h3 className="text-lg font-display font-medium text-ink-900">Balance Sheet</h3>
          <button className="px-3 py-1.5 text-sm font-medium text-ink-700 bg-white border border-border-subtle rounded hover:bg-surface transition">
            Export CSV
          </button>
        </div>

        {isLoading && <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>}
        {error && <div className="p-4 text-red-600 bg-red-50 rounded-lg">Failed to load Balance Sheet data.</div>}

        {data && data.sections && (
          <div className="bg-white rounded-xl border border-border-subtle overflow-hidden">
            <div className="bg-surface px-6 py-3 border-b border-border-subtle flex justify-between">
              <span className="text-sm text-ink-500">As of: {new Date(data.as_of).toLocaleDateString()}</span>
              {data.summary.is_balanced ? (
                <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Balanced</span>
              ) : (
                <span className="text-sm font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">Out of Balance</span>
              )}
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* ASSETS */}
              <div className="space-y-6">
                <h3 className="font-display font-semibold text-lg text-ink-900 border-b border-border-subtle pb-2">Assets</h3>
                <SectionBlock section={data.sections.assets.current_assets} />
                <SectionBlock section={data.sections.assets.fixed_assets} />
                
                <div className="flex justify-between items-center py-4 px-4 bg-emerald-50 rounded-lg border border-emerald-100 mt-4">
                  <span className="font-display font-semibold text-emerald-900">Total Assets</span>
                  <span className="font-display font-bold text-emerald-900 text-lg">{formatCurrency(data.summary.total_assets)}</span>
                </div>
              </div>

              {/* LIABILITIES & EQUITY */}
              <div className="space-y-6">
                <h3 className="font-display font-semibold text-lg text-ink-900 border-b border-border-subtle pb-2">Liabilities & Equity</h3>
                <SectionBlock section={data.sections.liabilities_equity.current_liabilities} />
                <SectionBlock section={data.sections.liabilities_equity.long_term_liabilities} />
                <SectionBlock section={data.sections.liabilities_equity.equity} />

                <div className="flex justify-between items-center py-4 px-4 bg-blue-50 rounded-lg border border-blue-100 mt-4">
                  <span className="font-display font-semibold text-blue-900">Total Liabilities & Equity</span>
                  <span className="font-display font-bold text-blue-900 text-lg">{formatCurrency(data.summary.total_liabilities_and_equity)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---- RENDER LOGIC FOR CASH FLOW ----
  if (type === 'cashFlow') {
    const generateExportData = () => {
      if (!data?.breakdown) return [];
      
      const rows: string[][] = [];
      const addSection = (title: string, sectionData: any) => {
          rows.push([title.toUpperCase(), '']);
          rows.push(['Inflows', '']);
          sectionData.inflows.forEach((i: any) => rows.push(['  ' + i.category, String(i.amount)]));
          rows.push(['Outflows', '']);
          sectionData.outflows.forEach((i: any) => rows.push(['  ' + i.category, String(i.amount)]));
          rows.push(['Net Activity', String(sectionData.net)]);
          rows.push(['', '']);
      };

      addSection('Operating Activities', data.breakdown.operating);
      addSection('Investing Activities', data.breakdown.investing);
      addSection('Financing Activities', data.breakdown.financing);

      rows.push(['SUMMARY', '']);
      rows.push(['Total Inflows', String(data.summary.total_inflow)]);
      rows.push(['Total Outflows', String(data.summary.total_outflow)]);
      rows.push(['Net Cash Flow', String(data.summary.net_cash_flow)]);

      return rows;
    }

    const handleExportCSV = () => {
      const rows = generateExportData();
      if (rows.length === 0) return;
      const csv = Papa.unparse({ fields: ["Category", "Amount"], data: rows });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `CashFlow_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }

    const dashboardRef = useRef<HTMLDivElement>(null);

    const handleExportPDF = async () => {
      if (!dashboardRef.current) return;
      const canvas = await html2canvas(dashboardRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.setFontSize(16);
      pdf.text('Cash Flow Dashboard', 14, 15);
      pdf.setFontSize(10);
      pdf.text(`Period: ${startDate || 'Start of FY'} to ${endDate || 'Present'}`, 14, 22);
      
      pdf.addImage(imgData, 'PNG', 0, 28, pdfWidth, pdfHeight);
      pdf.save(`CashFlow_${new Date().toISOString().split('T')[0]}.pdf`);
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
          <h3 className="text-lg font-display font-medium text-ink-900">Cash Flow Dashboard</h3>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 mr-2">
              <select 
                value={cfFilterType}
                onChange={e => setCfFilterType(e.target.value)}
                className="text-sm rounded-md border-border-subtle bg-surface text-ink-900 px-3 py-1.5 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="currentFy">Current FY</option>
                <option value="currentMonth">Current Month</option>
                <option value="custom">Custom Date</option>
              </select>
              
              {cfFilterType === 'custom' && (
                <>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="text-sm rounded-md border-border-subtle bg-surface text-ink-900 px-3 py-1.5 focus:ring-brand-500 focus:border-brand-500"
                  />
                  <span className="text-ink-500 text-sm">to</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="text-sm rounded-md border-border-subtle bg-surface text-ink-900 px-3 py-1.5 focus:ring-brand-500 focus:border-brand-500"
                  />
                </>
              )}
            </div>
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ink-700 bg-white border border-border-subtle rounded hover:bg-surface transition"
            >
              <FileText size={16} /> Export CSV
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-700 bg-brand-50 border border-brand-200 rounded hover:bg-brand-100 transition"
            >
              <Download size={16} /> Export PDF
            </button>
          </div>
        </div>

        {isLoading && <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>}
        {error && <div className="p-4 text-red-600 bg-red-50 rounded-lg">Failed to load Cash Flow data.</div>}

        {data && data.summary && (
          <div className="space-y-6 p-4 bg-surface" ref={dashboardRef}>
            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-center">
                <span className="text-sm font-medium text-ink-500 mb-1">Total Inflows</span>
                <span className="text-2xl font-bold text-emerald-600">{formatCurrency(data.summary.total_inflow)}</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-center">
                <span className="text-sm font-medium text-ink-500 mb-1">Total Outflows</span>
                <span className="text-2xl font-bold text-red-600">{formatCurrency(data.summary.total_outflow)}</span>
              </div>
              <div className={`bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-center ${data.summary.net_cash_flow >= 0 ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30'}`}>
                <span className="text-sm font-medium text-ink-600 mb-1">Net Cash Flow</span>
                <span className={`text-3xl font-bold ${data.summary.net_cash_flow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {formatCurrency(data.summary.net_cash_flow)}
                </span>
              </div>
            </div>

            {/* Breakdown Sections */}
            {data.breakdown && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm">
                  <h3 className="font-display font-semibold text-lg text-ink-900 border-b border-border-subtle pb-3 mb-4">Operating Activities</h3>
                  <CashFlowSection data={data.breakdown.operating} />
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm">
                  <h3 className="font-display font-semibold text-lg text-ink-900 border-b border-border-subtle pb-3 mb-4">Investing Activities</h3>
                  <CashFlowSection data={data.breakdown.investing} />
                </div>

                <div className="bg-white p-6 rounded-xl border border-border-subtle shadow-sm">
                  <h3 className="font-display font-semibold text-lg text-ink-900 border-b border-border-subtle pb-3 mb-4">Financing Activities</h3>
                  <CashFlowSection data={data.breakdown.financing} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return null;
}

// Helper component to render a section of the P&L
function SectionBlock({ section }: { section: any }) {
  if (!section || !section.lines || section.lines.length === 0) return null;

  return (
    <div>
      <h4 className="font-medium text-ink-900 mb-3 border-b border-border-subtle pb-2">{section.title}</h4>
      <div className="space-y-2">
        {section.lines.map((line: any, idx: number) => (
          <div key={idx} className="flex justify-between text-sm text-ink-700 px-2 py-1.5 hover:bg-surface rounded-md transition-colors">
            <span className="flex items-center gap-3">
              <span className="text-ink-400 font-mono text-xs">{line.code}</span>
              {line.name}
            </span>
            <span>{formatCurrency(line.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between font-medium text-ink-900 px-2 py-2 mt-2 border-t border-border-subtle">
          <span>Total {section.title}</span>
          <span>{formatCurrency(section.total)}</span>
        </div>
      </div>
    </div>
  )
}

// Helper component to render Cash Flow Sections
function CashFlowSection({ data }: { data: any }) {
  const [inflowsOpen, setInflowsOpen] = useState(true);
  const [outflowsOpen, setOutflowsOpen] = useState(true);

  if (!data) return null;

  const totalInflows = data.inflows.reduce((acc: number, item: any) => acc + item.amount, 0);
  const totalOutflows = data.outflows.reduce((acc: number, item: any) => acc + item.amount, 0);

  return (
    <div className="space-y-4">
      {/* Inflows */}
      <div className="border border-emerald-100 rounded-lg overflow-hidden bg-white">
        <button 
          onClick={() => setInflowsOpen(!inflowsOpen)}
          className="w-full flex items-center justify-between p-3 bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            {inflowsOpen ? <ChevronDown size={16} className="text-emerald-600" /> : <ChevronRight size={16} className="text-emerald-600" />}
            <span className="font-semibold text-emerald-900">Inflows</span>
          </div>
          <span className="font-bold text-emerald-700">{formatCurrency(totalInflows)}</span>
        </button>
        
        {inflowsOpen && (
          <div className="p-3 border-t border-emerald-50 bg-white">
            {data.inflows.length === 0 ? (
              <div className="text-sm text-ink-400 italic py-1">No inflows</div>
            ) : (
              <div className="space-y-2">
                {data.inflows.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm py-1.5 px-2 hover:bg-emerald-50/30 rounded transition-colors">
                    <span className="text-ink-700">{item.category}</span>
                    <span className="text-emerald-600 font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outflows */}
      <div className="border border-red-100 rounded-lg overflow-hidden bg-white">
        <button 
          onClick={() => setOutflowsOpen(!outflowsOpen)}
          className="w-full flex items-center justify-between p-3 bg-red-50/50 hover:bg-red-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            {outflowsOpen ? <ChevronDown size={16} className="text-red-600" /> : <ChevronRight size={16} className="text-red-600" />}
            <span className="font-semibold text-red-900">Outflows</span>
          </div>
          <span className="font-bold text-red-700">{formatCurrency(totalOutflows)}</span>
        </button>
        
        {outflowsOpen && (
          <div className="p-3 border-t border-red-50 bg-white">
            {data.outflows.length === 0 ? (
              <div className="text-sm text-ink-400 italic py-1">No outflows</div>
            ) : (
              <div className="space-y-2">
                {data.outflows.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm py-1.5 px-2 hover:bg-red-50/30 rounded transition-colors">
                    <span className="text-ink-700">{item.category}</span>
                    <span className="text-red-600 font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Net Section */}
      <div className={`mt-4 pt-3 border-t-2 ${data.net >= 0 ? 'border-emerald-100' : 'border-red-100'} flex justify-between items-center px-3 py-3 rounded-lg bg-surface/50`}>
        <span className="font-semibold text-ink-900">Net Activity</span>
        <span className={`font-bold text-lg ${data.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
          {formatCurrency(data.net)}
        </span>
      </div>
    </div>
  )
}
