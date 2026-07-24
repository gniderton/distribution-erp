import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  tone = 'neutral',
}: {
  label: string
  value: string
  icon?: LucideIcon
  trend?: string
  tone?: 'neutral' | 'success' | 'danger'
}) {
  return (
    <div className="rounded-card border border-border-subtle bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-ink-600">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-ink-600/50" />}
      </div>
      <p className="mt-2 font-mono-figures text-2xl font-semibold text-ink-900">{value}</p>
      {trend && (
        <p className={cn('mt-1 text-xs font-medium', tone === 'success' ? 'text-success-600' : tone === 'danger' ? 'text-danger-600' : 'text-ink-600')}>
          {trend}
        </p>
      )}
    </div>
  )
}
