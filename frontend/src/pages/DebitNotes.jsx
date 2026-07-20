import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, RefreshCw, FileText, CheckCircle, 
  AlertCircle, ArrowLeftRight, Trash2, Send, DollarSign 
} from 'lucide-react';

export default function DebitNotes() {
  const [debitNotes, setDebitNotes] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'create'
  
  // View Details
  const [selectedNote, setSelectedNote] = useState(null);
  const [lines, setLines] = useState([]);

  // Create Form State
  const [selectedVendor, setSelectedVendor] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [dnLines, setDnLines] = useState([{ product_id: '', quantity: 1, rate: 0, reason: 'Damaged Goods' }]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [dnRes, vendorsRes, productsRes] = await Promise.all([
        fetch('/api/debit-notes'),
        fetch('/api/vendors'),
        fetch('/api/products')
      ]);

      if (dnRes.ok) {
        const json = await dnRes.json();
        setDebitNotes(json.data || json);
      }
      if (vendorsRes.ok) {
        const json = await vendorsRes.json();
        setVendors(json.data || json);
      }
      if (productsRes.ok) {
        const json = await productsRes.json();
        setProducts(json.data || json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (note) => {
    setSelectedNote(note);
    setLoading(true);
    try {
      const res = await fetch(`/api/debit-notes/${note.id}/items`);
      if (res.ok) {
        const json = await res.json();
        setLines(json.data || json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = () => {
    setDnLines([...dnLines, { product_id: '', quantity: 1, rate: 0, reason: 'Damaged Goods' }]);
  };

  const handleRemoveLine = (idx) => {
    setDnLines(dnLines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...dnLines];
    updated[index][field] = value;

    if (field === 'product_id') {
      const prod = products.find(p => p.id === parseInt(value));
      if (prod) {
        updated[index].rate = prod.purchase_rate || prod.price || 0;
      }
    }
    setDnLines(updated);
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!selectedVendor) {
      setMessage('Error: Select a supplier');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const payload = {
        vendor_id: parseInt(selectedVendor),
        invoice_number: invoiceNo,
        note_date: new Date().toISOString().split('T')[0],
        items: dnLines.map(l => ({
          product_id: parseInt(l.product_id),
          quantity: parseInt(l.quantity),
          rate: parseFloat(l.rate),
          reason: l.reason
        }))
      };

      const res = await fetch('/api/debit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setMessage('Debit Note successfully logged!');
        setDnLines([{ product_id: '', quantity: 1, rate: 0, reason: 'Damaged Goods' }]);
        setInvoiceNo('');
        setSelectedVendor('');
        fetchInitialData();
        setActiveTab('list');
      } else {
        setMessage('Error: Server failed to create Debit Note.');
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
          <h2 className="text-2xl font-bold tracking-tight">Debit Notes</h2>
          <p className="text-text-secondary text-xs mt-0.5">Manage purchase returns, rate discrepancies, and debit balances.</p>
        </div>
      </div>

      <div className="flex border-b border-border bg-white/1 px-6">
        <button
          onClick={() => { setActiveTab('list'); setSelectedNote(null); }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'list' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <FileText size={14} />
          Debit Notes List
        </button>
        <button
          onClick={() => { setActiveTab('create'); setSelectedNote(null); }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'create' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Plus size={14} />
          Create Debit Note
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-xs text-text-secondary gap-2">
          <RefreshCw className="animate-spin" size={14} />
          Loading debit records...
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'list' && !selectedNote && (
            <div className="glass-card rounded-xl overflow-hidden border border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-border">
                  <thead className="bg-background text-text-secondary font-semibold">
                    <tr>
                      <th className="p-3">Note ID</th>
                      <th className="p-3">Supplier</th>
                      <th className="p-3">Reference Inv</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Debit Value</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {debitNotes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-text-secondary italic">No Debit Notes logged.</td>
                      </tr>
                    ) : (
                      debitNotes.map((note, idx) => (
                        <tr key={idx} className="hover:bg-white/2">
                          <td className="p-3 font-semibold text-primary">DN-{note.id}</td>
                          <td className="p-3 font-medium text-text-primary">{note.vendor_name}</td>
                          <td className="p-3 font-mono">{note.invoice_number || 'N/A'}</td>
                          <td className="p-3 text-text-secondary">{note.note_date}</td>
                          <td className="p-3 text-right font-bold text-red-400">${parseFloat(note.total_amount || 0).toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => handleViewDetails(note)}
                              className="p-1 rounded bg-white/5 hover:bg-white/10 text-text-primary transition-colors inline-flex items-center justify-center"
                            >
                              <Search size={14} />
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

          {activeTab === 'list' && selectedNote && (
            <div className="space-y-4">
              <button onClick={() => setSelectedNote(null)} className="text-xs text-primary font-semibold hover:underline">
                &larr; Back to all Debit Notes
              </button>
              <div className="glass-card p-6 rounded-xl space-y-6">
                <div className="flex justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="text-lg font-bold">DN-{selectedNote.id}</h3>
                    <p className="text-xs text-text-secondary mt-1">Supplier: {selectedNote.vendor_name}</p>
                    <p className="text-xs text-text-secondary">Ref Invoice: {selectedNote.invoice_number || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-text-secondary">Total Value</span>
                    <p className="text-xl font-bold text-red-400">${parseFloat(selectedNote.total_amount || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-left text-xs divide-y divide-border">
                    <thead className="bg-background text-text-secondary">
                      <tr>
                        <th className="p-3">Product</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 text-right">Rate</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3 text-right">Net Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {lines.map((l, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-medium">{l.product_name || `Product ID: ${l.product_id}`}</td>
                          <td className="p-3 text-right">{l.quantity}</td>
                          <td className="p-3 text-right">${parseFloat(l.rate).toFixed(2)}</td>
                          <td className="p-3 text-text-secondary">{l.reason || 'Damaged Goods'}</td>
                          <td className="p-3 text-right font-semibold">${(l.quantity * l.rate).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateNote} className="glass-card p-6 rounded-xl space-y-6">
              {message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 text-xs ${
                  message.startsWith('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-secondary/10 text-secondary border border-secondary/20'
                }`}>
                  {message.startsWith('Error') ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                  {message}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Select Vendor</label>
                  <select
                    value={selectedVendor}
                    onChange={e => setSelectedVendor(e.target.value)}
                    required
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.vendor_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Reference Invoice Number</label>
                  <input
                    type="text"
                    required
                    value={invoiceNo}
                    onChange={e => setInvoiceNo(e.target.value)}
                    placeholder="e.g. INV-9284"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-text-secondary uppercase">Return Line Items</h4>
                <div className="space-y-3">
                  {dnLines.map((line, idx) => (
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
                      <div className="w-44 space-y-1">
                        <label className="text-[9px] text-text-secondary uppercase">Reason</label>
                        <select
                          value={line.reason}
                          onChange={e => handleLineChange(idx, 'reason', e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary text-text-primary"
                        >
                          <option>Damaged Goods</option>
                          <option>Rate Mismatch</option>
                          <option>Short Delivery</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={dnLines.length === 1}
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
                Generate Debit Note
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
