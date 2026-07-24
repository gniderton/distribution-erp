import { api } from '@/lib/axios'

/** Full endpoint surface for the Letterhead Editor module — extracted from the source app (Build Spec §8). */
export const letterhead_editorApi = {
  getLetters: () => api.get('/api/letters').then((r) => r.data),
  createLettersSend: (payload: any) => api.post('/api/letters/send', payload).then((r) => r.data),
}
