import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { vendorApi } from '../api';
import { useState } from 'react';

interface DeletePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId: number | string;
  paymentNumber: string;
  onSuccess: () => void;
}

export default function DeletePaymentModal({ isOpen, onClose, paymentId, paymentNumber, onSuccess }: DeletePaymentModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await vendorApi.deletePayment(paymentId);
      toast.success('Payment deleted successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Failed to delete payment');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      title="Delete Vendor Payment" 
      widthClass="max-w-md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose} className="w-full" disabled={isDeleting}>Cancel</Button>
          <Button 
            variant="primary" 
            className="w-full bg-red-600 hover:bg-red-700" 
            onClick={handleDelete} 
            loading={isDeleting}
            disabled={isDeleting}
          >
            Confirm Delete
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink-900 mb-1">Delete Payment {paymentNumber}?</h3>
            <p className="text-sm text-ink-600">
              This action cannot be undone. It will reverse any invoice allocations, bank statement consumptions, and accounting entries.
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
