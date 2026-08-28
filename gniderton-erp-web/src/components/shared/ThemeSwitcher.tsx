import { useState, useRef, useEffect } from 'react'
import { Palette, Check, Moon, Sun } from 'lucide-react'
import { useThemeStore } from '../../lib/themeStore'

export function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const { theme, setTheme, mode, setMode } = useThemeStore()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const themes = [
    { id: 'teal', label: 'Deep Teal', color: '#2f7f74' },
    { id: 'blue', label: 'Corporate Blue', color: '#3b82f6' },
    { id: 'purple', label: 'Royal Purple', color: '#9333ea' }
  ] as const

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-surface-raised border border-transparent hover:border-border-subtle transition-colors flex items-center justify-center text-ink-600 hover:text-brand-600"
        title="Change Appearance"
      >
        <Palette size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-surface-raised rounded-lg shadow-xl border border-border-subtle overflow-hidden z-50">
          
          <div className="px-3 py-2 border-b border-border-subtle bg-surface/50">
            <span className="text-xs font-semibold text-ink-700 uppercase tracking-wider">Appearance Mode</span>
          </div>
          <div className="p-2 flex gap-2">
            <button
              onClick={() => setMode('light')}
              className={`flex-1 py-2 flex justify-center items-center gap-2 rounded-md border text-sm transition-colors ${mode === 'light' ? 'bg-surface-raised border-brand-500 text-brand-600 font-medium shadow-sm' : 'border-transparent text-ink-600 hover:bg-surface'}`}
            >
              <Sun size={16} /> Light
            </button>
            <button
              onClick={() => setMode('dark')}
              className={`flex-1 py-2 flex justify-center items-center gap-2 rounded-md border text-sm transition-colors ${mode === 'dark' ? 'bg-surface-raised border-brand-500 text-brand-600 font-medium shadow-sm' : 'border-transparent text-ink-600 hover:bg-surface'}`}
            >
              <Moon size={16} /> Dark
            </button>
          </div>

          <div className="px-3 py-2 border-t border-b border-border-subtle bg-surface/50">
            <span className="text-xs font-semibold text-ink-700 uppercase tracking-wider">Color Theme</span>
          </div>
          <div className="py-1">
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id)
                }}
                className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-surface-raised transition-colors ${theme === t.id ? 'bg-brand-50/50 text-brand-900 font-medium' : 'text-ink-700'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full border border-ink-950/10" style={{ backgroundColor: t.color }}></span>
                  {t.label}
                </div>
                {theme === t.id && <Check size={16} className="text-brand-600" />}
              </button>
            ))}
          </div>

        </div>
      )}
    </div>
  )
}
