import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'brand'

const tones: Record<Tone, string> = {
  neutral: 'bg-ink-900/5 text-ink-700',
  success: 'bg-success-500/10 text-success-600',
  warn: 'bg-warn-500/10 text-accent-600',
  danger: 'bg-danger-500/10 text-danger-600',
  brand: 'bg-brand-500/10 text-brand-700',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium font-mono-figures', tones[tone], className)}>
      {children}
    </span>
  )
}
