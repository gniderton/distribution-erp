import { useState, useMemo, useEffect } from 'react';
import type { GroupedCheque } from '../types';
import { useClearCheque, useBulkClearCheques, useBankStatementEntries } from '../hooks';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '../../../lib/utils';
import toast from 'react-hot-toast';
import { X, CheckCircle, XCircle } from 'lucide-react';

interface ClearChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCheques: GroupedCheque[];
  onSuccess?: () => void;
}

export default function ClearChequeModal({ isOpen, onClose, selectedCheques, onSuccess }: ClearChequeModalProps) {
  const [activeCheques, setActiveCheques] = useState<GroupedCheque[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [clearanceDate, setClearanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveCheques(selectedCheques);
      setMappings({});
      setClearanceDate(new Date().toISOString().split('T')[0]);
      setRemarks('');
    }
  }, [isOpen, selectedCheques]);

  const clearMutation = useClearCheque();
  const bulkClearMutation = useBulkClearCheques();
  const { data: bankStatementEntries = [], isLoading: isLoadingEntries } = useBankStatementEntries();

  const handleRemoveCheque = (id: string) => {
    setActiveCheques(prev => prev.filter(c => c.id !== id));
    setMappings(prev => {
      const newMappings = { ...prev };
      delete newMappings[id];
      return newMappings;
    });
  };

  // 1. Validation: Ensure all cheques have a mapping
  const allMapped = useMemo(() => activeCheques.every(c => mappings[c.id]), [activeCheques, mappings]);

  // 2. Validation: Ensure total amount per statement entry does not exceed its balance
  const overAllocatedEntry = useMemo(() => {
    const statementTotals: Record<string, number> = {};
    for (const cheque of activeCheques) {
      const entryId = mappings[cheque.id];
      if (entryId) {
        statementTotals[entryId] = (statementTotals[entryId] || 0) + cheque.amount;
      }
    }

    for (const [entryId, totalChequeAmount] of Object.entries(statementTotals)) {
      const entry = bankStatementEntries.find((e: any) => e.id.toString() === entryId);
      if (entry) {
        const entryBalance = Number(entry.balance_amount ?? entry.unreconciled_amount ?? Math.abs(entry.amount));
        if (totalChequeAmount > entryBalance + 0.01) {
          return {
            entry,
            totalChequeAmount,
            entryBalance
          };
        }
      }
    }
    return null;
  }, [activeCheques, mappings, bankStatementEntries]);

  const isReady = activeCheques.length > 0 && allMapped && !overAllocatedEntry;
  const isPending = clearMutation.isPending || bulkClearMutation.isPending;

  const handleClear = async () => {
    if (!isReady) return;

    // Collect all mappings (expanding GroupedCheque to underlying Cheque IDs)
    const payloadMappings: { cheque_id: number; bank_statement_entry_id: number }[] = [];
    
    for (const group of activeCheques) {
      const entryId = mappings[group.id];
      if (entryId) {
        for (const uc of group.underlyingCheques) {
          payloadMappings.push({
            cheque_id: uc.id,
            bank_statement_entry_id: Number(entryId)
          });
        }
      }
    }

    if (payloadMappings.length === 0) {
      toast.error('Please select at least one Bank Statement Entry');
      return;
    }

    try {
      await bulkClearMutation.mutateAsync({
        mappings: payloadMappings,
        clearance_date: clearanceDate,
        bank_account_id: 1, // Dummy, overridden by backend
        remarks
      });

      if (onSuccess) onSuccess();
      toast.success('Cheques cleared successfully');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to clear cheques.');
    }
  };

  // Total calculation for modal
  const totalValue = activeCheques.reduce((sum, c) => sum + c.amount, 0);

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      title={activeCheques.length > 1 ? "Bulk Clear Cheques" : "Clear Cheque"} 
      widthClass="max-w-6xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={handleClear} 
            loading={isPending}
            disabled={!isReady || isPending}
          >
            Confirm Clearance
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        
        {/* Summary Banner */}
        <div className="bg-brand-50 border border-brand-100 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-brand-700 font-medium">Total Value</p>
            <p className="text-2xl font-bold text-brand-900">{formatCurrency(totalValue)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-brand-700 font-medium">Selected Cheques</p>
            <p className="text-2xl font-bold text-brand-900">{activeCheques.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Clearance Date</label>
            <Input 
              type="date" 
              value={clearanceDate} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClearanceDate(e.target.value)} 
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Remarks (Optional)</label>
            <Input 
              placeholder="Any remarks..." 
              value={remarks} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRemarks(e.target.value)} 
              className="w-full"
            />
          </div>
        </div>

        <div className="border border-border-subtle rounded-xl overflow-hidden bg-surface max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left text-sm divide-y divide-border-subtle">
            <thead className="bg-ink-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 font-medium text-ink-700">Cheque No.</th>
                <th className="p-3 font-medium text-ink-700">Party</th>
                <th className="p-3 font-medium text-ink-700">Amount</th>
                <th className="p-3 font-medium text-ink-700">Bank</th>
                <th className="p-3 font-medium text-ink-700 w-[45%]">Bank Statement Entry</th>
                <th className="p-3 font-medium text-ink-700 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-white">
              {activeCheques.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-ink-500">No cheques remaining in this clearance batch.</td>
                </tr>
              ) : (
                activeCheques.map(cheque => {
                  const validEntries = bankStatementEntries.filter((e: any) => {
                    if (e.status === 'Exhausted') return false;
                    if (cheque.type === 'INCOMING') return Number(e.credit_amount) > 0;
                    if (cheque.type === 'OUTGOING') return Number(e.debit_amount) > 0;
                    return true;
                  });

                  return (
                    <tr key={cheque.id} className="hover:bg-ink-50/50">
                      <td className="p-3 font-medium">{cheque.cheque_number}</td>
                      <td className="p-3 text-ink-900">{cheque.party_name}</td>
                      <td className="p-3 font-semibold">{formatCurrency(cheque.amount)}</td>
                      <td className="p-3 text-ink-600">{cheque.bank_name || 'N/A'}</td>
                      <td className="p-3">
                        <select
                          className="w-full h-9 rounded-lg border border-border-subtle text-sm px-3 outline-none focus:border-brand-500"
                          value={mappings[cheque.id] || ''}
                          onChange={(e) => setMappings({ ...mappings, [cheque.id]: e.target.value })}
                          disabled={isLoadingEntries}
                        >
                          <option value="">Select Statement Entry...</option>
                          {validEntries.map((e: any) => {
                            const entryBalance = Number(e.balance_amount ?? e.unreconciled_amount ?? Math.abs(e.amount));
                            return (
                              <option key={e.id} value={e.id}>
                                {e.transaction_date?.split('T')[0]} - {formatCurrency(Math.abs(e.amount))} {entryBalance !== Math.abs(e.amount) ? `(Bal: ${formatCurrency(entryBalance)})` : ''} - {e.particulars}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => handleRemoveCheque(cheque.id)}
                          className="text-ink-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                          title="Remove from batch"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Validation Status */}
        {activeCheques.length > 0 && (
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${isReady ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {!allMapped ? (
              <>
                <XCircle size={18} className="text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-600 font-medium">Please select a Bank Statement Entry for all cheques.</span>
              </>
            ) : overAllocatedEntry ? (
              <>
                <XCircle size={18} className="text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-600 font-medium">
                  Total cheque amount ({formatCurrency(overAllocatedEntry.totalChequeAmount)}) exceeds balance ({formatCurrency(overAllocatedEntry.entryBalance)}) for entry: {overAllocatedEntry.entry.particulars}
                </span>
              </>
            ) : (
              <>
                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                <span className="text-sm text-green-600 font-medium">Ready to clear</span>
              </>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
