import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Vendors from './pages/Vendors.jsx';
import Inventory from './pages/Inventory.jsx';
import DebitNotes from './pages/DebitNotes.jsx';
import Items from './pages/Items.jsx';
import SalesOrders from './pages/SalesOrders.jsx';
import Invoices from './pages/Invoices.jsx';
import Loans from './pages/Loans.jsx';
import Reports from './pages/Reports.jsx';
import HR from './pages/HR.jsx';
import GST from './pages/GST.jsx';
import Settings from './pages/Settings.jsx';
import Migration from './pages/Migration.jsx';

// Simple Page Stubs
function PlaceholderPage({ title }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      </div>
      <div className="glass-card p-6 rounded-xl space-y-4">
        <p className="text-text-secondary text-sm">
          Welcome to the {title} page. This module will serve as the functional replica of the corresponding Appsmith panel.
        </p>
        <div className="h-64 border border-dashed border-border rounded-lg flex items-center justify-center text-xs text-text-secondary">
          Content placeholder for {title}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
          <p className="text-text-secondary text-xs mt-0.5">Welcome back, here is what is happening today.</p>
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { name: 'Total Sales', value: '$12,450', change: '+12% from last week', color: 'border-l-primary' },
          { name: 'Active Orders', value: '28', change: '4 pending dispatch', color: 'border-l-secondary' },
          { name: 'Pending Payables', value: '$8,210', change: '3 vendors due', color: 'border-l-amber-500' },
          { name: 'GST Summary', value: 'Ready', change: 'GSTR-1 status clean', color: 'border-l-indigo-500' },
        ].map((stat, i) => (
          <div key={i} className={`glass-card p-4 rounded-xl border-l-4 ${stat.color}`}>
            <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">{stat.name}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
            <p className="text-[10px] text-text-secondary mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6 rounded-xl space-y-3">
          <h3 className="font-semibold text-sm">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { text: 'New GRN saved for VOLGA FOODS', time: '10m ago' },
              { text: 'Sales order GSO-26-8422 approved', time: '1h ago' },
              { text: 'Cheque clearing initiated - AXIS', time: '3h ago' },
            ].map((act, i) => (
              <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-border/40 last:border-0">
                <span className="text-text-primary">{act.text}</span>
                <span className="text-text-secondary">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl space-y-3">
          <h3 className="font-semibold text-sm">Active System Checks</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span>Database Connection (Supabase)</span>
              <span className="text-secondary font-medium">Connected</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Backend API (Render)</span>
              <span className="text-secondary font-medium">Online</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Bank inbound listeners</span>
              <span className="text-primary font-medium">Listening</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border px-6 flex items-center justify-between glass-panel sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <span className="text-xs text-text-secondary font-medium">Production Environment</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
            <span className="text-[10px] text-text-secondary font-medium">API Connected</span>
          </div>
        </header>

        {/* Dynamic Pages */}
        <div className="flex-grow p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/debit-notes" element={<DebitNotes />} />
            <Route path="/items" element={<Items />} />
            <Route path="/sales-orders" element={<SalesOrders />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/customers" element={<PlaceholderPage title="Customer Directory" />} />
            <Route path="/supply-chain" element={<PlaceholderPage title="Supply Chain Management" />} />
            <Route path="/credit-notes" element={<PlaceholderPage title="Credit Notes" />} />
            <Route path="/transactions" element={<PlaceholderPage title="Transactions & Ledgers" />} />
            <Route path="/cheques" element={<PlaceholderPage title="Cheque Management" />} />
            <Route path="/gst" element={<GST />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/assets" element={<PlaceholderPage title="Asset Management" />} />
            <Route path="/settlements" element={<PlaceholderPage title="Payment Settlement" />} />
            <Route path="/hr" element={<HR />} />
            <Route path="/incentives" element={<PlaceholderPage title="Incentives Engine" />} />
            <Route path="/letterhead" element={<PlaceholderPage title="Letterhead Editor" />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/migration" element={<Migration />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
