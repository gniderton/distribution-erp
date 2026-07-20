import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, FileText, Download, CheckCircle, AlertCircle, Eye } from 'lucide-react';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sales');
      if (res.ok) {
        const json = await res.json();
        setInvoices(json.data || json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (inv) => {
    setSelectedInvoice(inv);
    setLoading(true);
    try {
      const res = await fetch(`/api/sales/invoice/${inv.id}`);
      if (res.ok) {
        const data = await res.json();
        setLines(data.lines || data.data?.lines || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(i => 
    (i.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
          <p className="text-text-secondary text-xs mt-0.5">Manage customer bills, credit balances, and download tax statements.</p>
        </div>
      </div>

      {selectedInvoice ? (
        <div className="space-y-4">
          <button onClick={() => setSelectedInvoice(null)} className="text-xs text-primary font-semibold hover:underline">
            &larr; Back to all Invoices
          </button>
          
          <div className="glass-card p-6 rounded-xl space-y-6">
            <div className="flex justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold">{selectedInvoice.invoice_number || `INV-${selectedInvoice.id}`}</h3>
                <p className="text-xs text-text-secondary mt-1">Customer: {selectedInvoice.customer_name}</p>
                <p className="text-xs text-text-secondary">Billing Date: {selectedInvoice.invoice_date}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-text-secondary block">Total Bill Amount</span>
                <span className="text-xl font-extrabold text-secondary">${parseFloat(selectedInvoice.grand_total || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-left text-xs divide-y divide-border">
                <thead className="bg-background text-text-secondary">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">GST %</th>
                    <th className="p-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-text-secondary italic">No lines details in this invoice.</td>
                    </tr>
                  ) : (
                    lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-medium">{line.product_name || `Product ID: ${line.product_id}`}</td>
                        <td className="p-3 text-right">{line.quantity}</td>
                        <td className="p-3 text-right">${parseFloat(line.rate).toFixed(2)}</td>
                        <td className="p-3 text-right">{line.tax_percent}%</td>
                        <td className="p-3 text-right font-semibold">${(line.quantity * line.rate * (1 + line.tax_percent / 100)).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass-card p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-2.5 text-text-secondary" size={16} />
              <input 
                type="text" 
                placeholder="Search invoices by customer or bill number..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-primary text-text-primary placeholder:text-text-secondary"
              />
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-xs text-text-secondary gap-2">
              <RefreshCw className="animate-spin" size={14} />
              Loading invoices...
            </div>
          ) : (
            <div className="glass-card rounded-xl overflow-hidden border border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-border">
                  <thead className="bg-background text-text-secondary font-semibold">
                    <tr>
                      <th className="p-3">Invoice Number</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Billing Date</th>
                      <th className="p-3 text-right">Items</th>
                      <th className="p-3 text-right">Tax Paid</th>
                      <th className="p-3 text-right">Bill Value</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-text-secondary italic">No invoices matched the search criteria.</td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv, idx) => (
                        <tr key={idx} className="hover:bg-white/2">
                          <td className="p-3 font-semibold text-primary">{inv.invoice_number || `INV-${inv.id}`}</td>
                          <td className="p-3 font-medium text-text-primary">{inv.customer_name}</td>
                          <td className="p-3 text-text-secondary">{inv.invoice_date}</td>
                          <td className="p-3 text-right font-medium">{inv.item_count || 1}</td>
                          <td className="p-3 text-right text-red-400">${parseFloat(inv.tax_amount || 0).toFixed(2)}</td>
                          <td className="p-3 text-right font-bold text-secondary">${parseFloat(inv.grand_total || 0).toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => handleViewInvoice(inv)}
                              className="p-1 rounded bg-white/5 hover:bg-white/10 text-text-primary transition-colors inline-flex items-center justify-center"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
