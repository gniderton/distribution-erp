import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, MapPin, RefreshCw, Send, DollarSign, 
  User, CheckCircle, AlertCircle, Trash2, X 
} from 'lucide-react';

export default function Vendors() {
  // State
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  
  // Tabs: 'profile', 'ledger', 'history', 'payment'
  const [activeTab, setActiveTab] = useState('profile');
  
  // Tab-specific details state
  const [addresses, setAddresses] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', code: '', email: '', phone: '', credit_days: 30 });
  const [submittingVendor, setSubmittingVendor] = useState(false);

  // Record payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_mode: 'Bank Transfer',
    bank_account_id: '',
    reference_no: '',
    remarks: ''
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  // Fetch Vendors list on mount
  useEffect(() => {
    fetchVendors();
    fetchBankAccounts();
  }, []);

  // Fetch details when selected vendor or active tab changes
  useEffect(() => {
    if (!selectedVendor) return;
    
    if (activeTab === 'profile') {
      fetchAddresses(selectedVendor.id);
    } else if (activeTab === 'ledger') {
      fetchLedger(selectedVendor.id);
    } else if (activeTab === 'history') {
      fetchPaymentHistory(selectedVendor.id);
    }
  }, [selectedVendor, activeTab]);

  const fetchVendors = async () => {
    setLoadingVendors(true);
    try {
      const res = await fetch('/api/vendors');
      if (res.ok) {
        const json = await res.json();
        // Support both wrapped { data: [...] } and raw arrays
        const data = json.data || json;
        setVendors(data);
        if (data.length > 0 && !selectedVendor) {
          setSelectedVendor(data[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch vendors', e);
    } finally {
      setLoadingVendors(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch('/api/bank-accounts');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setBankAccounts(data);
        if (data.length > 0) {
          setPaymentForm(prev => ({ ...prev, bank_account_id: data[0].id }));
        }
      }
    } catch (e) {
      console.error('Failed to fetch bank accounts', e);
    }
  };

  const fetchAddresses = async (id) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/vendors/${id}/addresses`);
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
      }
    } catch (e) {
      console.error('Failed to fetch addresses', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchLedger = async (id) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/vendor-payments/ledger/${id}`);
      if (res.ok) {
        const data = await res.json();
        setLedger(data);
      }
    } catch (e) {
      console.error('Failed to fetch ledger', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchPaymentHistory = async (id) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/vendor-payments/history/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPaymentHistory(data);
      }
    } catch (e) {
      console.error('Failed to fetch payment history', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    setSubmittingVendor(true);
    try {
      const payload = {
        vendor_name: newVendor.name,
        vendor_code: newVendor.code,
        email: newVendor.email,
        contact_no: newVendor.phone,
        credit_period_days: parseInt(newVendor.credit_days)
      };

      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const created = await res.json();
        setShowAddModal(false);
        setNewVendor({ name: '', code: '', email: '', phone: '', credit_days: 30 });
        await fetchVendors();
        setSelectedVendor(created);
      }
    } catch (e) {
      console.error('Failed to create vendor', e);
    } finally {
      setSubmittingVendor(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmittingPayment(true);
    setPaymentSuccess(null);
    try {
      const payload = {
        vendor_id: selectedVendor.id,
        amount: parseFloat(paymentForm.amount),
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: paymentForm.payment_mode,
        bank_account_id: parseInt(paymentForm.bank_account_id),
        reference_no: paymentForm.reference_no,
        remarks: paymentForm.remarks
      };

      const res = await fetch('/api/vendor-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setPaymentSuccess('Payment successfully logged!');
        setPaymentForm(prev => ({
          ...prev,
          amount: '',
          reference_no: '',
          remarks: ''
        }));
        // Refresh details
        if (activeTab === 'ledger') fetchLedger(selectedVendor.id);
        if (activeTab === 'history') fetchPaymentHistory(selectedVendor.id);
      } else {
        setPaymentSuccess('Error: Failed to process payment.');
      }
    } catch (e) {
      console.error('Failed to submit payment', e);
      setPaymentSuccess('Error: Connection failed.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Filter vendors based on search input
  const filteredVendors = vendors.filter(v => 
    (v.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (v.vendor_code && v.vendor_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vendors Manager</h2>
          <p className="text-text-secondary text-xs mt-0.5">Manage supplier directory, ledger balances, and record payments.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-md shadow-primary/20"
        >
          <Plus size={16} />
          Add Vendor
        </button>
      </div>

      {/* Main split-screen panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow items-stretch">
        
        {/* Left Side: Vendors List */}
        <div className="lg:col-span-4 glass-card rounded-xl flex flex-col overflow-hidden max-h-[calc(100vh-12rem)]">
          <div className="p-4 border-b border-border space-y-3 bg-white/2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-text-secondary" size={16} />
              <input 
                type="text" 
                placeholder="Search vendor name or code..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-primary transition-colors text-text-primary placeholder:text-text-secondary"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {loadingVendors ? (
              <div className="p-8 text-center text-xs text-text-secondary flex items-center justify-center gap-2">
                <RefreshCw className="animate-spin" size={14} />
                Loading supplier list...
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-secondary">
                No vendors found.
              </div>
            ) : (
              filteredVendors.map(v => (
                <div 
                  key={v.id}
                  onClick={() => { setSelectedVendor(v); setPaymentSuccess(null); }}
                  className={`p-4 cursor-pointer transition-colors text-left ${
                    selectedVendor?.id === v.id ? 'bg-primary/5 border-l-4 border-primary' : 'hover:bg-white/2'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-xs leading-none text-text-primary">{v.vendor_name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      v.is_active !== false ? 'bg-secondary/10 text-secondary' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {v.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2 text-[10px] text-text-secondary">
                    <span>Code: {v.vendor_code || 'N/A'}</span>
                    <span>Days: {v.credit_period_days || 30}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Selected Vendor Detail Dashboard */}
        <div className="lg:col-span-8 glass-card rounded-xl flex flex-col overflow-hidden max-h-[calc(100vh-12rem)]">
          {selectedVendor ? (
            <>
              {/* Detail Header */}
              <div className="p-6 border-b border-border bg-white/2 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                    {(selectedVendor.vendor_name || 'V').charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-text-primary">{selectedVendor.vendor_name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                      <span>Code: {selectedVendor.vendor_code || 'N/A'}</span>
                      <span>•</span>
                      <span>Credit Terms: {selectedVendor.credit_period_days || 30} Days</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex border-b border-border bg-white/1 px-6">
                {[
                  { id: 'profile', label: 'Supplier Profile', icon: User },
                  { id: 'ledger', label: 'Ledger Statement', icon: BookOpen },
                  { id: 'history', label: 'Payment History', icon: History },
                  { id: 'payment', label: 'Record Payment', icon: DollarSign },
                ].map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setActiveTab(t.id); setPaymentSuccess(null); }}
                      className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                        activeTab === t.id 
                          ? 'border-primary text-primary' 
                          : 'border-transparent text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Icon size={14} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Panel */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingDetails ? (
                  <div className="h-48 flex items-center justify-center text-xs text-text-secondary gap-2">
                    <RefreshCw className="animate-spin" size={14} />
                    Fetching supplier records...
                  </div>
                ) : (
                  <>
                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg bg-background border border-border">
                            <span className="text-[10px] text-text-secondary font-medium uppercase">Phone Contact</span>
                            <p className="text-sm font-semibold mt-1">{selectedVendor.contact_no || 'No phone recorded'}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-background border border-border">
                            <span className="text-[10px] text-text-secondary font-medium uppercase">Email Address</span>
                            <p className="text-sm font-semibold mt-1">{selectedVendor.email || 'No email recorded'}</p>
                          </div>
                        </div>

                        {/* Bank Details section */}
                        <div className="p-4 rounded-lg bg-background border border-border space-y-2">
                          <h4 className="font-semibold text-xs text-text-secondary uppercase">Bank Accounts Registered</h4>
                          {selectedVendor.bank_name ? (
                            <div className="text-xs space-y-1">
                              <p><span className="text-text-secondary">Bank Name:</span> <span className="font-semibold">{selectedVendor.bank_name}</span></p>
                              <p><span className="text-text-secondary">Account No:</span> <span className="font-semibold">{selectedVendor.bank_account_no}</span></p>
                              <p><span className="text-text-secondary">IFSC Code:</span> <span className="font-semibold">{selectedVendor.bank_ifsc}</span></p>
                            </div>
                          ) : (
                            <p className="text-xs text-text-secondary italic">No bank records registered.</p>
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold text-xs text-text-secondary uppercase mb-3 flex items-center gap-2">
                            <MapPin size={14} />
                            Vendor Locations & Addresses
                          </h4>
                          {addresses.length === 0 && !selectedVendor.address_line1 ? (
                            <p className="text-xs text-text-secondary italic">No address details registered.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Standard address from vendor item if array is empty */}
                              {selectedVendor.address_line1 && (
                                <div className="p-4 rounded-lg bg-white/2 border border-border/60">
                                  <p className="text-xs font-semibold text-text-primary">{selectedVendor.address_line1}</p>
                                  {selectedVendor.address_line2 && <p className="text-xs text-text-secondary mt-0.5">{selectedVendor.address_line2}</p>}
                                  <p className="text-xs text-text-secondary mt-1">{selectedVendor.district}, {selectedVendor.state}</p>
                                </div>
                              )}
                              {addresses.map((addr, idx) => (
                                <div key={idx} className="p-4 rounded-lg bg-white/2 border border-border/60">
                                  <p className="text-xs font-semibold text-text-primary">{addr.address_line1}</p>
                                  {addr.address_line2 && <p className="text-xs text-text-secondary mt-0.5">{addr.address_line2}</p>}
                                  <p className="text-xs text-text-secondary mt-1">{addr.city}, {addr.state} - {addr.pincode}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* LEDGER TAB */}
                    {activeTab === 'ledger' && (
                      <div className="space-y-4">
                        <div className="overflow-x-auto border border-border rounded-lg">
                          <table className="w-full text-left text-xs divide-y divide-border">
                            <thead className="bg-background text-text-secondary font-semibold">
                              <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Description</th>
                                <th className="p-3 text-right">Debit</th>
                                <th className="p-3 text-right">Credit</th>
                                <th className="p-3 text-right">Balance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {ledger.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-4 text-center text-text-secondary italic">No statement records found.</td>
                                </tr>
                              ) : (
                                ledger.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-white/2">
                                    <td className="p-3 text-text-secondary">{item.date}</td>
                                    <td className="p-3 font-medium text-text-primary">{item.description}</td>
                                    <td className="p-3 text-right text-red-400">{item.debit > 0 ? `$${item.debit.toFixed(2)}` : '-'}</td>
                                    <td className="p-3 text-right text-secondary">{item.credit > 0 ? `$${item.credit.toFixed(2)}` : '-'}</td>
                                    <td className="p-3 text-right font-semibold">${item.balance.toFixed(2)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeTab === 'history' && (
                      <div className="space-y-4">
                        <div className="overflow-x-auto border border-border rounded-lg">
                          <table className="w-full text-left text-xs divide-y divide-border">
                            <thead className="bg-background text-text-secondary font-semibold">
                              <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Reference No</th>
                                <th className="p-3">Mode</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3">Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {paymentHistory.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-4 text-center text-text-secondary italic">No payment history.</td>
                                </tr>
                              ) : (
                                paymentHistory.map((pay, idx) => (
                                  <tr key={idx} className="hover:bg-white/2">
                                    <td className="p-3 text-text-secondary">{pay.payment_date}</td>
                                    <td className="p-3 font-semibold">{pay.reference_no || 'N/A'}</td>
                                    <td className="p-3">{pay.payment_mode}</td>
                                    <td className="p-3 text-right text-secondary font-bold">${pay.amount.toFixed(2)}</td>
                                    <td className="p-3 text-text-secondary max-w-xs truncate">{pay.remarks || '-'}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* RECORD PAYMENT TAB */}
                    {activeTab === 'payment' && (
                      <form onSubmit={handleRecordPayment} className="space-y-4 max-w-lg">
                        {paymentSuccess && (
                          <div className={`p-4 rounded-lg flex items-center gap-3 text-xs ${
                            paymentSuccess.startsWith('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-secondary/10 text-secondary border border-secondary/20'
                          }`}>
                            {paymentSuccess.startsWith('Error') ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                            {paymentSuccess}
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[10px] text-text-secondary uppercase font-semibold">Payment Amount ($)</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 text-text-secondary" size={16} />
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={paymentForm.amount}
                              onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                              placeholder="0.00"
                              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-text-secondary uppercase font-semibold">Payment Mode</label>
                            <select
                              value={paymentForm.payment_mode}
                              onChange={e => setPaymentForm(prev => ({ ...prev, payment_mode: e.target.value }))}
                              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                            >
                              <option>Bank Transfer</option>
                              <option>Cheque</option>
                              <option>Cash</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-text-secondary uppercase font-semibold">Pay From Bank Account</label>
                            <select
                              value={paymentForm.bank_account_id}
                              onChange={e => setPaymentForm(prev => ({ ...prev, bank_account_id: e.target.value }))}
                              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                            >
                              {bankAccounts.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-text-secondary uppercase font-semibold">Reference / Cheque Number</label>
                          <input
                            type="text"
                            value={paymentForm.reference_no}
                            onChange={e => setPaymentForm(prev => ({ ...prev, reference_no: e.target.value }))}
                            placeholder="e.g. TXN-928420 or Chq 842"
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-text-secondary uppercase font-semibold">Remarks & Notes</label>
                          <textarea
                            value={paymentForm.remarks}
                            onChange={e => setPaymentForm(prev => ({ ...prev, remarks: e.target.value }))}
                            placeholder="Optional notes or context about this payment..."
                            rows="3"
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submittingPayment}
                          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2.5 rounded-lg transition-colors shadow-md shadow-primary/20 disabled:opacity-50"
                        >
                          {submittingPayment ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                          Log Payment
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-text-secondary p-8 text-center">
              <User size={48} className="text-border mb-3" />
              <p className="text-sm">Select a vendor from the list to view balances, history, and log payments.</p>
            </div>
          )}
        </div>

      </div>

      {/* ADD VENDOR MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-xl overflow-hidden shadow-2xl border border-border">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm">Add New Supplier</h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-secondary hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateVendor} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-text-secondary uppercase font-semibold">Vendor Name</label>
                <input
                  type="text"
                  required
                  value={newVendor.name}
                  onChange={e => setNewVendor(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Volga Foods Pvt Ltd"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Vendor Code</label>
                  <input
                    type="text"
                    required
                    value={newVendor.code}
                    onChange={e => setNewVendor(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g. VOLGA-F"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Credit Days</label>
                  <input
                    type="number"
                    value={newVendor.credit_days}
                    onChange={e => setNewVendor(prev => ({ ...prev, credit_days: parseInt(e.target.value) }))}
                    placeholder="30"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-secondary uppercase font-semibold">Email Address</label>
                <input
                  type="email"
                  value={newVendor.email}
                  onChange={e => setNewVendor(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="billing@supplier.com"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-secondary uppercase font-semibold">Phone Contact</label>
                <input
                  type="text"
                  value={newVendor.phone}
                  onChange={e => setNewVendor(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 019-2834"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold hover:bg-white/5 text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVendor}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingVendor && <RefreshCw className="animate-spin" size={12} />}
                  Add Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
