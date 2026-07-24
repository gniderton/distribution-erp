import { useState, useMemo } from 'react';
import { useCheques } from './hooks';
import type { Cheque, ChequeFilter, GroupedCheque } from './types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';
import { Filter, Search, CheckCircle, XCircle, Clock, Undo } from 'lucide-react';
import ClearChequeModal from './components/ClearChequeModal';
import BounceChequeModal from './components/BounceChequeModal';
import RevertChequeModal from './components/RevertChequeModal';

export default function ChequeManagementPage() {
  const [filters, setFilters] = useState<ChequeFilter>({});
  const [search, setSearch] = useState('');
  const apiFilters = useMemo(() => {
    const f = { ...filters };
    delete f.status; // Fetch all statuses to compute global stats
    return f;
  }, [filters]);
  
  const { data: cheques = [], isLoading } = useCheques(apiFilters);

  // Group Cheques
  const groupedCheques = useMemo(() => {
    const groups = new Map<string, GroupedCheque>();
    
    for (const c of cheques) {
      // Create a unique key for grouping (Cheque No + Date + Bank + Party + Type)
      const key = `${c.cheque_number}-${c.cheque_date}-${c.bank_name || 'NOBANK'}-${c.party_id}-${c.type}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          cheque_number: c.cheque_number,
          cheque_date: c.cheque_date,
          amount: Number(c.amount),
          type: c.type,
          party_name: c.party_name || c.party_type,
          bank_name: c.bank_name,
          status: c.status,
          underlyingCheques: [c]
        });
      } else {
        const group = groups.get(key)!;
        group.amount += Number(c.amount);
        group.underlyingCheques.push(c);
      }
    }
    
    return Array.from(groups.values());
  }, [cheques]);

  const filteredGroups = useMemo(() => {
    let result = groupedCheques;
    
    // Apply local status filter if selected
    if (filters.status) {
      result = result.filter((g: GroupedCheque) => g.status === filters.status);
    }
    
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((g: GroupedCheque) => 
        g.cheque_number.toLowerCase().includes(q) || 
        g.party_name?.toLowerCase().includes(q) ||
        g.bank_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [groupedCheques, search, filters.status]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [isBounceOpen, setIsBounceOpen] = useState(false);
  const [isRevertOpen, setIsRevertOpen] = useState(false);
  
  const [activeCheque, setActiveCheque] = useState<GroupedCheque | null>(null);

  const selectedCheques = useMemo(() => 
    filteredGroups.filter((g: GroupedCheque) => selectedIds.includes(g.id)),
  [filteredGroups, selectedIds]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredGroups.length && filteredGroups.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredGroups.map((g: GroupedCheque) => g.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Stats (Using grouped values for cleaner UX, but calculating total amount too)
  const pendingGroups = groupedCheques.filter(g => g.status === 'PENDING');
  const clearedGroups = groupedCheques.filter(g => g.status === 'CLEARED');
  const bouncedGroups = groupedCheques.filter(g => g.status === 'BOUNCED');
  
  const totalPendingAmt = pendingGroups.reduce((acc, g) => acc + g.amount, 0);
  const totalClearedAmt = clearedGroups.reduce((acc, g) => acc + g.amount, 0);
  const totalBouncedAmt = bouncedGroups.reduce((acc, g) => acc + g.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Cheque Management</h1>
          <p className="text-sm text-ink-600 mt-1">Manage incoming and outgoing cheques, clear them with statement entries, or bounce them.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-amber-200/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock size={64} className="text-amber-500" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-amber-100 p-2 rounded-lg"><Clock size={16} className="text-amber-600" /></div>
              <p className="text-sm font-medium text-ink-700">Pending Cheques</p>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold text-ink-900">{pendingGroups.length}</p>
              <p className="text-sm font-medium text-amber-600 mb-1">({formatCurrency(totalPendingAmt)})</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-emerald-200/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle size={64} className="text-emerald-500" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-emerald-100 p-2 rounded-lg"><CheckCircle size={16} className="text-emerald-600" /></div>
              <p className="text-sm font-medium text-ink-700">Cleared Cheques</p>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold text-ink-900">{clearedGroups.length}</p>
              <p className="text-sm font-medium text-emerald-600 mb-1">({formatCurrency(totalClearedAmt)})</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-rose-200/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <XCircle size={64} className="text-rose-500" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-rose-100 p-2 rounded-lg"><XCircle size={16} className="text-rose-600" /></div>
              <p className="text-sm font-medium text-ink-700">Bounced Cheques</p>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold text-ink-900">{bouncedGroups.length}</p>
              <p className="text-sm font-medium text-rose-600 mb-1">({formatCurrency(totalBouncedAmt)})</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-card p-4 rounded-xl border border-border-subtle flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
            <Input 
              placeholder="Search by Cheque No, Party, Bank..." 
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <select 
            className="h-10 px-3 rounded-lg border border-border-subtle focus:border-brand-500 outline-none text-sm bg-white"
            value={filters.type || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, type: e.target.value || undefined })}
          >
            <option value="">All Types</option>
            <option value="INCOMING">Incoming</option>
            <option value="OUTGOING">Outgoing</option>
          </select>
          <select 
            className="h-10 px-3 rounded-lg border border-border-subtle focus:border-brand-500 outline-none text-sm bg-white"
            value={filters.status || ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, status: e.target.value || undefined })}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CLEARED">Cleared</option>
            <option value="BOUNCED">Bounced</option>
          </select>
        </div>
        
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-ink-600">{selectedIds.length} selected</span>
            {selectedCheques.every((c: GroupedCheque) => c.status === 'PENDING') && (
              <Button 
                variant="primary" 
                onClick={() => { setActiveCheque(null); setIsClearOpen(true); }}
              >
                Clear Selected Cheques
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl border border-border-subtle overflow-hidden w-full shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs divide-y divide-border-subtle">
            <thead className="bg-surface text-ink-600 font-semibold">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input 
                    type="checkbox" 
                    checked={filteredGroups.length > 0 && selectedIds.length === filteredGroups.length}
                    onChange={toggleSelectAll}
                    className="rounded text-brand-600 focus:ring-brand-400"
                  />
                </th>
                <th className="p-3">Cheque No.</th>
                <th className="p-3">Date</th>
                <th className="p-3">Party</th>
                <th className="p-3">Bank</th>
                <th className="p-3">Type</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center">Count</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-white">
              {isLoading ? (
                <tr><td colSpan={10} className="p-8 text-center text-ink-500">Loading cheques...</td></tr>
              ) : filteredGroups.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-ink-500 italic">No cheques found.</td></tr>
              ) : (
                filteredGroups.map((g: GroupedCheque) => {
                  const isSelected = selectedIds.includes(g.id);
                  return (
                    <tr 
                      key={g.id} 
                      className={`transition-colors cursor-pointer ${isSelected ? 'bg-brand-50 hover:bg-brand-100/50' : 'hover:bg-surface/30'}`}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName !== 'INPUT' && target.tagName !== 'BUTTON' && !target.closest('button')) {
                          toggleSelect(g.id);
                        }
                      }}
                    >
                      <td className="p-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleSelect(g.id)}
                          className="rounded text-brand-600 focus:ring-brand-400 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-semibold text-ink-900">{g.cheque_number}</td>
                      <td className="p-3 text-ink-600">{g.cheque_date?.split('T')[0]}</td>
                      <td className="p-3 font-medium text-ink-900">{g.party_name}</td>
                      <td className="p-3 text-ink-600">{g.bank_name || 'N/A'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${
                          g.type === 'INCOMING' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {g.type}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-ink-900">
                        {formatCurrency(g.amount)}
                      </td>
                      <td className="p-3 text-center text-ink-500 text-[10px] font-medium">
                        {g.underlyingCheques.length > 1 ? (
                          <span className="bg-ink-100 px-1.5 py-0.5 rounded">{g.underlyingCheques.length} splits</span>
                        ) : '-'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${
                          g.status === 'CLEARED' ? 'bg-emerald-50 text-emerald-700' :
                          g.status === 'BOUNCED' ? 'bg-rose-50 text-rose-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {g.status}
                        </span>
                      </td>
                      <td className="p-3 text-center space-x-2">
                        {g.status === 'PENDING' && (
                          <>
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200"
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setActiveCheque(g); setIsClearOpen(true); }}
                            >
                              Clear
                            </Button>
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setActiveCheque(g); setIsBounceOpen(true); }}
                            >
                              Bounce
                            </Button>
                          </>
                        )}
                        {g.status === 'CLEARED' && (
                          <Button 
                            variant="secondary" 
                            size="sm"
                            className="text-amber-600 hover:bg-amber-50 hover:text-amber-700 border-amber-200"
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setActiveCheque(g); setIsRevertOpen(true); }}
                          >
                            <Undo size={14} className="mr-1" /> Revert
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {isClearOpen && (
        <ClearChequeModal 
          isOpen={isClearOpen}
          onClose={() => { setIsClearOpen(false); setSelectedIds([]); setActiveCheque(null); }}
          selectedCheques={activeCheque ? [activeCheque] : selectedCheques}
        />
      )}
      
      {isBounceOpen && activeCheque && (
        <BounceChequeModal 
          isOpen={isBounceOpen}
          onClose={() => { setIsBounceOpen(false); setActiveCheque(null); }}
          cheque={activeCheque}
        />
      )}
      
      {isRevertOpen && activeCheque && (
        <RevertChequeModal 
          isOpen={isRevertOpen}
          onClose={() => { setIsRevertOpen(false); setActiveCheque(null); }}
          cheque={activeCheque}
        />
      )}
    </div>
  );
}
