import { Bell, Search, ChevronDown, LogOut } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { useState } from 'react'

export function Topbar() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="h-14 shrink-0 border-b border-border-subtle bg-white flex items-center justify-between px-5 sticky top-0 z-30">
      <div className="relative max-w-sm w-full">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-600/40" />
        <input
          placeholder="Search vendors, customers, invoices…"
          className="w-full rounded-lg border border-border-subtle bg-surface pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition"
        />
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-surface transition">
          <Bell className="h-4 w-4 text-ink-700" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-accent-500" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg pl-1 pr-2 py-1 hover:bg-surface transition"
          >
            <div className="h-7 w-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-medium font-display">
              {(user?.name || 'U').slice(0, 1).toUpperCase()}
            </div>
            <span className="text-sm text-ink-900 font-medium">{user?.name || 'User'}</span>
            <ChevronDown className="h-3.5 w-3.5 text-ink-600" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-lg border border-border-subtle bg-white shadow-lg py-1">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-surface transition"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
