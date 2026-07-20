import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, RefreshCw, FileText, CheckCircle, 
  AlertCircle, Trash2, Send, DollarSign 
} from 'lucide-react';

export default function SalesOrders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'create'

  // Creation State
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [soLines, setSoLines] = useState([{ product_id: '', quantity: 1, rate: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [ordersRes, custRes, prodRes] = await Promise.all([
        fetch('/api/sales-orders'),
        fetch('/api/customers'),
        fetch('/api/products')
      ]);

      if (ordersRes.ok) {
        const json = await ordersRes.json();
        setOrders(json.data || json);
      }
      if (custRes.ok) {
        const json = await custRes.json();
        setCustomers(json.data || json);
      }
      if (prodRes.ok) {
        const json = await prodRes.json();
        setProducts(json.data || json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = () => {
    setSoLines([...soLines, { product_id: '', quantity: 1, rate: 0 }]);
  };

  const handleRemoveLine = (idx) => {
    setSoLines(soLines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...soLines];
    updated[index][field] = value;

    if (field === 'product_id') {
      const prod = products.find(p => p.id === parseInt(value));
      if (prod) {
        updated[index].rate = prod.distributor_rate || prod.retail_rate || prod.price || 0;
      }
    }
    setSoLines(updated);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setMessage('Error: Select a customer');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const payload = {
        customer_id: parseInt(selectedCustomer),
        order_date: new Date().toISOString().split('T')[0],
        items: soLines.map(l => ({
          product_id: parseInt(l.product_id),
          quantity: parseInt(l.quantity),
          rate: parseFloat(l.rate)
        }))
      };

      const res = await fetch('/api/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setMessage('Sales Order successfully drafted!');
        setSoLines([{ product_id: '', quantity: 1, rate: 0 }]);
        setSelectedCustomer('');
        fetchInitialData();
        setActiveTab('list');
      } else {
        setMessage('Error: Server failed to submit Sales Order.');
      }
    } catch (e) {
      console.error(e);
      setMessage('Error: Connection failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sales Orders</h2>
          <p className="text-text-secondary text-xs mt-0.5">Manage customer purchases, sales drafts, and dispatch tracking.</p>
        </div>
      </div>

      <div className="flex border-b border-border bg-white/1 px-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'list' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <FileText size={14} />
          Sales Orders List
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'create' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Plus size={14} />
          Draft New Order
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-xs text-text-secondary gap-2">
          <RefreshCw className="animate-spin" size={14} />
          Loading orders...
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'list' && (
            <div className="glass-card rounded-xl overflow-hidden border border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-border">
                  <thead className="bg-background text-text-secondary font-semibold">
                    <tr>
                      <th className="p-3">Order Number</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Order Date</th>
                      <th className="p-3 text-right">Items</th>
                      <th className="p-3 text-right">Total Amount</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-text-secondary italic">No sales orders drafted.</td>
                      </tr>
                    ) : (
                      orders.map((o, idx) => (
                        <tr key={idx} className="hover:bg-white/2">
                          <td className="p-3 font-semibold text-primary">{o.order_number || `SO-${o.id}`}</td>
                          <td className="p-3 font-medium text-text-primary">{o.customer_name || 'Generic Customer'}</td>
                          <td className="p-3 text-text-secondary">{o.order_date}</td>
                          <td className="p-3 text-right font-medium">{o.item_count || 1}</td>
                          <td className="p-3 text-right font-bold">${parseFloat(o.total_amount || 0).toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              o.status === 'Dispatched' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'
                            }`}>
                              {o.status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateOrder} className="glass-card p-6 rounded-xl space-y-6">
              {message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 text-xs ${
                  message.startsWith('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-secondary/10 text-secondary border border-secondary/20'
                }`}>
                  {message.startsWith('Error') ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                  {message}
                </div>
              )}
              <div className="space-y-1 max-w-sm">
                <label className="text-[10px] text-text-secondary uppercase font-semibold">Select Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={e => setSelectedCustomer(e.target.value)}
                  required
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.customer_name || c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-text-secondary uppercase">Order Line Items</h4>
                <div className="space-y-3">
                  {soLines.map((line, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row items-end gap-3 p-3 rounded-lg bg-background border border-border">
                      <div className="flex-grow space-y-1">
                        <label className="text-[9px] text-text-secondary uppercase">Product</label>
                        <select
                          value={line.product_id}
                          onChange={e => handleLineChange(idx, 'product_id', e.target.value)}
                          required
                          className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary text-text-primary"
                        >
                          <option value="">-- Select Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.product_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24 space-y-1">
                        <label className="text-[9px] text-text-secondary uppercase">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={line.quantity}
                          onChange={e => handleLineChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary text-text-primary text-right"
                        />
                      </div>
                      <div className="w-28 space-y-1">
                        <label className="text-[9px] text-text-secondary uppercase">Rate ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={line.rate}
                          onChange={e => handleLineChange(idx, 'rate', e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary text-text-primary text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={soLines.length === 1}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-white/5 text-xs font-medium text-text-primary transition-colors mt-2"
                >
                  <Plus size={14} />
                  Add Line Item
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2.5 rounded-lg transition-colors shadow-md shadow-primary/20 disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                Generate Sales Order
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
