import type { GroupedCheque } from '../types';
import { useRevertCheque } from '../hooks';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '../../../lib/utils';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface RevertChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  cheque: GroupedCheque;
  onSuccess?: () => void;
}

export default function RevertChequeModal({ isOpen, onClose, cheque, onSuccess }: RevertChequeModalProps) {
  const revertMutation = useRevertCheque();

  const handleRevert = async () => {
    try {
      await Promise.all(cheque.underlyingCheques.map(uc => 
        revertMutation.mutateAsync(uc.id)
      ));
      if (onSuccess) onSuccess();
      toast.success('Cheque reverted successfully');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to revert cheques.');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="Revert Clearance" widthClass="max-w-md">
      <div className="p-6 space-y-6">
        
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink-900 mb-1">Revert Cheque Clearance?</h3>
            <p className="text-sm text-ink-600">
              You are about to revert Cheque <strong>{cheque.cheque_number}</strong> ({formatCurrency(cheque.amount)}) back to PENDING.
            </p>
          </div>
        </div>

        <div className="bg-surface border border-border-subtle rounded-lg p-4 text-sm text-ink-600">
          <ul className="list-disc pl-4 space-y-1">
            <li>Associated journal entries will be reversed.</li>
            <li>The linked Bank Statement Entry will be freed up.</li>
          </ul>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="w-full">Cancel</Button>
          <Button 
            variant="primary" 
            className="w-full bg-amber-600 hover:bg-amber-700" 
            onClick={handleRevert} 
            loading={revertMutation.isPending}
            disabled={revertMutation.isPending}
          >
            Confirm Revert
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
