import { type ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <p className="font-mono-figures text-[11px] tracking-widest text-brand-600 uppercase mb-1">{eyebrow}</p>
        )}
        <h1 className="font-display text-xl font-semibold text-ink-900">{title}</h1>
        {description && <p className="text-sm text-ink-600 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
