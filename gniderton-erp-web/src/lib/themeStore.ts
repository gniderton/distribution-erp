import { create } from 'zustand'

type Theme = 'teal' | 'blue' | 'purple'
type Mode = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  mode: Mode
  setTheme: (theme: Theme) => void
  setMode: (mode: Mode) => void
}

const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('erp-theme')
    if (stored === 'blue' || stored === 'purple' || stored === 'teal') {
      return stored as Theme
    }
  }
  return 'teal' // Default
}

const getInitialMode = (): Mode => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('erp-mode')
    if (stored === 'dark') return 'dark'
    if (stored === 'light') return 'light'
    // Auto-detect system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
  }
  return 'light'
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  mode: getInitialMode(),
  setTheme: (theme) => {
    localStorage.setItem('erp-theme', theme)
    if (theme === 'teal') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
    set({ theme })
  },
  setMode: (mode) => {
    localStorage.setItem('erp-mode', mode)
    if (mode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    set({ mode })
  }
}))
