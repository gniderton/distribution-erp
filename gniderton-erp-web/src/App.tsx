import { useEffect } from 'react'
import { AppProviders } from './app/providers'
import { AppRoutes } from './app/routes'
import { Toaster } from 'react-hot-toast'
import { useThemeStore } from './lib/themeStore'

export default function App() {
  const { theme, mode } = useThemeStore()

  useEffect(() => {
    if (theme === 'teal') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }

    if (mode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme, mode])

  return (
    <AppProviders>
      <Toaster position="top-right" />
      <AppRoutes />
    </AppProviders>
  )
}
