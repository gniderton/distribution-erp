import { useState, useMemo } from 'react';
import { useCheques } from './hooks';
import type { Cheque, ChequeFilter } from './types';
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
  
  const { data: cheques = [], isLoading } = useCheques(filters);

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals state
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [isBounceOpen, setIsBounceOpen] = useState(false);
  const [isRevertOpen, setIsRevertOpen] = useState(false);
  
  const [activeCheque, setActiveCheque] = useState<Cheque | null>(null);

  const filteredCheques = useMemo(() => {
    let result = cheques;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c: Cheque) => 
        c.cheque_number.toLowerCase().includes(q) || 
        c.party_name?.toLowerCase().includes(q) ||
        c.bank_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [cheques, search]);

  const selectedCheques = useMemo(() => 
    filteredCheques.filter((c: Cheque) => selectedIds.includes(c.id)),
  [filteredCheques, selectedIds]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCheques.length && filteredCheques.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCheques.map((c: Cheque) => c.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Stats
  const totalPending = cheques.filter((c: Cheque) => c.status === 'PENDING').length;
  const totalCleared = cheques.filter((c: Cheque) => c.status === 'CLEARED').length;
  const totalBounced = cheques.filter((c: Cheque) => c.status === 'BOUNCED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Cheque Management</h1>
          <p className="text-sm text-ink-600 mt-1">Manage incoming and outgoing cheques, clear them with statement entries, or bounce them.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-xl border border-border-subtle flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-sm font-medium text-ink-600">Pending Cheques</div>
            <div className="text-2xl font-bold text-ink-900">{totalPending}</div>
          </div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-border-subtle flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="text-sm font-medium text-ink-600">Cleared Cheques</div>
            <div className="text-2xl font-bold text-ink-900">{totalCleared}</div>
          </div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-border-subtle flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
            <XCircle size={20} />
          </div>
          <div>
            <div className="text-sm font-medium text-ink-600">Bounced Cheques</div>
            <div className="text-2xl font-bold text-ink-900">{totalBounced}</div>
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
            {selectedCheques.every((c: Cheque) => c.status === 'PENDING') && (
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
                    checked={filteredCheques.length > 0 && selectedIds.length === filteredCheques.length}
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
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-white">
              {isLoading ? (
                <tr><td colSpan={9} className="p-8 text-center text-ink-500">Loading cheques...</td></tr>
              ) : filteredCheques.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-ink-500 italic">No cheques found.</td></tr>
              ) : (
                filteredCheques.map((c: Cheque) => {
                  const isSelected = selectedIds.includes(c.id);
                  return (
                    <tr 
                      key={c.id} 
                      className={`transition-colors cursor-pointer ${isSelected ? 'bg-brand-50 hover:bg-brand-100/50' : 'hover:bg-surface/30'}`}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName !== 'INPUT' && target.tagName !== 'BUTTON' && !target.closest('button')) {
                          toggleSelect(c.id);
                        }
                      }}
                    >
                      <td className="p-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded text-brand-600 focus:ring-brand-400 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-semibold text-ink-900">{c.cheque_number}</td>
                      <td className="p-3 text-ink-600">{c.cheque_date?.split('T')[0]}</td>
                      <td className="p-3 font-medium text-ink-900">{c.party_name || c.party_type}</td>
                      <td className="p-3 text-ink-600">{c.bank_name || 'N/A'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${
                          c.type === 'INCOMING' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {c.type}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-ink-900">
                        {formatCurrency(Number(c.amount))}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${
                          c.status === 'CLEARED' ? 'bg-emerald-50 text-emerald-700' :
                          c.status === 'BOUNCED' ? 'bg-rose-50 text-rose-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3 text-center space-x-2">
                        {c.status === 'PENDING' && (
                          <>
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200"
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setActiveCheque(c); setIsClearOpen(true); }}
                            >
                              Clear
                            </Button>
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setActiveCheque(c); setIsBounceOpen(true); }}
                            >
                              Bounce
                            </Button>
                          </>
                        )}
                        {c.status === 'CLEARED' && (
                          <Button 
                            variant="secondary" 
                            size="sm"
                            className="text-amber-600 hover:bg-amber-50 hover:text-amber-700 border-amber-200"
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setActiveCheque(c); setIsRevertOpen(true); }}
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
