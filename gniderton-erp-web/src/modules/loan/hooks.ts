import { useQuery } from '@tanstack/react-query'
import { loanApi } from './api'

export function useList() {
  return useQuery({ queryKey: ['loan', 'list'], queryFn: loanApi.getFinanceLoans })
}
