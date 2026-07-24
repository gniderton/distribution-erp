import { useQuery } from '@tanstack/react-query'
import { gstApi } from './api'

export function useList() {
  return useQuery({ queryKey: ['gst', 'list'], queryFn: gstApi.getFinanceGstGstr1 })
}
