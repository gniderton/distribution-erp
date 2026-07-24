import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chequeApi } from './api';
import type { ChequeFilter, ClearChequePayload, BulkClearChequePayload, BounceChequePayload } from './types';

export function useCheques(filters?: ChequeFilter) {
  return useQuery({
    queryKey: ['cheques', filters],
    queryFn: () => chequeApi.list(filters)
  });
}

export function useClearCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string, payload: ClearChequePayload }) => 
      chequeApi.clear(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cheques'] })
  });
}

export function useBulkClearCheques() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkClearChequePayload) => chequeApi.bulkClear(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cheques'] })
  });
}

export function useBounceCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string, payload: BounceChequePayload }) => 
      chequeApi.bounce(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cheques'] })
  });
}

export function useRevertCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => chequeApi.revert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cheques'] })
  });
}
