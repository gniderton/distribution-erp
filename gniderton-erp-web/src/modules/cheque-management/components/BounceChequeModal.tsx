import { useState } from 'react';
import type { GroupedCheque } from '../types';
import { useBounceCheque, useBankStatementEntries } from '../hooks';
import { formatStatementDate, getStatementEntryBalance, matchesStatementSearch } from '../utils';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '../../../lib/utils';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';

interface BounceChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  cheque: GroupedCheque;
  onSuccess?: () => void;
}

export default function BounceChequeModal({ isOpen, onClose, cheque, onSuccess }: BounceChequeModalProps) {
  const [bounceDate, setBounceDate] = useState(new Date().toISOString().split('T')[0]);
  const [bounceReason, setBounceReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [bankCharges, setBankCharges] = useState('');
  const [customerPenalty, setCustomerPenalty] = useState('');
  
  const [depositEntryId, setDepositEntryId] = useState('');
  const [bounceEntryId, setBounceEntryId] = useState('');
  const [entrySearch, setEntrySearch] = useState('');

  const bounceMutation = useBounceCheque();
  const { data: bankStatementEntries = [], isLoading: isLoadingEntries } = useBankStatementEntries();

  const handleBounce = async () => {
    if (!bounceReason) return alert('Bounce reason is required');

    try {
      // Execute bounce for all underlying cheques
      const finalReason = bounceReason === 'Other' ? customReason : bounceReason;
      await Promise.all(cheque.underlyingCheques.map((uc, index) => 
        bounceMutation.mutateAsync({
          id: uc.id,
          payload: {
            bounce_date: bounceDate,
            bounce_reason: finalReason,
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
      toast.success('Cheque bounced successfully');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to bounce cheques.');
    }
  };

  // Filter entries based on Cheque type
  // If INCOMING: deposit = CREDIT, bounce = DEBIT
  // If OUTGOING: deposit = DEBIT, bounce = CREDIT
  const validDepositEntries = bankStatementEntries.filter((e: any) => {
    if (e.status === 'Exhausted') return false;
    if (cheque.type === 'INCOMING' && !(Number(e.credit_amount) > 0)) return false;
    if (cheque.type === 'OUTGOING' && !(Number(e.debit_amount) > 0)) return false;
    if (depositEntryId && String(e.id) === depositEntryId) return true;
    return matchesStatementSearch(e, entrySearch);
  });

  const validBounceEntries = bankStatementEntries.filter((e: any) => {
    if (e.status === 'Exhausted') return false;
    if (cheque.type === 'INCOMING' && !(Number(e.debit_amount) > 0)) return false;
    if (cheque.type === 'OUTGOING' && !(Number(e.credit_amount) > 0)) return false;
    if (bounceEntryId && String(e.id) === bounceEntryId) return true;
    return matchesStatementSearch(e, entrySearch);
  });

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      title="Bounce Cheque" 
      widthClass="max-w-xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
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
      }
    >
      <div className="space-y-6">
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
            <select
              className="w-full h-9 rounded-lg border border-border-subtle text-sm px-3 outline-none focus:border-brand-500 bg-white"
              value={bounceReason}
              onChange={(e) => setBounceReason(e.target.value)}
            >
              <option value="">Select Reason...</option>
              <option value="Insufficient Funds">Insufficient Funds</option>
              <option value="Signature Mismatch">Signature Mismatch</option>
              <option value="Account Closed">Account Closed</option>
              <option value="Payment Stopped by Drawer">Payment Stopped by Drawer</option>
              <option value="Date Issue (Post-dated/Stale)">Date Issue (Post-dated/Stale)</option>
              <option value="Alteration requires signature">Alteration requires signature</option>
              <option value="Other">Other</option>
            </select>
            {bounceReason === 'Other' && (
              <Input 
                className="w-full mt-2"
                placeholder="Specify custom reason..."
                value={customReason}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomReason(e.target.value)}
              />
            )}
          </div>

          {/* Statement Entries for Reconciliation */}
          <div className="space-y-2">
            <div className="relative">
              <Search size={14} className="text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Filter unconsumed statement entries (date, narration, amount)..."
                value={entrySearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEntrySearch(e.target.value)}
                className="w-full pl-8"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Original Deposit Statement Entry (Optional)</label>
                <select
                  className="w-full h-9 rounded-lg border border-border-subtle text-sm px-3 outline-none focus:border-brand-500 bg-white"
                  value={depositEntryId}
                  onChange={(e) => setDepositEntryId(e.target.value)}
                  disabled={isLoadingEntries}
                >
                  <option value="">Select Statement Entry ({validDepositEntries.length})...</option>
                  {validDepositEntries.map((e: any) => {
                    const bal = getStatementEntryBalance(e);
                    return (
                      <option key={e.id} value={e.id}>
                        {formatStatementDate(e.transaction_date)} - {formatCurrency(Math.abs(e.amount))} {bal !== Math.abs(e.amount) ? `(Bal: ${formatCurrency(bal)})` : ''} - {e.particulars?.slice(0, 30)}
                      </option>
                    );
                  })}
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
                  <option value="">Select Statement Entry ({validBounceEntries.length})...</option>
                  {validBounceEntries.map((e: any) => {
                    const bal = getStatementEntryBalance(e);
                    return (
                      <option key={e.id} value={e.id}>
                        {formatStatementDate(e.transaction_date)} - {formatCurrency(Math.abs(e.amount))} {bal !== Math.abs(e.amount) ? `(Bal: ${formatCurrency(bal)})` : ''} - {e.particulars?.slice(0, 30)}
                      </option>
                    );
                  })}
                </select>
              </div>
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
      </div>
    </Dialog>
  );
}
