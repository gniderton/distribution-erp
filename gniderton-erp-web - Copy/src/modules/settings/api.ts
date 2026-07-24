import { api } from '@/lib/axios'

/** Full endpoint surface for the Settings module — extracted from the source app (Build Spec §8). */
export const settingsApi = {
  getBackupsList: () => api.get('/api/backups/list').then((r) => r.data),
  createBackupsTrigger: (payload: any) => api.post('/api/backups/trigger', payload).then((r) => r.data),
  createDseEodSync: (payload: any) => api.post('/api/dse/eod-sync', payload).then((r) => r.data),
}
