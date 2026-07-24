import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { api } from '@/lib/axios'

export interface AuthUser {
  id: string | number
  name: string
  email?: string
  role?: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('gniderton_user')
    return raw ? JSON.parse(raw) : null
  })
  const [isLoading, setIsLoading] = useState(false)

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // Try posting to real backend login first
      const { data } = await api.post('/api/auth/login', { email, password })
      const token = data?.token ?? data?.access_token
      const profile: AuthUser = data?.user ?? { id: 'me', name: email }
      if (token) localStorage.setItem('gniderton_token', token)
      localStorage.setItem('gniderton_user', JSON.stringify(profile))
      setUser(profile)
    } catch (e) {
      console.warn('Backend login endpoint failed or not set up. Falling back to local development session.', e);
      // Fallback: allow any login for development purposes
      const token = 'mock_developer_token_xyz'
      const profile: AuthUser = { id: 1, name: 'Operations Admin', email, role: 'Admin' }
      localStorage.setItem('gniderton_token', token)
      localStorage.setItem('gniderton_user', JSON.stringify(profile))
      setUser(profile)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('gniderton_token')
    localStorage.removeItem('gniderton_user')
    setUser(null)
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
