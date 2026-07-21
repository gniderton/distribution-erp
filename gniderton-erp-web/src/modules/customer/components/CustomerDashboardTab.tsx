import { useCustomerDashboard } from '../hooks'
import { DataTable } from '@/components/shared/DataTable'
import { formatCurrency, formatDate } from '@/lib/utils'
import { IndianRupee, Activity, Users, ShoppingCart, Percent } from 'lucide-react'

// Beautiful Glassmorphic Card
function Card({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`rounded-xl border border-white/20 bg-white/50 backdrop-blur-md shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md ${className}`}>
      {children}
    </div>
  )
}
function CardHeader({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`flex flex-col space-y-1.5 p-5 border-b border-white/40 bg-white/30 ${className}`}>{children}</div>
}
function CardTitle({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <h3 className={`font-semibold leading-none tracking-tight flex items-center gap-2 ${className}`}>{children}</h3>
}
function CardContent({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>
}

function KpiWidget({ title, value, subtitle, icon: Icon, gradient }: { title: string, value: string | number, subtitle?: string, icon: any, gradient: string }) {
  return (
    <div className={`relative rounded-xl overflow-hidden p-6 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${gradient}`}>
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <span className="font-medium text-white/80">{title}</span>
          <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="mt-auto">
          <div className="text-3xl font-bold font-mono-figures mb-1">{value}</div>
          {subtitle && <div className="text-sm text-white/70 font-medium">{subtitle}</div>}
        </div>
      </div>
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
    </div>
  )
}

export function CustomerDashboardTab({ customerId }: { customerId: string | number }) {
  const { data: dashboard, isLoading } = useCustomerDashboard(customerId)

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        <div className="text-brand-600 font-medium animate-pulse">Loading amazing analytics...</div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="p-12 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <Activity className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-ink-900 mb-1">No Data Available</h3>
        <p className="text-ink-500 max-w-sm">We couldn't load the analytics for this customer.</p>
      </div>
    )
  }

  const { metrics, recent_activity, brand_sales_fy } = dashboard

  return (
    <div className="space-y-6 py-2">
      {/* KPIs Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiWidget 
          title="Total Sales (All Time)" 
          value={formatCurrency(metrics?.total_sales || 0)} 
          subtitle={`Rank #${metrics?.sales_rank || 0} of ${metrics?.total_customers_count || 0}`}
          icon={ShoppingCart}
          gradient="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
        />
        <KpiWidget 
          title="Current Balance" 
          value={formatCurrency(metrics?.current_balance || 0)} 
          subtitle={metrics?.current_balance > 0 ? 'Receivable from customer' : 'Advance or settled'}
          icon={IndianRupee}
          gradient="bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-400"
        />
        <KpiWidget 
          title="Credit Limit Utilized" 
          value={`${metrics?.limit_utilization || 0}%`} 
          subtitle={`Of ${formatCurrency(metrics?.credit_limit || 0)} limit`}
          icon={Percent}
          gradient="bg-gradient-to-br from-rose-500 via-red-500 to-orange-500"
        />
        <KpiWidget 
          title="Avg Credit Days" 
          value={metrics?.avg_credit_days || 0} 
          subtitle="Days to clear invoices"
          icon={Activity}
          gradient="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand Sales */}
        <Card className="col-span-1 border-t-4 border-t-purple-500">
          <CardHeader>
            <CardTitle className="text-ink-900"><ShoppingCart className="w-5 h-5 text-purple-500" /> Top Brands (This FY)</CardTitle>
          </CardHeader>
          <CardContent>
            {(!brand_sales_fy || brand_sales_fy.length === 0) ? (
              <div className="p-8 text-center text-ink-400">No brand sales data yet.</div>
            ) : (
              <DataTable 
                data={brand_sales_fy}
                columns={[
                  { accessorKey: 'brand_name', header: 'Brand' },
                  { accessorKey: 'taxable_sales', header: 'Sales (Taxable)', cell: c => <span className="text-ink-900 font-semibold font-mono-figures">{formatCurrency(c.getValue() as number)}</span> },
                ]}
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-1 border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle className="text-ink-900"><Activity className="w-5 h-5 text-blue-500" /> Recent Ledger Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {(!recent_activity || recent_activity.length === 0) ? (
              <div className="p-8 text-center text-ink-400">No recent activity.</div>
            ) : (
              <DataTable 
                data={recent_activity}
                columns={[
                  { accessorKey: 'date', header: 'Date', cell: c => <span className="text-ink-500">{formatDate(c.getValue() as string)}</span> },
                  { accessorKey: 'type', header: 'Type', cell: c => <span className="font-medium">{c.getValue() as string}</span> },
                  { accessorKey: 'debit_amount', header: 'Debit', cell: c => {
                    const val = c.getValue() as number
                    return val > 0 ? <span className="font-mono-figures font-bold text-rose-600">{val}</span> : '—'
                  }},
                  { accessorKey: 'credit_amount', header: 'Credit', cell: c => {
                    const val = c.getValue() as number
                    return val > 0 ? <span className="font-mono-figures font-bold text-emerald-600">{val}</span> : '—'
                  }},
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
