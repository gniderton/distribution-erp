import type { Cheque } from '../types';
import { useRevertCheque } from '../hooks';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

interface RevertChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  cheque: Cheque;
  onSuccess?: () => void;
}

export default function RevertChequeModal({ isOpen, onClose, cheque, onSuccess }: RevertChequeModalProps) {
  const revertMutation = useRevertCheque();

  const handleRevert = async () => {
    await revertMutation.mutateAsync(cheque.id);
    if (onSuccess) onSuccess();
    onClose();
  };

  const isPending = revertMutation.isPending;

  return (
    <Dialog open={isOpen} onClose={onClose} title="Revert Cleared Cheque" widthClass="max-w-md">
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
          <div className="space-y-2">
            <p className="font-semibold">
              Chq No: {cheque.cheque_number} dated {cheque.cheque_date?.split('T')[0]} of {cheque.party_name || cheque.party_type} will be reverted.
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Changes the cheque status from CLEARED back to PENDING.</li>
              <li>Removes the clearance_date and bank_account_id.</li>
              <li>Automatically deletes the journal entry created during clearance.</li>
              <li>Restores the consumed amount on the linked bank statement entry.</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={handleRevert} 
            loading={isPending}
            disabled={isPending}
          >
            Confirm Revert
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
