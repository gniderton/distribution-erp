import { useState } from 'react';
import type { Cheque } from '../types';
import { useBounceCheque } from '../hooks';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface BounceChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  cheque: Cheque;
  onSuccess?: () => void;
}

export default function BounceChequeModal({ isOpen, onClose, cheque, onSuccess }: BounceChequeModalProps) {
  const [bounceDate, setBounceDate] = useState(new Date().toISOString().split('T')[0]);
  const [bounceReason, setBounceReason] = useState('Insufficient Funds');
  const [bankCharges, setBankCharges] = useState('');
  const [partyPenalty, setPartyPenalty] = useState('');

  const bounceMutation = useBounceCheque();

  const handleBounce = async () => {
    if (!bounceReason) return alert('Bounce reason is required');

    await bounceMutation.mutateAsync({
      id: cheque.id,
      payload: {
        bounce_date: bounceDate,
        bounce_reason: bounceReason,
        bank_charges: Number(bankCharges) || 0,
        ...(cheque.party_type === 'VENDOR' 
            ? { vendor_penalty: Number(partyPenalty) || 0 } 
            : { customer_penalty: Number(partyPenalty) || 0 })
      }
    });

    if (onSuccess) onSuccess();
    onClose();
  };

  const isPending = bounceMutation.isPending;

  return (
    <Dialog open={isOpen} onClose={onClose} title={`Bounce Cheque: ${cheque.cheque_number}`} widthClass="max-w-md">
      <div className="p-6 space-y-4">
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
          <label className="block text-sm font-medium text-ink-700 mb-1">Bounce Reason</label>
          <select 
            className="w-full h-10 px-3 rounded-lg border border-border-subtle focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all text-sm bg-surface"
            value={bounceReason}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBounceReason(e.target.value)}
          >
            <option value="Insufficient Funds">Insufficient Funds</option>
            <option value="Signature Mismatch">Signature Mismatch</option>
            <option value="Stale Cheque">Stale Cheque</option>
            <option value="Account Closed">Account Closed</option>
            <option value="Payment Stopped by Drawer">Payment Stopped by Drawer</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Bank Charges (₹)</label>
          <Input 
            type="number"
            placeholder="0.00" 
            value={bankCharges} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBankCharges(e.target.value)} 
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">
            {cheque.party_type === 'VENDOR' ? 'Vendor Penalty (₹)' : 'Customer Penalty (₹)'}
          </label>
          <Input 
            type="number"
            placeholder="0.00" 
            value={partyPenalty} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPartyPenalty(e.target.value)} 
            className="w-full"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle mt-6">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            variant="danger" 
            onClick={handleBounce} 
            loading={isPending}
            disabled={isPending}
          >
            Mark as Bounced
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
