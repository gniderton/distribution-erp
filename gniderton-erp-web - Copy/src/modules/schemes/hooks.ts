import { useQuery } from '@tanstack/react-query'
import { schemesApi } from './api'

export function useList() {
  return useQuery({ queryKey: ['schemes', 'list'], queryFn: schemesApi.getSchemes })
}
