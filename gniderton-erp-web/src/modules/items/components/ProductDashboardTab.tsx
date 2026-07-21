import { useProductDashboard } from '../hooks'
import { DataTable } from '@/components/shared/DataTable'
import { formatCurrency, formatDate } from '@/lib/utils'

function Card({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`rounded-lg border border-border bg-card text-card-foreground shadow-sm ${className}`}>{children}</div>
}
function CardHeader({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>
}
function CardTitle({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <h3 className={`font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
}
function CardContent({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>
}

export function ProductDashboardTab({ productId }: { productId: string | number }) {
  const { data: dashboard, isLoading } = useProductDashboard(productId)

  if (isLoading) {
    return <div className="p-8 text-center text-ink-500 animate-pulse">Loading dashboard data...</div>
  }

  if (!dashboard) {
    return <div className="p-8 text-center text-ink-500">Failed to load dashboard data.</div>
  }

  const { product, analytics, inventory, history } = dashboard

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-ink-500">Total Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-figures">{inventory?.total_stock || 0}</div>
            <p className="text-xs text-ink-500 mt-1">Across {inventory?.batch_count || 0} active batches</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-ink-500">Sales (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-figures">{analytics?.monthly_qty || 0}</div>
            <p className="text-xs text-ink-500 mt-1">MoM Growth: {analytics?.growth?.mom_pct || 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-ink-500">Return Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono-figures ${(analytics?.return_rate_pct || 0) > 0 ? 'text-danger-600' : ''}`}>
              {analytics?.return_rate_pct || 0}%
            </div>
            <p className="text-xs text-ink-500 mt-1">Of shipped qty</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-ink-500">Avg Selling Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-figures">{formatCurrency(analytics?.avg_sales_rate || 0)}</div>
            <p className="text-xs text-ink-500 mt-1">Margin: {analytics?.margin_pct || 0}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top Customers */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Top Customers (All Time)</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable 
              data={analytics?.top_customers || []}
              columns={[
                { accessorKey: 'customer_name', header: 'Customer' },
                { accessorKey: 'total_qty', header: 'Total Qty', cell: c => <span className="font-mono-figures">{c.getValue() as number}</span> },
                { accessorKey: 'total_value', header: 'Value', cell: c => formatCurrency(c.getValue() as number) },
              ]}
            />
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Recent Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable 
              data={history?.purchases || []}
              columns={[
                { accessorKey: 'invoice_date', header: 'Date', cell: c => formatDate(c.getValue() as string) },
                { accessorKey: 'vendor_name', header: 'Vendor' },
                { accessorKey: 'qty', header: 'Qty', cell: c => <span className="font-mono-figures">{c.getValue() as number}</span> },
              ]}
            />
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable 
              data={history?.sales || []}
              columns={[
                { accessorKey: 'invoice_date', header: 'Date', cell: c => formatDate(c.getValue() as string) },
                { accessorKey: 'customer_name', header: 'Customer' },
                { accessorKey: 'qty', header: 'Qty', cell: c => <span className="font-mono-figures">{c.getValue() as number}</span> },
              ]}
            />
          </CardContent>
        </Card>

        {/* Return History */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Recent Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable 
              data={history?.returns || []}
              columns={[
                { accessorKey: 'return_date', header: 'Date', cell: c => formatDate(c.getValue() as string) },
                { accessorKey: 'customer_name', header: 'Customer' },
                { accessorKey: 'qty', header: 'Qty', cell: c => <span className="font-mono-figures text-danger-600">{c.getValue() as number}</span> },
                { accessorKey: 'reason', header: 'Reason' },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
