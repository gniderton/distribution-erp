import React from 'react';
import { useJobPolling } from '@/hooks/useJobPolling';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  jobId: string | null;
  onComplete?: (result: any) => void;
  title?: string;
}

export function JobProgressBar({ jobId, onComplete, title = 'Processing...' }: Props) {
  const { data: job, isLoading, isError } = useJobPolling(jobId, onComplete);

  if (!jobId) return null;

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-sm font-medium text-ink-600">Initializing job...</p>
      </div>
    );
  }

  if (isError || job?.status === 'failed') {
    return (
      <div className="p-6 flex flex-col items-center justify-center space-y-4 text-rose-600">
        <XCircle className="w-8 h-8" />
        <p className="text-sm font-medium">Job Failed</p>
        <p className="text-xs text-rose-500 max-w-sm text-center">{job?.error || 'An unknown error occurred.'}</p>
      </div>
    );
  }

  const progress = Math.max(0, Math.min(100, job?.progress || 0));
  const isComplete = job?.status === 'completed';

  return (
    <div className="p-6 flex flex-col items-center justify-center space-y-4 w-full">
      {isComplete ? (
        <CheckCircle className="w-8 h-8 text-emerald-500" />
      ) : (
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      )}
      
      <div className="text-center w-full max-w-sm">
        <p className="text-sm font-medium text-ink-900 mb-1">
          {isComplete ? 'Completed!' : title}
        </p>
        
        <div className="w-full h-3 bg-ink-100 rounded-full overflow-hidden mt-3">
          <div 
            className={`h-full transition-all duration-500 ease-out ${isComplete ? 'bg-emerald-500' : 'bg-brand-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className="text-xs font-mono text-ink-500 mt-2">{progress}%</p>
      </div>
    </div>
  );
}
