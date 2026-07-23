import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { payment_settlementApi } from './api'

export function useList() {
  return useQuery({ queryKey: ['payment-settlement', 'list'], queryFn: payment_settlementApi.getFinanceReconciliationList })
}

export function useReconciliationDetails(reportId: string | number | null) {
  return useQuery({
    queryKey: ['payment-settlement', 'details', reportId],
    queryFn: () => payment_settlementApi.getFinanceReconciliationDetails(reportId!),
    enabled: !!reportId
  })
}

export function useBulkUpdateReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: payment_settlementApi.createFinanceReconciliationBulkUpdate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-settlement'] })
    }
  })
}
