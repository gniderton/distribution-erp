import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  ComposedChart, Area, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts'
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, Target, UserCheck, Award, 
  Calendar, Map, Clock, ArrowUpRight, ArrowDownRight, Package, AlertCircle
} from 'lucide-react'
import { api } from '@/lib/axios'
import { reportsApi } from '../api'
import { StatCard } from '@/components/shared/StatCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { Select } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'

export function DseDashboardView() {
  const [selectedDseId, setSelectedDseId] = useState<string>('')

  // 1. Fetch DSE List
  const { data: employees = [], isLoading: isEmployeesLoading } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => api.get('/api/employees').then(r => r.data)
  })

  // Set default selection if none selected
  useMemo(() => {
    if (!selectedDseId && employees.length > 0) {
      setSelectedDseId(employees[0].id || employees[0].employee_id)
    }
  }, [employees, selectedDseId])

  // 2. Fetch Dashboard Data
  const { data, isLoading: isDashboardLoading, error } = useQuery({
    queryKey: ['dse-dashboard', selectedDseId],
    queryFn: () => selectedDseId ? reportsApi.employeeDashboard(selectedDseId) : null,
    enabled: !!selectedDseId,
    refetchInterval: 30000 // auto-refresh every 30s
  })

  if (isEmployeesLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
  
  const m = data?.metrics?.month || {}
  const fy = data?.metrics?.fy || {}
  const p = data?.productivity || {}
  
  // Calculate Points (Goal Met Days)
  let pts = 0;
  let metDays = 0;
  (data?.daily_trend || []).forEach((d: any) => { 
    if (d.route_receivables > 0 && d.collections >= (d.route_receivables * 0.3)) { 
      pts += 20; 
      metDays++; 
    } 
  });

  const sG = parseFloat(data?.metrics?.growth_sales_pct || 0);
  const cG = parseFloat(data?.metrics?.growth_collection_pct || 0);

  // Ageing Data prep
  const a = data?.ageing || {};
  const totalAgeing = (a["0-30 Days"] || 0) + (a["31-60 Days"] || 0) + (a["61+ Days"] || 0);
  const p1 = totalAgeing ? ((a["0-30 Days"] || 0) / totalAgeing) * 100 : 0;
  const p2 = totalAgeing ? ((a["31-60 Days"] || 0) / totalAgeing) * 100 : 0;
  const p3 = totalAgeing ? ((a["61+ Days"] || 0) / totalAgeing) * 100 : 0;

  return (
    <div className="space-y-6">
      
      {/* HEADER & SELECTOR */}
      <div className="glass-card p-5 rounded-xl border border-[#e6e9ee] bg-white shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between w-full">
        <div>
          <h2 className="text-xl font-bold text-ink-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-600" />
            Executive Performance Overview
          </h2>
          <p className="text-sm text-ink-500 mt-1">Live metrics, targets, and sales analytics.</p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row gap-3 items-center bg-surface px-4 py-2 rounded-xl border border-[#e6e9ee] w-full sm:w-80">
            <UserCheck size={16} className="text-ink-500" />
            <Select 
              value={selectedDseId} 
              onChange={e => setSelectedDseId(e.target.value)}
              className="border-0 shadow-none focus:ring-0 px-0 py-1 bg-transparent text-sm font-semibold w-full"
            >
              {employees.map((emp: any) => (
                <option key={emp.id || emp.employee_id} value={emp.id || emp.employee_id}>
                  {emp.full_name || emp.employee_name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {isDashboardLoading ? (
        <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : error ? (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg border border-red-200">Failed to load analytics data for the selected executive.</div>
      ) : !data ? (
        <div className="p-12 text-center text-ink-500 bg-surface rounded-xl border border-border-subtle">No dashboard data available.</div>
      ) : (
        <>
          {/* PRODUCTIVITY PILLS */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-success-50 text-success-700 px-3 py-1.5 rounded-lg border border-success-200 text-sm font-medium">
              <Target size={14} />
              Goal Met: {metDays} Days
            </div>
            <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 text-sm font-medium">
              <Users size={14} />
              New Customers (Month): {p.new_customers_this_month || 0}
            </div>
            <div className="text-xs text-ink-500 ml-auto flex items-center gap-1">
              <Clock size={12} /> Last Sync: {new Date().toLocaleTimeString()}
            </div>
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-white p-5 rounded-xl border border-[#e6e9ee] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">Net Sales</div>
              <div className="text-2xl font-bold text-ink-900 mb-2">{formatCurrency(m.net_sales_taxable || 0)}</div>
              <div className={`text-xs flex items-center gap-1 font-medium ${sG >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {sG >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                {Math.abs(sG)}% MoM
              </div>
              <div className="mt-3 pt-3 border-t border-border-subtle text-xs text-ink-500">
                FY Total: <span className="font-semibold text-ink-900">{formatCurrency(fy.net_sales_taxable || 0)}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#e6e9ee] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">Collections</div>
              <div className="text-2xl font-bold text-ink-900 mb-2">{formatCurrency(m.collection || 0)}</div>
              <div className={`text-xs flex items-center gap-1 font-medium ${cG >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {cG >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                {Math.abs(cG)}% MoM
              </div>
              <div className="mt-3 pt-3 border-t border-border-subtle text-xs text-ink-500">
                FY Total: <span className="font-semibold text-ink-900">{formatCurrency(fy.collection || 0)}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-fuchsia-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ring-1 ring-fuchsia-100">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-fuchsia-50 rounded-full blur-xl opacity-50"></div>
              <div className="text-xs font-semibold text-fuchsia-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Award size={14}/> Achieved Points</div>
              <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-purple-600 mb-2 drop-shadow-sm">{pts}</div>
              <div className="text-xs font-medium text-fuchsia-600">Month Incentive</div>
              <div className="mt-3 pt-3 border-t border-fuchsia-100 text-xs text-ink-500">
                Performance Goal: <span className="font-semibold text-ink-900">30%</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#e6e9ee] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">Market Coverage</div>
              <div className="text-2xl font-bold text-ink-900 mb-2">{p.market_coverage_pct || 0}%</div>
              <div className="text-xs font-medium text-brand-600">Active: {p.active_customers || 0}</div>
              <div className="mt-3 pt-3 border-t border-border-subtle text-xs text-ink-500">
                Assigned: <span className="font-semibold text-ink-900">{p.total_assigned_customers || 0}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#e6e9ee] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">Avg Credit Days</div>
              <div className="text-2xl font-bold text-ink-900 mb-2">{m.avg_credit_days || 0}</div>
              <div className="text-xs font-medium text-success-600">Healthy Pace</div>
              <div className="mt-3 pt-3 border-t border-border-subtle text-xs text-ink-500">
                FY Avg: <span className="font-semibold text-ink-900">{fy.avg_credit_days || 0}d</span>
              </div>
            </div>

          </div>

          {/* TREND CHART & TOP CUSTOMERS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-white border border-[#e6e9ee] rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2"><TrendingUp size={16} className="text-brand-500" /> Revenue & Collection Trend</span>
              </h3>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.daily_trend || []} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis yAxisId="left" tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    
                    <RechartsTooltip 
                      formatter={(value: any, name: string) => [formatCurrency(Number(value)), name]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    
                    <Area yAxisId="left" type="monotone" dataKey="sales" name="Sales" fill="rgba(63, 185, 80, 0.1)" stroke="#3fb950" strokeWidth={2} />
                    <Line yAxisId="left" type="monotone" dataKey="collections" name="Collection" stroke="#2188ff" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line yAxisId="right" type="step" dataKey="route_receivables" name="Route Debt" stroke="#8b949e" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-[#e6e9ee] rounded-xl shadow-sm p-5 flex flex-col">
              <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2"><UserCheck size={16} className="text-amber-500" /> Top 10 Customers (Month)</h3>
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[340px]">
                {(data.top_customers || []).map((c: any, i: number) => (
                  <div key={i} className="flex justify-between items-center pb-3 border-b border-border-subtle last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-6 h-6 rounded-full bg-surface text-ink-500 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                      <p className="text-xs font-medium text-ink-900 truncate">{c.customer_name}</p>
                    </div>
                    <div className="font-bold text-xs text-ink-900 shrink-0 ml-3">{formatCurrency(c.taxable_sales)}</div>
                  </div>
                ))}
                {(!data.top_customers || data.top_customers.length === 0) && (
                  <div className="text-sm text-ink-500 text-center py-10">No customer data available.</div>
                )}
              </div>
            </div>

          </div>

          {/* LOWER SECTION: BRANDS, OVERDUE, AGEING */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Brand Sales */}
            <div className="bg-white border border-[#e6e9ee] rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2"><Package size={16} className="text-indigo-500" /> Brand Sales Mix</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.brand_sales || []} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                    <XAxis type="number" tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis dataKey="brand_name" type="category" tick={{ fontSize: 11, fill: '#4b5563' }} width={80} />
                    <RechartsTooltip 
                      formatter={(value: any) => [formatCurrency(Number(value)), 'Sales']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                    />
                    <Bar dataKey="taxable_sales" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Overdue Focus */}
            <div className="bg-white border border-[#e6e9ee] rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2"><AlertCircle size={16} className="text-danger-500" /> Overdue Recovery Focus</h3>
              <div className="overflow-y-auto pr-2 space-y-3 max-h-[250px]">
                {(data.overdue_focus || []).map((c: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-surface border border-border-subtle">
                    <div className="truncate pr-3">
                      <p className="text-xs font-semibold text-ink-900 truncate">{c.customer_name}</p>
                      <p className="text-[10px] text-danger-600 font-medium mt-0.5">{c.oldest_invoice_days} days overdue</p>
                    </div>
                    <div className="font-bold text-sm text-danger-600 shrink-0">{formatCurrency(c.overdue_amount)}</div>
                  </div>
                ))}
                {(!data.overdue_focus || data.overdue_focus.length === 0) && (
                  <div className="text-sm text-ink-500 text-center py-10">No overdue accounts. Great job!</div>
                )}
              </div>
            </div>

            {/* Ageing & Coverage */}
            <div className="bg-white border border-[#e6e9ee] rounded-xl shadow-sm p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2"><Calendar size={16} className="text-blue-500" /> Receivables Ageing</h3>
                
                {/* Custom Ageing Bar */}
                <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface border border-border-subtle mb-4">
                  <div style={{ width: `${p1}%` }} className="h-full bg-success-500 transition-all duration-500" />
                  <div style={{ width: `${p2}%` }} className="h-full bg-amber-400 transition-all duration-500" />
                  <div style={{ width: `${p3}%` }} className="h-full bg-danger-500 transition-all duration-500" />
                </div>

                {/* Legend */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-success-500"></div><span className="text-ink-600">0-30 Days</span></div>
                    <span className="font-bold text-ink-900">{formatCurrency(a["0-30 Days"] || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-amber-400"></div><span className="text-ink-600">31-60 Days</span></div>
                    <span className="font-bold text-ink-900">{formatCurrency(a["31-60 Days"] || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-danger-500"></div><span className="text-ink-600">61+ Days</span></div>
                    <span className="font-bold text-ink-900">{formatCurrency(a["61+ Days"] || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-border-subtle">
                <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Overall Market Coverage</div>
                <div className="text-3xl font-bold text-ink-900">{p.market_coverage_pct || 0}%</div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
