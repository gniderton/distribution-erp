import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from './api'

export function useList() {
  return useQuery({ queryKey: ['transactions', 'list'], queryFn: transactionsApi.getFinanceExpenses })
}
