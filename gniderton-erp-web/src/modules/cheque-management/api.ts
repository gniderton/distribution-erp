import { api } from '@/lib/axios';
import type { Cheque, ChequeFilter, ClearChequePayload, BulkClearChequePayload, BounceChequePayload } from './types';

export const chequeApi = {
  list: async (filters?: ChequeFilter) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.party_type) params.append('party_type', filters.party_type);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    
    const { data } = await api.get<Cheque[]>(`/cheques?${params.toString()}`);
    return data;
  },

  clear: async (id: number | string, payload: ClearChequePayload) => {
    const { data } = await api.post(`/cheques/${id}/clear`, payload);
    return data;
  },

  bulkClear: async (payload: BulkClearChequePayload) => {
    const { data } = await api.post(`/cheques/bulk-clear`, payload);
    return data;
  },

  bounce: async (id: number | string, payload: BounceChequePayload) => {
    const { data } = await api.post(`/cheques/${id}/bounce`, payload);
    return data;
  },

  revert: async (id: number | string) => {
    const { data } = await api.post(`/cheques/${id}/revert`);
    return data;
  }
};
