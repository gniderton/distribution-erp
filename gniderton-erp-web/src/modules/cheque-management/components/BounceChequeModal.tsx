import { useState } from 'react';
import type { GroupedCheque } from '../types';
import { useBounceCheque, useBankStatementEntries } from '../hooks';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '../../../lib/utils';

interface BounceChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  cheque: GroupedCheque;
  onSuccess?: () => void;
}

export default function BounceChequeModal({ isOpen, onClose, cheque, onSuccess }: BounceChequeModalProps) {
  const [bounceDate, setBounceDate] = useState(new Date().toISOString().split('T')[0]);
  const [bounceReason, setBounceReason] = useState('');
  const [bankCharges, setBankCharges] = useState('');
  const [customerPenalty, setCustomerPenalty] = useState('');
  
  const [depositEntryId, setDepositEntryId] = useState('');
  const [bounceEntryId, setBounceEntryId] = useState('');

  const bounceMutation = useBounceCheque();
  const { data: bankStatementEntries = [], isLoading: isLoadingEntries } = useBankStatementEntries();

  const handleBounce = async () => {
    if (!bounceReason) return alert('Bounce reason is required');

    try {
      // Execute bounce for all underlying cheques
      await Promise.all(cheque.underlyingCheques.map((uc, index) => 
        bounceMutation.mutateAsync({
          id: uc.id,
          payload: {
            bounce_date: bounceDate,
            bounce_reason: bounceReason,
            // Apply charges and penalty ONLY to the first cheque in the group
            bank_charges: index === 0 ? (Number(bankCharges) || 0) : 0,
            customer_penalty: index === 0 ? (Number(customerPenalty) || 0) : 0,
            // Only apply statement entries to the first cheque (since it represents the whole physical cheque)
            deposit_entry_id: index === 0 && depositEntryId ? Number(depositEntryId) : undefined,
            bounce_entry_id: index === 0 && bounceEntryId ? Number(bounceEntryId) : undefined
          }
        })
      ));

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to bounce some cheques. Check console.');
    }
  };

  // Filter entries based on Cheque type
  // If INCOMING: deposit = CREDIT, bounce = DEBIT
  // If OUTGOING: deposit = DEBIT, bounce = CREDIT
  const validDepositEntries = bankStatementEntries.filter((e: any) => {
    if (e.status === 'Exhausted') return false;
    if (cheque.type === 'INCOMING') return Number(e.credit_amount) > 0;
    if (cheque.type === 'OUTGOING') return Number(e.debit_amount) > 0;
    return true;
  });

  const validBounceEntries = bankStatementEntries.filter((e: any) => {
    if (e.status === 'Exhausted') return false;
    if (cheque.type === 'INCOMING') return Number(e.debit_amount) > 0;
    if (cheque.type === 'OUTGOING') return Number(e.credit_amount) > 0;
    return true;
  });

  return (
    <Dialog open={isOpen} onClose={onClose} title="Bounce Cheque" widthClass="max-w-xl">
      <div className="p-6 space-y-6">
        <div className="bg-rose-50 border border-rose-100 rounded-lg p-4">
          <p className="text-sm text-rose-800">
            You are about to bounce Cheque <strong>{cheque.cheque_number}</strong> ({formatCurrency(cheque.amount)}) from <strong>{cheque.party_name}</strong>.
            This will reverse associated ledger entries.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Bounce Date</label>
            <Input 
              type="date" 
              value={bounceDate} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBounceDate(e.target.value)} 
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Reason <span className="text-rose-500">*</span></label>
            <Input 
              placeholder="e.g. Insufficient Funds" 
              value={bounceReason} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBounceReason(e.target.value)} 
              className="w-full"
            />
          </div>

          {/* Statement Entries for Reconciliation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Original Deposit Statement Entry (Optional)</label>
              <select
                className="w-full h-9 rounded-lg border border-border-subtle text-sm px-3 outline-none focus:border-brand-500 bg-white"
                value={depositEntryId}
                onChange={(e) => setDepositEntryId(e.target.value)}
                disabled={isLoadingEntries}
              >
                <option value="">Select Statement Entry...</option>
                {validDepositEntries.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.transaction_date?.split('T')[0]} - {formatCurrency(Math.abs(e.amount))} - {e.particulars?.slice(0, 30)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Bounce Return Statement Entry (Optional)</label>
              <select
                className="w-full h-9 rounded-lg border border-border-subtle text-sm px-3 outline-none focus:border-brand-500 bg-white"
                value={bounceEntryId}
                onChange={(e) => setBounceEntryId(e.target.value)}
                disabled={isLoadingEntries}
              >
                <option value="">Select Statement Entry...</option>
                {validBounceEntries.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.transaction_date?.split('T')[0]} - {formatCurrency(Math.abs(e.amount))} - {e.particulars?.slice(0, 30)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Bank Charges (₹)</label>
              <Input 
                type="number" 
                min="0"
                placeholder="0.00" 
                value={bankCharges} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBankCharges(e.target.value)} 
                className="w-full"
              />
            </div>
            {cheque.type === 'INCOMING' && (
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Customer Penalty (₹)</label>
                <Input 
                  type="number" 
                  min="0"
                  placeholder="0.00" 
                  value={customerPenalty} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerPenalty(e.target.value)} 
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            className="bg-rose-600 hover:bg-rose-700" 
            onClick={handleBounce} 
            loading={bounceMutation.isPending}
            disabled={bounceMutation.isPending}
          >
            Confirm Bounce
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
