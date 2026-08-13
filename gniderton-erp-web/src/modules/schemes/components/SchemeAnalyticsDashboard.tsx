import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Package, 
  Award,
  IndianRupee,
  Activity,
  FileText
} from 'lucide-react';
import { useSchemeAnalytics } from '../hooks';

interface SchemeAnalyticsDashboardProps {
  schemeId: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const StatCard = ({ title, value, subtitle, icon: Icon, colorClass }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-').replace('-100', '-600')}`} />
      </div>
    </div>
    <div>
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  </div>
);

export const SchemeAnalyticsDashboard: React.FC<SchemeAnalyticsDashboardProps> = ({ schemeId }) => {
  const { data, isLoading, error } = useSchemeAnalytics(schemeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
        <Activity className="w-5 h-5 mr-2" />
        Failed to load scheme analytics data.
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const { kpis, tiers, customers, products, dse } = data;

  return (
    <div className="space-y-6 mb-8">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Discount Given"
          value={formatCurrency(parseFloat(kpis?.total_discount || '0'))}
          subtitle="Direct cost of scheme"
          icon={IndianRupee}
          colorClass="bg-red-100 text-red-600"
        />
        <StatCard
          title="Net Scheme Revenue"
          value={formatCurrency(parseFloat(kpis?.net_revenue || '0'))}
          subtitle="Sales value of impacted items"
          icon={TrendingUp}
          colorClass="bg-green-100 text-green-600"
        />
        <StatCard
          title="Invoices Impacted"
          value={kpis?.invoices_impacted || 0}
          subtitle="Total transactions"
          icon={FileText}
          colorClass="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Top Performing Tier"
          value={tiers?.length > 0 ? tiers[0].tier_name : 'N/A'}
          subtitle="Most utilized rule"
          icon={Award}
          colorClass="bg-purple-100 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DSE Performance Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-indigo-500" />
            DSE Performance (Revenue vs Discount)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dse} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="dse_name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  yAxisId="left" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(value) => `₹${value > 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(value) => `₹${value > 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar yAxisId="left" dataKey="sales_value" name="Sales Generated" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar yAxisId="right" dataKey="discount_given" name="Discount Given" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tier Distribution Doughnut */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-indigo-500" />
            Tier Usage Breakdown
          </h3>
          <div className="h-[250px] flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tiers}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="discount_amount"
                  nameKey="tier_name"
                >
                  {tiers?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Beneficiary Customers */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-500" />
              Top Beneficiary Customers
            </h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">By Discount</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Customer</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Discount</th>
                </tr>
              </thead>
              <tbody>
                {customers?.map((c: any, i: number) => (
                  <tr key={i} className="border-b last:border-0 border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.customer_name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(parseFloat(c.net_revenue))}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(parseFloat(c.total_discount))}</td>
                  </tr>
                ))}
                {customers?.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">No customer data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Moving Products */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Package className="w-5 h-5 mr-2 text-indigo-500" />
              Top Scheme Products
            </h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">By Revenue</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Product</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {products?.map((p: any, i: number) => (
                  <tr key={i} className="border-b last:border-0 border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.product_name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{p.total_qty}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(parseFloat(p.net_revenue))}</td>
                  </tr>
                ))}
                {products?.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">No product data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
