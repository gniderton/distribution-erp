import { useQuery } from '@tanstack/react-query'
import { supply_chainApi } from './api'

export function useList() {
  return useQuery({ queryKey: ['supply-chain', 'list'], queryFn: supply_chainApi.getDeliveryTrips })
}
