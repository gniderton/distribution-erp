import { type ReactNode } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  widthClass?: string
}

/** Small centered dialog — reserved for short confirmations only (see Build Spec §5). */
export function Dialog({ open, onClose, title, children, footer, widthClass = "max-w-sm" }: DialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/40" onClick={onClose} />
      <div className={`relative flex flex-col max-h-[90vh] w-full ${widthClass} rounded-card bg-white shadow-2xl p-6`}>
        <h3 className="font-display font-semibold text-base text-ink-900 shrink-0">{title}</h3>
        <div className="mt-4 text-sm text-ink-600 overflow-y-auto min-h-0 flex-1 -mx-6 px-6">{children}</div>
        {footer && <div className="mt-5 pt-4 border-t border-border-subtle flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  )
}
