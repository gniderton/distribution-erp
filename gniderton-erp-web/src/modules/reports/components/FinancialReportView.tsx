import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../api'
import { DataTable } from '@/components/shared/DataTable'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, formatCurrency } from '@/lib/utils'

type FinancialReportType = 'pnl' | 'balanceSheet' | 'cashFlow'

interface FinancialReportViewProps {
  type: FinancialReportType
}

export function FinancialReportView({ type }: FinancialReportViewProps) {
  // P&L Filters
  const [fy, setFy] = useState<string>('2026')
  const [quarter, setQuarter] = useState<string>('')
  const [month, setMonth] = useState<string>('')

  // Determine which API to call
  const { data, isLoading, error } = useQuery({
    queryKey: ['financial-report', type, fy, quarter, month],
    queryFn: () => {
      if (type === 'pnl') return reportsApi.profitAndLoss({ fy, quarter, month })
      if (type === 'balanceSheet') return reportsApi.balanceSheet()
      if (type === 'cashFlow') return reportsApi.cashFlow()
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

  // ---- RENDER LOGIC FOR FLAT TABLES (Cash Flow) ----
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>
  if (error) return <div className="p-4 text-red-600 bg-red-50 rounded-lg">Failed to load report data.</div>

  let reportData = Array.isArray(data) ? data : data?.data || data?.results || []
  
  if (type === 'cashFlow' && data?.summary) {
    reportData = [{
      inflow: formatCurrency(data.summary.total_inflow),
      outflow: formatCurrency(data.summary.total_outflow),
      net_cash_flow: formatCurrency(data.summary.net_cash_flow)
    }]
  }

  if (!reportData || reportData.length === 0) {
    return <div className="p-12 text-center text-ink-500 bg-surface rounded-lg">No data available for this report.</div>
  }

  // Derive columns from the first object
  const firstRow = reportData[0] || {}
  const columns = Object.keys(firstRow).map(key => ({
    header: key.replace(/_/g, ' ').toUpperCase(),
    accessorKey: key
  }))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
        <h3 className="text-lg font-display font-medium text-ink-900">
          Cash Flow Statement
        </h3>
        <button className="px-3 py-1.5 text-sm font-medium text-ink-700 bg-white border border-border-subtle rounded hover:bg-surface transition">
          Export CSV
        </button>
      </div>
      
      <div className="rounded-xl overflow-hidden border border-border-subtle bg-white">
        <DataTable 
          data={reportData} 
          columns={columns} 
        />
      </div>
    </div>
  )
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
