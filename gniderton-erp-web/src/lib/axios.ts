import axios from 'axios'

/**
 * Single configured Axios instance for the whole app.
 * Every module's api.ts imports THIS instance — never create a new one
 * and never hardcode the base URL anywhere else.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://distribution-erp.onrender.com',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach the auth token (if present) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gniderton_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Global response handling: on 401, clear session and bounce to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('gniderton_token')
      localStorage.removeItem('gniderton_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
