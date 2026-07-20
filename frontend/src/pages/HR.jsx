import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, FileText, CheckCircle, AlertCircle, Briefcase, DollarSign, Plus } from 'lucide-react';

export default function HR() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal for new employee
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', designation: '', phone: '', email: '', base_salary: 0 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEmp.name,
          designation: newEmp.designation,
          phone: newEmp.phone,
          email: newEmp.email,
          base_salary: parseFloat(newEmp.base_salary)
        })
      });

      if (res.ok) {
        setNewEmp({ name: '', designation: '', phone: '', email: '', base_salary: 0 });
        setShowAddModal(false);
        fetchEmployees();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.designation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">HR & Payroll</h2>
          <p className="text-text-secondary text-xs mt-0.5">Manage company employees, designations, and salary structures.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-md shadow-primary/20"
        >
          <Plus size={16} />
          Add Employee
        </button>
      </div>

      <div className="glass-card p-4 rounded-xl flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 text-text-secondary" size={16} />
          <input 
            type="text" 
            placeholder="Search employee by name or designation..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-primary text-text-primary placeholder:text-text-secondary"
          />
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-xs text-text-secondary gap-2">
          <RefreshCw className="animate-spin" size={14} />
          Loading payroll directory...
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-border">
              <thead className="bg-background text-text-secondary font-semibold">
                <tr>
                  <th className="p-3">Employee Name</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3 text-right">Base Monthly Salary</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-text-secondary italic">No employees found.</td>
                  </tr>
                ) : (
                  filteredEmployees.map((e, idx) => (
                    <tr key={idx} className="hover:bg-white/2">
                      <td className="p-3 font-semibold text-text-primary">{e.name}</td>
                      <td className="p-3 text-text-secondary flex items-center gap-1.5"><Briefcase size={12} /> {e.designation || 'Staff'}</td>
                      <td className="p-3 text-text-secondary">{e.email || 'N/A'}</td>
                      <td className="p-3 text-text-secondary">{e.phone || 'N/A'}</td>
                      <td className="p-3 text-right font-bold text-secondary">${parseFloat(e.base_salary || 0).toFixed(2)}</td>
                      <td className="p-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          e.status === 'Resigned' ? 'bg-red-500/10 text-red-500' : 'bg-secondary/10 text-secondary'
                        }`}>
                          {e.status || 'Active'}
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

      {/* ADD EMPLOYEE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-xl overflow-hidden shadow-2xl border border-border">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm">Add New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-secondary hover:text-text-primary">
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-text-secondary uppercase font-semibold">Full Name</label>
                <input
                  type="text"
                  required
                  value={newEmp.name}
                  onChange={e => setNewEmp(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. John Doe"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Designation</label>
                  <input
                    type="text"
                    required
                    value={newEmp.designation}
                    onChange={e => setNewEmp(prev => ({ ...prev, designation: e.target.value }))}
                    placeholder="e.g. Accountant"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary uppercase font-semibold">Base Monthly Salary ($)</label>
                  <input
                    type="number"
                    required
                    value={newEmp.base_salary}
                    onChange={e => setNewEmp(prev => ({ ...prev, base_salary: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary text-right"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-secondary uppercase font-semibold">Email</label>
                <input
                  type="email"
                  value={newEmp.email}
                  onChange={e => setNewEmp(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="name@company.com"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-secondary uppercase font-semibold">Phone</label>
                <input
                  type="text"
                  value={newEmp.phone}
                  onChange={e => setNewEmp(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
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
                  disabled={submitting}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="animate-spin" size={12} />}
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
