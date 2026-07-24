import { useQuery } from '@tanstack/react-query'
import { hrApi } from './api'

export function useList() {
  return useQuery({ queryKey: ['hr', 'list'], queryFn: hrApi.getEmployees })
}
