import { useQuery } from '@tanstack/react-query'
import { payment_settlementApi } from './api'

export function useList() {
  return useQuery({ queryKey: ['payment-settlement', 'list'], queryFn: payment_settlementApi.getFinanceReconciliationList })
}
