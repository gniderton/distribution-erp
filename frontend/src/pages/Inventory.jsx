import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, FileText, CheckCircle, RefreshCw, 
  Trash2, Edit, ShoppingCart, Truck, AlertCircle, Sparkles, Eye, Download, X, AlertTriangle, ArrowLeftRight
} from 'lucide-react';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('po_list'); // 'po_list', 'grn_list'
  
  // Collections State
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [grns, setGrns] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals/Drawers Visibility
  const [showPoDrawer, setShowPoDrawer] = useState(false); // drawerCreatePO
  const [showGrnModal, setShowGrnModal] = useState(false); // modalFrameGRN
  const [showViewGrnModal, setShowViewGrnModal] = useState(false); // modalViewGRN
  const [showConfirmReverseModal, setShowConfirmReverseModal] = useState(false); // modalConfirmReverse

  // Modes: 'CREATE', 'EDIT', 'VIEW'
  const [poMode, setPoMode] = useState('CREATE'); 
  const [selectedPOId, setSelectedPOId] = useState(null);
  const [poNumber, setPoNumber] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [poLines, setPoLines] = useState([]);
  const [poRemarks, setPoRemarks] = useState('');
  const [editorMessage, setEditorMessage] = useState('');
  const [submittingPo, setSubmittingPo] = useState(false);

  // GRN Creator Modal State (modalFrameGRN)
  const [grnVendorId, setGrnVendorId] = useState('');
  const [grnPoId, setGrnPoId] = useState('');
  const [grnInvoiceNo, setGrnInvoiceNo] = useState('');
  const [grnInvoiceDate, setGrnInvoiceDate] = useState('');
  const [grnLines, setGrnLines] = useState([]);
  const [submittingGrn, setSubmittingGrn] = useState(false);
  const [grnMessage, setGrnMessage] = useState('');

  // View GRN Modal State (modalViewGRN)
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [viewGrnLines, setViewGrnLines] = useState([]);
  const [reversingGrn, setReversingGrn] = useState(false);
  const [reverseMessage, setReverseMessage] = useState('');

  // Fetch initial datasets
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [posRes, grnsRes, productsRes, vendorsRes, bankRes] = await Promise.all([
        fetch('/api/purchase-orders'),
        fetch('/api/purchase-invoices'),
        fetch('/api/products'),
        fetch('/api/vendors'),
        fetch('/api/bank-accounts')
      ]);

      if (posRes.ok) {
        const json = await posRes.json();
        setPurchaseOrders(json.data || json);
      }
      if (grnsRes.ok) {
        const json = await grnsRes.json();
        setGrns(json.data || json);
      }
      if (productsRes.ok) {
        const json = await productsRes.json();
        setProducts(json.data || json);
      }
      if (vendorsRes.ok) {
        const json = await vendorsRes.json();
        setVendors(json.data || json);
      }
      if (bankRes.ok) {
        const json = await bankRes.json();
        setBankAccounts(json.data || json);
      }
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
    }
  };

  // Open PO Drawer for creating new draft
  const handleOpenCreatePO = () => {
    setPoMode('CREATE');
    setSelectedVendorId('');
    setPoLines([]);
    setPoRemarks('');
    setPoNumber('');
    setEditorMessage('');
    setShowPoDrawer(true);
  };

  // View PO details in drawer (View PO Event)
  const handleViewPO = async (po) => {
    setPoMode('VIEW');
    setSelectedPOId(po.id);
    setSelectedVendorId(po.vendor_id);
    setPoRemarks(po.remarks || '');
    setPoNumber(po.po_number || `PO-${po.id}`);
    setEditorMessage('');
    setShowPoDrawer(true);
    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}`);
      if (res.ok) {
        const details = await res.json();
        const linesData = details.lines || details.data?.lines || [];
        // Map raw database columns to PO line editing keys
        setPoLines(linesData.map(l => {
          const rate = parseFloat(l.rate || l.purchase_rate || 0);
          const qty = parseInt(l.quantity || 0);
          const sch = parseInt(l.scheme_qty || 0);
          const discPercent = parseFloat(l.discount_percent || 0);
          const gstPercent = parseFloat(l.tax_percent || l.tax_percentage || 18);
          
          const gross = qty * rate;
          const discAmt = gross * (discPercent / 100);
          const taxable = gross - discAmt;
          const gstAmt = taxable * (gstPercent / 100);
          const net = taxable + gstAmt;

          return {
            product_id: l.product_id,
            name: l.product_name || `Product ID: ${l.product_id}`,
            sku: l.product_code || 'N/A',
            rate,
            qty,
            sch,
            disc_percent: discPercent,
            gst_percent: gstPercent,
            gross,
            disc_amt: discAmt,
            taxable,
            gst_amt: gstAmt,
            net
          };
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Enable Edit Mode inside PO Drawer
  const handleEnableEditPO = () => {
    setPoMode('EDIT');
  };

  // Recalculator matching the poTable calculations
  const handleCellChange = (prodId, field, value) => {
    if (poMode === 'VIEW') return;
    const val = parseFloat(value) || 0;
    const updated = poLines.map(line => {
      if (line.product_id === prodId) {
        const qty = field === 'qty' ? parseInt(val) : line.qty;
        const sch = field === 'sch' ? parseInt(val) : line.sch;
        const discPercent = field === 'disc_percent' ? val : line.disc_percent;
        const rate = field === 'rate' ? val : line.rate;

        const gross = qty * rate;
        const discAmt = gross * (discPercent / 100);
        const taxable = gross - discAmt;
        const gstAmt = taxable * (line.gst_percent / 100);
        const net = taxable + gstAmt;

        return {
          ...line,
          qty,
          sch,
          disc_percent: discPercent,
          rate,
          gross,
          disc_amt: discAmt,
          taxable,
          gst_amt: gstAmt,
          net
        };
      }
      return line;
    });
    setPoLines(updated);
  };

  const handleAddProductToPo = (prodId) => {
    const prod = products.find(p => p.id === parseInt(prodId));
    if (!prod) return;

    if (poLines.some(l => l.product_id === prod.id)) return;

    const rate = prod.purchase_rate || prod.distributor_rate || 0;
    const gstPercent = prod.tax_percentage || 18;
    const qty = 1;
    const sch = 0;
    const discPercent = 0;
    const gross = qty * rate;
    const discAmt = gross * (discPercent / 100);
    const taxable = gross - discAmt;
    const gstAmt = taxable * (gstPercent / 100);
    const net = taxable + gstAmt;

    const newLine = {
      product_id: prod.id,
      name: prod.product_name,
      sku: prod.product_code || 'N/A',
      rate: rate,
      qty: qty,
      sch: sch,
      disc_percent: discPercent,
      gst_percent: gstPercent,
      gross: gross,
      disc_amt: discAmt,
      taxable: taxable,
      gst_amt: gstAmt,
      net: net
    };

    setPoLines([...poLines, newLine]);
  };

  const handleSavePO = async (e) => {
    e.preventDefault();
    if (!selectedVendorId) {
      setEditorMessage('Error: Supplier must be selected.');
      return;
    }
    if (poLines.length === 0) {
      setEditorMessage('Error: Add items.');
      return;
    }
    setSubmittingPo(true);
    setEditorMessage('');
    try {
      const url = poMode === 'CREATE' ? '/api/purchase-orders' : `/api/purchase-orders/${selectedPOId}`;
      const method = poMode === 'CREATE' ? 'POST' : 'PUT';

      const payload = {
        vendor_id: parseInt(selectedVendorId),
        order_date: new Date().toISOString().split('T')[0],
        remarks: poRemarks,
        items: poLines.map(l => ({
          product_id: l.product_id,
          quantity: l.qty,
          scheme_qty: l.sch,
          rate: l.rate,
          discount_percent: l.disc_percent,
          tax_percent: l.gst_percent
        }))
      };

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setEditorMessage('PO saved successfully!');
        setShowPoDrawer(false);
        fetchInitialData();
      } else {
        setEditorMessage('Error: Server database rejected transaction.');
      }
    } catch (e) {
      setEditorMessage('Error: Connection timed out.');
    } finally {
      setSubmittingPo(false);
    }
  };

  // Open GRN Modal (modalFrameGRN)
  const handleOpenCreateGRN = (po = null) => {
    setGrnMessage('');
    setGrnLines([]);
    setGrnInvoiceNo('');
    setGrnInvoiceDate(new Date().toISOString().split('T')[0]);
    if (po) {
      setGrnVendorId(po.vendor_id);
      setGrnPoId(po.id);
      loadPoForGRN(po.id);
    } else {
      setGrnVendorId('');
      setGrnPoId('');
    }
    setShowGrnModal(true);
  };

  const loadPoForGRN = async (poId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`);
      if (res.ok) {
        const details = await res.json();
        const linesData = details.lines || details.data?.lines || [];
        setGrnLines(linesData.map(l => ({
          product_id: l.product_id,
          product_name: l.product_name,
          quantity_ordered: parseInt(l.quantity || 0),
          quantity_received: parseInt(l.quantity || 0), // Default to matching PO quantity
          rate: parseFloat(l.rate || 0),
          tax_percent: parseFloat(l.tax_percent || 18)
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGrnLineQtyChange = (prodId, val) => {
    setGrnLines(grnLines.map(l => 
      l.product_id === prodId ? { ...l, quantity_received: parseInt(val) || 0 } : l
    ));
  };

  const handleCreateGRN = async (e) => {
    e.preventDefault();
    if (!grnInvoiceNo) {
      setGrnMessage('Error: Invoice number is mandatory.');
      return;
    }
    setSubmittingGrn(true);
    try {
      const payload = {
        purchase_order_id: parseInt(grnPoId),
        vendor_id: parseInt(grnVendorId),
        invoice_number: grnInvoiceNo,
        received_date: new Date().toISOString().split('T')[0],
        invoice_date: grnInvoiceDate,
        lines: grnLines.map(l => ({
          product_id: l.product_id,
          quantity: l.quantity_received,
          rate: l.rate,
          tax_percent: l.tax_percent
        }))
      };

      const res = await fetch('/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setGrnMessage('GRN generated & committed into stock successfully!');
        setTimeout(() => {
          setShowGrnModal(false);
          fetchInitialData();
        }, 1200);
      } else {
        setGrnMessage('Error: Failed to process stock inward.');
      }
    } catch (e) {
      setGrnMessage('Error: Connection failed.');
    } finally {
      setSubmittingGrn(false);
    }
  };

  // View GRN details modal (modalViewGRN)
  const handleViewGRN = async (grn) => {
    setSelectedGRN(grn);
    setShowViewGrnModal(true);
    setLoading(true);
    try {
      // Decode invoice line details
      const res = await fetch(`/api/purchase-invoices/${grn.id}`);
      if (res.ok) {
        const details = await res.json();
        setViewGrnLines(details.lines || details.data?.lines || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Reverse GRN stock (modalConfirmReverse)
  const handleReverseGRN = async () => {
    setReversingGrn(true);
    setReverseMessage('');
    try {
      const res = await fetch(`/api/purchase-invoices/${selectedGRN.id}/reverse`, {
        method: 'POST'
      });
      if (res.ok) {
        setReverseMessage('GRN stocks successfully reversed!');
        setTimeout(() => {
          setShowConfirmReverseModal(false);
          setShowViewGrnModal(false);
          fetchInitialData();
        }, 1200);
      } else {
        setReverseMessage('Error: Reversal rejected by database.');
      }
    } catch (e) {
      setReverseMessage('Error: Reversal connection failed.');
    } finally {
      setReversingGrn(false);
    }
  };

  // Grand summary values for PO Editor
  const grandGross = poLines.reduce((acc, c) => acc + c.gross, 0);
  const grandDiscount = poLines.reduce((acc, c) => acc + c.disc_amt, 0);
  const grandTaxable = poLines.reduce((acc, c) => acc + c.taxable, 0);
  const grandGst = poLines.reduce((acc, c) => acc + c.gst_amt, 0);
  const grandTotal = poLines.reduce((acc, c) => acc + c.net, 0);

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory & Procurement</h2>
          <p className="text-text-secondary text-xs mt-0.5">Manage goods receipts, catalog orders, and warehouse inward registers.</p>
        </div>
      </div>

      {/* Tab select bar */}
      <div className="flex border-b border-border bg-white/1 px-6">
        <button
          onClick={() => setActiveTab('po_list')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'po_list' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <ShoppingCart size={14} />
          Purchase Orders
        </button>
        <button
          onClick={() => setActiveTab('grn_list')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'grn_list' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Truck size={14} />
          Goods Received (GRN)
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-xs text-text-secondary gap-2">
          <RefreshCw className="animate-spin" size={14} />
          Loading warehouse data...
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* TAB 1: PURCHASE ORDERS */}
          {activeTab === 'po_list' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">Registered purchase lists</span>
                <button
                  onClick={handleOpenCreatePO}
                  className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  Create New PO
                </button>
              </div>

              <div className="glass-card rounded-xl overflow-hidden border border-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-border">
                    <thead className="bg-background text-text-secondary font-semibold">
                      <tr>
                        <th className="p-3">PO Number</th>
                        <th className="p-3">Supplier</th>
                        <th className="p-3">Order Date</th>
                        <th className="p-3 text-right">Items Qty</th>
                        <th className="p-3 text-right">Total Net</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {purchaseOrders.map((po, idx) => (
                        <tr key={idx} className="hover:bg-white/2">
                          <td className="p-3 font-semibold text-primary">{po.po_number || `PO-${po.id}`}</td>
                          <td className="p-3 font-medium text-text-primary">{po.vendor_name}</td>
                          <td className="p-3 text-text-secondary">{po.po_date?.split('T')[0] || po.order_date}</td>
                          <td className="p-3 text-right font-medium">{po.total_qty}</td>
                          <td className="p-3 text-right font-bold">${parseFloat(po.total_net || 0).toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              po.status === 'Completed' || po.status === 'Received' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'
                            }`}>
                              {po.status || 'Draft'}
                            </span>
                          </td>
                          <td className="p-3 text-center flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleViewPO(po)}
                              title="View PO"
                              className="p-1 rounded bg-white/5 hover:bg-white/10 text-text-primary transition-colors"
                            >
                              <Eye size={13} />
                            </button>
                            <button 
                              onClick={() => handleOpenCreateGRN(po)}
                              disabled={po.status === 'Received'}
                              title="Create GRN"
                              className="p-1 rounded bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/20 transition-colors disabled:opacity-40"
                            >
                              <Truck size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOODS RECEIVED */}
          {activeTab === 'grn_list' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">Inward stock invoices</span>
                <button
                  onClick={() => handleOpenCreateGRN(null)}
                  className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  Create New GRN
                </button>
              </div>

              <div className="glass-card rounded-xl overflow-hidden border border-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-border">
                    <thead className="bg-background text-text-secondary font-semibold">
                      <tr>
                        <th className="p-3">GRN ID</th>
                        <th className="p-3">Invoice Number</th>
                        <th className="p-3">Supplier</th>
                        <th className="p-3">Received Date</th>
                        <th className="p-3 text-right">Bill Value</th>
                        <th className="p-3 text-right">Tax Paid</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {grns.map((grn, idx) => (
                        <tr key={idx} className="hover:bg-white/2">
                          <td className="p-3 font-semibold text-text-primary">GRN-{grn.id}</td>
                          <td className="p-3 font-mono text-text-secondary">{grn.invoice_number || 'N/A'}</td>
                          <td className="p-3 font-medium text-text-primary">{grn.vendor_name}</td>
                          <td className="p-3 text-text-secondary">{grn.received_date?.split('T')[0] || grn.invoice_date}</td>
                          <td className="p-3 text-right font-bold text-secondary">${parseFloat(grn.grand_total || 0).toFixed(2)}</td>
                          <td className="p-3 text-right text-red-400">${parseFloat(grn.total_tax_amount || 0).toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => handleViewGRN(grn)}
                              className="p-1 rounded bg-white/5 hover:bg-white/10 text-text-primary transition-colors inline-flex items-center justify-center font-bold"
                            >
                              <Eye size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL 1: drawerCreatePO */}
      {showPoDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="glass-panel w-full max-w-5xl h-screen flex flex-col shadow-2xl border-l border-border animate-slide-in">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-white/2">
              <div>
                <h3 className="font-bold text-sm text-text-primary">
                  {poMode === 'CREATE' ? 'Draft New Purchase Order' : `${poMode} Purchase Order: ${poNumber}`}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {poMode === 'VIEW' && (
                  <button 
                    onClick={handleEnableEditPO}
                    className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold px-3 py-1.5 rounded"
                  >
                    Edit PO
                  </button>
                )}
                <button onClick={() => setShowPoDrawer(false)} className="text-text-secondary hover:text-text-primary">
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSavePO} className="flex-1 overflow-y-auto p-6 space-y-6">
              {editorMessage && (
                <div className={`p-4 rounded-lg flex items-center gap-3 text-xs ${
                  editorMessage.startsWith('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-secondary/10 text-secondary border border-secondary/20'
                }`}>
                  <AlertCircle size={16} />
                  {editorMessage}
                </div>
              )}

              {/* Vendor & Product Selection headers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Select Vendor</label>
                  <select
                    value={selectedVendorId}
                    disabled={poMode === 'VIEW'}
                    onChange={e => setSelectedVendorId(e.target.value)}
                    required
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary disabled:opacity-60"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.vendor_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Add Catalog Product</label>
                  <select
                    value=""
                    disabled={poMode === 'VIEW'}
                    onChange={e => handleAddProductToPo(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary disabled:opacity-60"
                  >
                    <option value="">-- Click product to draft --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.product_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Interactive poTable Spreadsheet */}
              <div className="border border-border rounded-xl overflow-hidden bg-background">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] divide-y divide-border">
                    <thead className="bg-white/2 text-text-secondary font-semibold">
                      <tr>
                        <th className="p-3">Item Catalog Name</th>
                        <th className="p-3 text-right w-24">Rate ($)</th>
                        <th className="p-3 text-right w-20">Qty</th>
                        <th className="p-3 text-right w-16">Sch</th>
                        <th className="p-3 text-right w-16">Disc %</th>
                        <th className="p-3 text-right w-24">Gross</th>
                        <th className="p-3 text-right w-24">Disc ($)</th>
                        <th className="p-3 text-right w-24">Taxable</th>
                        <th className="p-3 text-right w-16">GST %</th>
                        <th className="p-3 text-right w-24">GST ($)</th>
                        <th className="p-3 text-right w-28">Net Amount</th>
                        {poMode !== 'VIEW' && <th className="p-2 text-center w-10"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {poLines.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="p-8 text-center text-text-secondary italic">No products added. Use the selection dropdown above to begin catalog drafting.</td>
                        </tr>
                      ) : (
                        poLines.map((line, idx) => (
                          <tr key={idx} className="hover:bg-white/1">
                            <td className="p-3 font-semibold text-text-primary truncate max-w-[180px]">{line.name}</td>
                            <td className="p-1.5 text-right">
                              <input 
                                type="number" 
                                step="0.01"
                                disabled={poMode === 'VIEW'}
                                value={line.rate}
                                onChange={e => handleCellChange(line.product_id, 'rate', e.target.value)}
                                className="w-full bg-background/50 border border-border/80 rounded px-1.5 py-1 text-[11px] text-right text-text-primary disabled:opacity-80"
                              />
                            </td>
                            <td className="p-1.5 text-right">
                              <input 
                                type="number" 
                                disabled={poMode === 'VIEW'}
                                value={line.qty}
                                onChange={e => handleCellChange(line.product_id, 'qty', e.target.value)}
                                className="w-full bg-background/50 border border-border/80 rounded px-1.5 py-1 text-[11px] text-right text-text-primary disabled:opacity-80"
                              />
                            </td>
                            <td className="p-1.5 text-right">
                              <input 
                                type="number" 
                                disabled={poMode === 'VIEW'}
                                value={line.sch}
                                onChange={e => handleCellChange(line.product_id, 'sch', e.target.value)}
                                className="w-full bg-background/50 border border-border/80 rounded px-1.5 py-1 text-[11px] text-right text-text-primary disabled:opacity-80"
                              />
                            </td>
                            <td className="p-1.5 text-right">
                              <input 
                                type="number" 
                                step="0.1"
                                disabled={poMode === 'VIEW'}
                                value={line.disc_percent}
                                onChange={e => handleCellChange(line.product_id, 'disc_percent', e.target.value)}
                                className="w-full bg-background/50 border border-border/80 rounded px-1.5 py-1 text-[11px] text-right text-text-primary disabled:opacity-80"
                              />
                            </td>
                            <td className="p-3 text-right text-text-secondary">${line.gross.toFixed(2)}</td>
                            <td className="p-3 text-right text-text-secondary">${line.disc_amt.toFixed(2)}</td>
                            <td className="p-3 text-right text-text-secondary">${line.taxable.toFixed(2)}</td>
                            <td className="p-3 text-right text-text-secondary">{line.gst_percent}%</td>
                            <td className="p-3 text-right text-text-secondary">${line.gst_amt.toFixed(2)}</td>
                            <td className="p-3 text-right font-bold text-text-primary">${line.net.toFixed(2)}</td>
                            {poMode !== 'VIEW' && (
                              <td className="p-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(line.product_id)}
                                  className="p-1 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Recalculate totals bar */}
                {poLines.length > 0 && (
                  <div className="p-4 bg-white/2 border-t border-border flex flex-wrap justify-end gap-x-8 gap-y-2 text-right text-xs">
                    <div>
                      <span className="text-text-secondary">Gross Value:</span>
                      <p className="font-bold text-sm mt-0.5">${grandGross.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-text-secondary">Total Disc:</span>
                      <p className="font-bold text-sm text-red-400 mt-0.5">-${grandDiscount.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-text-secondary">Total Taxable:</span>
                      <p className="font-bold text-sm mt-0.5">${grandTaxable.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-text-secondary">Total GST:</span>
                      <p className="font-bold text-sm text-secondary mt-0.5">+${grandGst.toFixed(2)}</p>
                    </div>
                    <div className="border-l border-border pl-6">
                      <span className="text-primary font-semibold">Grand Net:</span>
                      <p className="font-extrabold text-base text-primary mt-0.5">${grandTotal.toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-secondary uppercase font-semibold">Order Remarks & Notes</label>
                <textarea
                  value={poRemarks}
                  disabled={poMode === 'VIEW'}
                  onChange={e => setPoRemarks(e.target.value)}
                  placeholder="Purchase terms, special shipping instructions, etc."
                  rows="3"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary disabled:opacity-60"
                />
              </div>

              {poMode !== 'VIEW' && (
                <button
                  type="submit"
                  disabled={submittingPo}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2.5 rounded-lg transition-colors shadow-md shadow-primary/20 disabled:opacity-50"
                >
                  {submittingPo ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                  Commit Purchase Order
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: modalFrameGRN */}
      {showGrnModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-4xl w-full rounded-xl overflow-hidden shadow-2xl border border-border flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-white/2">
              <h3 className="font-bold text-sm">Goods Received Note (GRN) Inwarding</h3>
              <button onClick={() => setShowGrnModal(false)} className="text-text-secondary hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateGRN} className="p-6 overflow-y-auto space-y-4 flex-1">
              {grnMessage && (
                <div className={`p-4 rounded-lg flex items-center gap-3 text-xs ${
                  grnMessage.startsWith('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-secondary/10 text-secondary border border-secondary/20'
                }`}>
                  <AlertCircle size={16} />
                  {grnMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Select Vendor</label>
                  <select
                    value={grnVendorId}
                    onChange={e => {
                      setGrnVendorId(e.target.value);
                      // Filter POs for this vendor
                    }}
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
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Link Purchase Order</label>
                  <select
                    value={grnPoId}
                    onChange={e => {
                      setGrnPoId(e.target.value);
                      loadPoForGRN(e.target.value);
                    }}
                    required
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                  >
                    <option value="">-- Select PO --</option>
                    {purchaseOrders.filter(p => !grnVendorId || p.vendor_id === parseInt(grnVendorId)).map(po => (
                      <option key={po.id} value={po.id}>{po.po_number || `PO-${po.id}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Vendor Invoice / Bill No</label>
                  <input
                    type="text"
                    required
                    value={grnInvoiceNo}
                    onChange={e => setGrnInvoiceNo(e.target.value)}
                    placeholder="e.g. VOLGA-INV-82"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Invoice Date</label>
                  <input
                    type="date"
                    required
                    value={grnInvoiceDate}
                    onChange={e => setGrnInvoiceDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                  />
                </div>
              </div>

              {/* GRN Lines verification */}
              {grnLines.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-text-secondary uppercase">Verify Received Stock</h4>
                  <div className="border border-border rounded-lg overflow-hidden bg-background">
                    <table className="w-full text-left text-xs divide-y divide-border">
                      <thead className="bg-white/2 text-text-secondary">
                        <tr>
                          <th className="p-3">Product Name</th>
                          <th className="p-3 text-right">Ordered Qty</th>
                          <th className="p-3 text-right w-32">Received Qty</th>
                          <th className="p-3 text-right">Unit Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {grnLines.map((line, idx) => (
                          <tr key={idx}>
                            <td className="p-3 font-medium">{line.product_name}</td>
                            <td className="p-3 text-right text-text-secondary">{line.quantity_ordered}</td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                required
                                min="0"
                                value={line.quantity_received}
                                onChange={e => handleGrnLineQtyChange(line.product_id, e.target.value)}
                                className="w-full bg-background/50 border border-border rounded px-2 py-1 text-xs text-right"
                              />
                            </td>
                            <td className="p-3 text-right">${line.rate.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingGrn}
                className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary-hover text-white text-xs font-semibold py-2.5 rounded-lg transition-colors shadow-md shadow-secondary/20 disabled:opacity-50"
              >
                {submittingGrn ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                Confirm Stock Inwarding (Log GRN)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: modalViewGRN */}
      {showViewGrnModal && selectedGRN && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-4xl w-full rounded-xl overflow-hidden shadow-2xl border border-border flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-white/2">
              <div>
                <h3 className="font-bold text-sm text-text-primary">Goods Received Note: GRN-{selectedGRN.id}</h3>
                <p className="text-[10px] text-text-secondary mt-0.5">Supplier: {selectedGRN.vendor_name}</p>
              </div>
              <button onClick={() => setShowViewGrnModal(false)} className="text-text-secondary hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-background p-4 rounded-lg border border-border">
                <div>
                  <span className="text-text-secondary block uppercase text-[9px]">Invoice Number</span>
                  <span className="font-semibold">{selectedGRN.invoice_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-text-secondary block uppercase text-[9px]">Received Date</span>
                  <span className="font-semibold">{selectedGRN.received_date?.split('T')[0] || selectedGRN.invoice_date}</span>
                </div>
                <div>
                  <span className="text-text-secondary block uppercase text-[9px]">Tax Paid</span>
                  <span className="font-semibold text-red-400">${parseFloat(selectedGRN.total_tax_amount || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-text-secondary block uppercase text-[9px]">Total Value</span>
                  <span className="font-bold text-secondary">${parseFloat(selectedGRN.grand_total || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-text-secondary uppercase">Inwarded Lines</h4>
                <div className="border border-border rounded-lg overflow-hidden bg-background">
                  <table className="w-full text-left text-xs divide-y divide-border">
                    <thead className="bg-white/2 text-text-secondary">
                      <tr>
                        <th className="p-3">Product Name</th>
                        <th className="p-3 text-right">Inwarded Qty</th>
                        <th className="p-3 text-right">Purchased Rate</th>
                        <th className="p-3 text-right">Tax Percent</th>
                        <th className="p-3 text-right">Total Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {viewGrnLines.map((l, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-medium">{l.product_name || `Product ID: ${l.product_id}`}</td>
                          <td className="p-3 text-right">{l.quantity}</td>
                          <td className="p-3 text-right">${parseFloat(l.rate).toFixed(2)}</td>
                          <td className="p-3 text-right">{l.tax_percent}%</td>
                          <td className="p-3 text-right font-semibold">${(l.quantity * l.rate * (1 + l.tax_percent / 100)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedGRN.status !== 'Reversed' && (
                <div className="flex justify-end pt-4 border-t border-border">
                  <button
                    onClick={() => setShowConfirmReverseModal(true)}
                    className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    <AlertTriangle size={14} />
                    Reverse Stock Entries
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: modalConfirmReverse */}
      {showConfirmReverseModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-sm w-full rounded-xl overflow-hidden shadow-2xl border border-red-500/20 p-6 space-y-4">
            <h3 className="font-bold text-sm text-red-500 flex items-center gap-2">
              <AlertTriangle size={18} />
              Warning! Proceed with Caution
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Are you sure? This will reverse all stock entries for this GRN. This action cannot be undone.
            </p>
            {reverseMessage && (
              <div className="p-3 bg-secondary/10 border border-secondary/20 text-xs text-secondary rounded">
                {reverseMessage}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmReverseModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold hover:bg-white/5 text-text-secondary"
              >
                Close
              </button>
              <button
                onClick={handleReverseGRN}
                disabled={reversingGrn}
                className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {reversingGrn && <RefreshCw className="animate-spin" size={12} />}
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
