import { useProductDashboard } from '../hooks'
import { DataTable } from '@/components/shared/DataTable'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Package, TrendingUp, RotateCcw, IndianRupee, Users, ShoppingCart, Activity } from 'lucide-react'

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

function KpiWidget({ title, value, subtitle, icon: Icon, colorClass }: { title: string, value: string | number, subtitle?: string, icon: any, colorClass: string }) {
  return (
    <div className={`relative rounded-xl overflow-hidden p-6 bg-white border border-border-subtle shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md`}>
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <span className="font-medium text-ink-600">{title}</span>
          <div className={`p-2 rounded-lg bg-surface border border-border-subtle ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-auto">
          <div className="text-3xl font-bold font-mono-figures mb-1 text-ink-900">{value}</div>
          {subtitle && <div className="text-sm text-ink-500 font-medium">{subtitle}</div>}
        </div>
      </div>
    </div>
  )
}

export function ProductDashboardTab({ productId }: { productId: string | number }) {
  const { data: dashboard, isLoading } = useProductDashboard(productId)

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
        <p className="text-ink-500 max-w-sm">We couldn't load the analytics for this product. It might be new or lacking transaction history.</p>
      </div>
    )
  }

  const { product, analytics, inventory, history } = dashboard

  return (
    <div className="space-y-6 py-2">
      {/* KPIs Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiWidget 
          title="Total Stock" 
          value={inventory?.total_stock || 0} 
          subtitle={`Across ${inventory?.batch_count || 0} active batches`}
          icon={Package}
          colorClass="text-brand-600"
        />
        <KpiWidget 
          title="Sales (This Month)" 
          value={analytics?.monthly_qty || 0} 
          subtitle={`MoM Growth: ${analytics?.growth?.mom_pct || 0}%`}
          icon={TrendingUp}
          colorClass="text-sky-600"
        />
        <KpiWidget 
          title="Return Rate" 
          value={`${analytics?.return_rate_pct || 0}%`} 
          subtitle="Of shipped quantity"
          icon={RotateCcw}
          colorClass="text-rose-600"
        />
        <KpiWidget 
          title="Avg Selling Rate" 
          value={formatCurrency(analytics?.avg_sales_rate || 0)} 
          subtitle={`Margin: ${analytics?.margin_pct || 0}%`}
          icon={IndianRupee}
          colorClass="text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <Card className="col-span-1 border-t-4 border-t-purple-500">
          <CardHeader>
            <CardTitle className="text-ink-900"><Users className="w-5 h-5 text-purple-500" /> Top Customers (All Time)</CardTitle>
          </CardHeader>
          <CardContent>
            {(!analytics?.top_customers || analytics.top_customers.length === 0) ? (
              <div className="p-8 text-center text-ink-400">No customer data yet.</div>
            ) : (
              <DataTable 
                data={analytics.top_customers}
                columns={[
                  { accessorKey: 'customer_name', header: 'Customer' },
                  { accessorKey: 'total_qty', header: 'Total Qty', cell: c => <span className="font-mono-figures font-medium">{c.getValue() as number}</span> },
                  { accessorKey: 'total_value', header: 'Value', cell: c => <span className="text-ink-900 font-semibold">{formatCurrency(c.getValue() as number)}</span> },
                ]}
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        <Card className="col-span-1 border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle className="text-ink-900"><Package className="w-5 h-5 text-blue-500" /> Recent Vendor Restocks</CardTitle>
          </CardHeader>
          <CardContent>
            {(!history?.purchases || history.purchases.length === 0) ? (
              <div className="p-8 text-center text-ink-400">No purchase history yet.</div>
            ) : (
              <DataTable 
                data={history.purchases}
                columns={[
                  { accessorKey: 'invoice_date', header: 'Date', cell: c => <span className="text-ink-500">{formatDate(c.getValue() as string)}</span> },
                  { accessorKey: 'vendor_name', header: 'Vendor', cell: c => <span className="font-medium">{c.getValue() as string}</span> },
                  { accessorKey: 'qty', header: 'Qty', cell: c => <span className="font-mono-figures font-bold text-blue-600">+{c.getValue() as number}</span> },
                ]}
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="col-span-1 border-t-4 border-t-emerald-500">
          <CardHeader>
            <CardTitle className="text-ink-900"><ShoppingCart className="w-5 h-5 text-emerald-500" /> Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {(!history?.sales || history.sales.length === 0) ? (
              <div className="p-8 text-center text-ink-400">No sales history yet.</div>
            ) : (
              <DataTable 
                data={history.sales}
                columns={[
                  { accessorKey: 'invoice_date', header: 'Date', cell: c => <span className="text-ink-500">{formatDate(c.getValue() as string)}</span> },
                  { accessorKey: 'customer_name', header: 'Customer', cell: c => <span className="font-medium">{c.getValue() as string}</span> },
                  { accessorKey: 'qty', header: 'Qty', cell: c => <span className="font-mono-figures font-bold text-emerald-600">-{c.getValue() as number}</span> },
                ]}
              />
            )}
          </CardContent>
        </Card>

        {/* Return History */}
        <Card className="col-span-1 border-t-4 border-t-rose-500">
          <CardHeader>
            <CardTitle className="text-ink-900"><RotateCcw className="w-5 h-5 text-rose-500" /> Recent Returns</CardTitle>
          </CardHeader>
          <CardContent>
            {(!history?.returns || history.returns.length === 0) ? (
              <div className="p-8 text-center text-ink-400">No returns yet! (That's good)</div>
            ) : (
              <DataTable 
                data={history.returns}
                columns={[
                  { accessorKey: 'return_date', header: 'Date', cell: c => <span className="text-ink-500">{formatDate(c.getValue() as string)}</span> },
                  { accessorKey: 'customer_name', header: 'Customer', cell: c => <span className="font-medium">{c.getValue() as string}</span> },
                  { accessorKey: 'qty', header: 'Qty', cell: c => <span className="font-mono-figures font-bold text-rose-600">+{c.getValue() as number}</span> },
                  { accessorKey: 'reason', header: 'Reason', cell: c => <span className="text-sm italic">{c.getValue() as string}</span> },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
