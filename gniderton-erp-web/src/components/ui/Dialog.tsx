import { type ReactNode } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

/** Small centered dialog — reserved for short confirmations only (see Build Spec §5). */
export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-card bg-white shadow-2xl p-6">
        <h3 className="font-display font-semibold text-base text-ink-900">{title}</h3>
        <div className="mt-2 text-sm text-ink-600">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
