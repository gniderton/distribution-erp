import { NavLink } from 'react-router-dom'
import { NAV_GROUPS } from './navConfig'
import { useAppStore } from '@/store/useAppStore'
import { ChevronsLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 bg-ink-900 text-white flex flex-col shrink-0 transition-all duration-200',
        sidebarCollapsed ? 'w-[64px]' : 'w-[248px]'
      )}
    >
      <div className="flex items-center gap-2 px-4 h-14 border-b border-white/10 shrink-0">
        <span className="font-mono-figures text-accent-400 text-xs tracking-widest">GDT</span>
        {!sidebarCollapsed && <span className="font-display font-semibold text-sm tracking-tight">GNIDERTON</span>}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4 px-3">
            {!sidebarCollapsed && (
              <p className="px-2 mb-1 text-[10px] font-medium uppercase tracking-widest text-white/35">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition relative',
                      isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-accent-400" />}
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="flex-1 truncate">{item.label}</span>
                      )}
                      {!sidebarCollapsed && (
                        <span className="font-mono-figures text-[10px] text-white/30">{item.code}</span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <button
        onClick={toggleSidebar}
        className="flex items-center gap-2 px-4 h-11 border-t border-white/10 text-white/50 hover:text-white transition text-xs shrink-0"
      >
        <ChevronsLeft className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
        {!sidebarCollapsed && 'Collapse'}
      </button>
    </aside>
  )
}
