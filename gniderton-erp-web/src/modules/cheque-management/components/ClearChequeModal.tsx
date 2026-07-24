import { useState } from 'react';
import type { Cheque } from '../types';
import { useClearCheque, useBulkClearCheques } from '../hooks';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '../../../lib/utils';
// Assuming we have a hook to fetch bank statement entries for mapping
// For simplicity, we'll mock or use a generic one if it exists. 
// Let's just use a text input for bank_statement_entry_id for now if we don't have the API, 
// OR check if we have a useBankStatementEntries hook.

interface ClearChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCheques: Cheque[];
  onSuccess?: () => void;
}

export default function ClearChequeModal({ isOpen, onClose, selectedCheques, onSuccess }: ClearChequeModalProps) {
  const [mappings, setMappings] = useState<Record<number, string>>({});
  const [clearanceDate, setClearanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [remarks, setRemarks] = useState('');

  const clearMutation = useClearCheque();
  const bulkClearMutation = useBulkClearCheques();

  const handleClear = async () => {
    if (selectedCheques.length === 1) {
      const cheque = selectedCheques[0];
      const entryId = mappings[cheque.id];
      if (!entryId) return alert('Please enter Bank Statement Entry ID');
      
      await clearMutation.mutateAsync({
        id: cheque.id,
        payload: {
          clearance_date: clearanceDate,
          bank_statement_entry_id: Number(entryId),
          remarks
        }
      });
    } else {
      if (!bankAccountId) return alert('Please enter a Bank Account ID for bulk clear');
      
      const payloadMappings = selectedCheques.map(c => ({
        cheque_id: c.id,
        bank_statement_entry_id: Number(mappings[c.id])
      })).filter(m => m.bank_statement_entry_id);

      if (payloadMappings.length === 0) return alert('Please enter at least one Bank Statement Entry ID');

      await bulkClearMutation.mutateAsync({
        mappings: payloadMappings,
        clearance_date: clearanceDate,
        bank_account_id: Number(bankAccountId),
        remarks
      });
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  const isPending = clearMutation.isPending || bulkClearMutation.isPending;

  return (
    <Dialog open={isOpen} onClose={onClose} title={selectedCheques.length > 1 ? "Bulk Clear Cheques" : "Clear Cheque"} widthClass="max-w-3xl">
      <div className="p-6 space-y-6">
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
          {selectedCheques.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Bank Account ID (For Accounting)</label>
              <Input 
                placeholder="e.g. 1" 
                value={bankAccountId} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBankAccountId(e.target.value)} 
                className="w-full"
              />
            </div>
          )}
          <div className="col-span-2">
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
                <th className="p-3 font-medium text-ink-700">Amount</th>
                <th className="p-3 font-medium text-ink-700">Bank</th>
                <th className="p-3 font-medium text-ink-700 w-1/3">Bank Statement Entry ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {selectedCheques.map(cheque => (
                <tr key={cheque.id}>
                  <td className="p-3 font-medium">{cheque.cheque_number}</td>
                  <td className="p-3 font-semibold">{formatCurrency(Number(cheque.amount))}</td>
                  <td className="p-3 text-ink-600">{cheque.bank_name || 'N/A'}</td>
                  <td className="p-3">
                    <Input 
                      placeholder="Entry ID..."
                      value={mappings[cheque.id] || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMappings({ ...mappings, [cheque.id]: e.target.value })}
                      className="w-full"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
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
      </div>
    </Dialog>
  );
}
