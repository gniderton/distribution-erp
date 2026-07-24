import { useQuery } from '@tanstack/react-query'
import { assetsApi } from './api'

export function useList() {
  return useQuery({ queryKey: ['assets', 'list'], queryFn: assetsApi.getAssets })
}
