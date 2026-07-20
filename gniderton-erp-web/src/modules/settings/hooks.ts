import { useQuery } from '@tanstack/react-query'
import { settingsApi } from './api'

export function useList() {
  return useQuery({ queryKey: ['settings', 'list'], queryFn: settingsApi.getBackupsList })
}
