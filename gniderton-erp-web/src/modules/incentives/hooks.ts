import { useQuery } from '@tanstack/react-query'
import { incentivesApi } from './api'

export function useList() {
  return useQuery({ queryKey: ['incentives', 'list'], queryFn: incentivesApi.getTargetsPlans })
}
