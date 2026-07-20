import { useQuery } from '@tanstack/react-query'
import { credit_noteApi } from './api'

export function useList() {
  return useQuery({ queryKey: ['credit-note', 'list'], queryFn: credit_noteApi.getSalesReturns })
}
