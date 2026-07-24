import { AppProviders } from './app/providers'
import { AppRoutes } from './app/routes'
import { Toaster } from 'react-hot-toast'

export default function App() {
  return (
    <AppProviders>
      <Toaster position="top-right" />
      <AppRoutes />
    </AppProviders>
  )
}
