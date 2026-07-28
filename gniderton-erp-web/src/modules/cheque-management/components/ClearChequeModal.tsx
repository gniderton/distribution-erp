import { useState, useMemo } from 'react';
import type { GroupedCheque } from '../types';
import { useClearCheque, useBulkClearCheques, useBankStatementEntries } from '../hooks';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '../../../lib/utils';
import toast from 'react-hot-toast';

interface ClearChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCheques: GroupedCheque[];
  onSuccess?: () => void;
}

export default function ClearChequeModal({ isOpen, onClose, selectedCheques, onSuccess }: ClearChequeModalProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [clearanceDate, setClearanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  const clearMutation = useClearCheque();
  const bulkClearMutation = useBulkClearCheques();
  const { data: bankStatementEntries = [], isLoading: isLoadingEntries } = useBankStatementEntries();

  const handleClear = async () => {
    // Collect all mappings (expanding GroupedCheque to underlying Cheque IDs)
    const payloadMappings: { cheque_id: number; bank_statement_entry_id: number }[] = [];
    
    for (const group of selectedCheques) {
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

  const isPending = clearMutation.isPending || bulkClearMutation.isPending;

  // Total calculation for modal
  const totalValue = selectedCheques.reduce((sum, c) => sum + c.amount, 0);

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      title={selectedCheques.length > 1 ? "Bulk Clear Cheques" : "Clear Cheque"} 
      widthClass="max-w-4xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={handleClear} 
            loading={isPending}
            disabled={isPending}
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
            <p className="text-2xl font-bold text-brand-900">{selectedCheques.length}</p>
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

        <div className="border border-border-subtle rounded-xl overflow-hidden bg-surface">
          <table className="w-full text-left text-sm divide-y divide-border-subtle">
            <thead className="bg-ink-50">
              <tr>
                <th className="p-3 font-medium text-ink-700">Cheque No.</th>
                <th className="p-3 font-medium text-ink-700">Party</th>
                <th className="p-3 font-medium text-ink-700">Amount</th>
                <th className="p-3 font-medium text-ink-700">Bank</th>
                <th className="p-3 font-medium text-ink-700 w-1/2">Bank Statement Entry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {selectedCheques.map(cheque => {
                const validEntries = bankStatementEntries.filter((e: any) => {
                  if (e.status === 'Exhausted') return false;
                  if (cheque.type === 'INCOMING') return Number(e.credit_amount) > 0;
                  if (cheque.type === 'OUTGOING') return Number(e.debit_amount) > 0;
                  return true;
                });

                return (
                  <tr key={cheque.id}>
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
                        {validEntries.map((e: any) => (
                          <option key={e.id} value={e.id}>
                            {e.transaction_date?.split('T')[0]} - {formatCurrency(Math.abs(e.amount))} - {e.particulars}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Dialog>
  );
}
