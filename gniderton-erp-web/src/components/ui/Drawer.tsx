import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: string
  children: ReactNode
  footer?: ReactNode
  widthClass?: string
}

/**
 * Right-side drawer used for all create/edit forms with many fields
 * (Vendor, Customer, PO, GRN, etc.) — a deliberate upgrade over the
 * previous app's all-center-modal pattern. See Build Spec §5.
 */
export function Drawer({ open, onClose, title, description, children, footer, widthClass = 'max-w-lg' }: DrawerProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    
    if (open) {
      document.addEventListener('keydown', onKey)
      // Prevent background scrolling
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className={cn('relative h-full w-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right', widthClass)}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-border-subtle">
          <div>
            <h2 className="font-display font-semibold text-lg text-ink-900">{title}</h2>
            {description && <p className="text-sm text-ink-600 mt-0.5">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-600 hover:bg-surface transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
        {footer && <div className="border-t border-border-subtle px-6 py-4 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
