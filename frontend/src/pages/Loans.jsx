import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, FileText, CheckCircle, AlertCircle, Percent, Calendar, DollarSign } from 'lucide-react';

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/loans');
      if (res.ok) {
        setLoans(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLoans = loans.filter(l => 
    l.loan_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.provider_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Loans Matrix</h2>
          <p className="text-text-secondary text-xs mt-0.5">Track financial loans, interest rate schedules, payments, and remaining balances.</p>
        </div>
      </div>

      <div className="glass-card p-4 rounded-xl flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 text-text-secondary" size={16} />
          <input 
            type="text" 
            placeholder="Search loan account or lender name..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-primary text-text-primary placeholder:text-text-secondary"
          />
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-xs text-text-secondary gap-2">
          <RefreshCw className="animate-spin" size={14} />
          Loading accounts...
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-border">
              <thead className="bg-background text-text-secondary font-semibold">
                <tr>
                  <th className="p-3">Loan Account</th>
                  <th className="p-3">Lender Provider</th>
                  <th className="p-3 text-right">Sanction Amount</th>
                  <th className="p-3 text-right">Interest Rate</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3 text-right">Repaid Value</th>
                  <th className="p-3 text-right">Current Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-text-secondary italic">No loan entries recorded.</td>
                  </tr>
                ) : (
                  filteredLoans.map((l, idx) => (
                    <tr key={idx} className="hover:bg-white/2">
                      <td className="p-3 font-semibold text-primary">{l.loan_number || `LN-00${l.id}`}</td>
                      <td className="p-3 font-medium text-text-primary">{l.provider_name || 'Generic Bank'}</td>
                      <td className="p-3 text-right font-semibold">${parseFloat(l.sanction_amount || 0).toFixed(2)}</td>
                      <td className="p-3 text-right text-text-secondary flex items-center justify-end gap-1"><Percent size={12} /> {l.interest_rate || 9.5}%</td>
                      <td className="p-3 text-text-secondary">{l.start_date}</td>
                      <td className="p-3 text-right text-secondary">${parseFloat(l.repaid_amount || 0).toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-red-400">${parseFloat(l.balance_amount || l.sanction_amount - (l.repaid_amount || 0)).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
