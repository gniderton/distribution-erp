import { useQuery } from '@tanstack/react-query'
import { cheque_managementApi } from './api'

export function useList() {
  return useQuery({ queryKey: ['cheque-management', 'list'], queryFn: cheque_managementApi.getFinanceCheques })
}
