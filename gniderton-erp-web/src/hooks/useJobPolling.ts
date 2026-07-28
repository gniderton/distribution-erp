import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface JobStatus {
  id: string;
  job_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result: any;
  error: string | null;
}

export function useJobPolling(jobId: string | null, onComplete?: (result: any) => void, onError?: (error: string) => void) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: async (): Promise<JobStatus> => {
      if (!jobId) throw new Error('No job ID');
      const res = await api.get(`/api/jobs/${jobId}`);
      
      const job = res.data;
      if (job.status === 'completed' && onComplete) {
        onComplete(job.result);
      } else if (job.status === 'failed' && onError) {
        onError(job.error || 'Job failed');
      }
      
      return job;
    },
    enabled: !!jobId,
    // Poll every 2 seconds until the job is completed or failed
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      return 2000;
    },
  });
}
