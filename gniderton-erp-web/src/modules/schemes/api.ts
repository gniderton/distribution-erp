import { api } from '@/lib/axios'

export const schemeApi = {
  list: (params: any) => api.get('/api/schemes', { params }).then(res => res.data),
  getById: (id: string) => api.get(`/api/schemes/${id}`).then(res => res.data),
  getUsage: (id: string, params: any) => api.get(`/api/schemes/${id}/usage`, { params }).then(res => res.data),
  create: (data: any) => api.post('/api/schemes', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/api/schemes/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/api/schemes/${id}`).then(res => res.data),
  toggle: (id: string) => api.patch(`/api/schemes/${id}/toggle`).then(res => res.data)
}
