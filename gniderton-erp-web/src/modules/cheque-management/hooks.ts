import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chequeApi } from './api';
import type { ChequeFilter, ClearChequePayload, BulkClearChequePayload, BounceChequePayload } from './types';

export function useCheques(filters?: ChequeFilter) {
  return useQuery({
    queryKey: ['cheques', filters],
    queryFn: () => chequeApi.list(filters)
  });
}

const invalidateChequeReconQueries = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['cheques'] });
  qc.invalidateQueries({ queryKey: ['bankStatementEntries'] });
  qc.invalidateQueries({ queryKey: ['unconsumed-credits'] });
  qc.invalidateQueries({ queryKey: ['unconsumed-debits'] });
};

export function useClearCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string, payload: ClearChequePayload }) => 
      chequeApi.clear(id, payload),
    onSuccess: () => invalidateChequeReconQueries(qc)
  });
}

export function useBulkClearCheques() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkClearChequePayload) => chequeApi.bulkClear(payload),
    onSuccess: () => invalidateChequeReconQueries(qc)
  });
}

export function useBounceCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string, payload: BounceChequePayload }) => 
      chequeApi.bounce(id, payload),
    onSuccess: () => invalidateChequeReconQueries(qc)
  });
}

export function useRevertCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => chequeApi.revert(id),
    onSuccess: () => invalidateChequeReconQueries(qc)
  });
}

export function useBankStatementEntries(params?: { unconsumedOnly?: boolean; limit?: number; search?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['bankStatementEntries', params ?? { unconsumedOnly: true }],
    queryFn: () => chequeApi.getBankStatementEntries(params)
  });
}
