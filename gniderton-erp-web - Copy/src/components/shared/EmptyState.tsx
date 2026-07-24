import { type LucideIcon, Inbox } from 'lucide-react'

export function EmptyState({
  title = 'Nothing here yet',
  description,
  icon: Icon = Inbox,
  action,
}: {
  title?: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="h-11 w-11 rounded-full bg-ink-900/5 flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-ink-600" />
      </div>
      <p className="font-display font-medium text-ink-900">{title}</p>
      {description && <p className="text-sm text-ink-600 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="h-11 w-11 rounded-full bg-danger-500/10 flex items-center justify-center mb-3">
        <span className="text-danger-600 text-lg">!</span>
      </div>
      <p className="font-display font-medium text-ink-900">Couldn't load this data</p>
      <p className="text-sm text-ink-600 mt-1 max-w-sm">
        {message || 'Something went wrong reaching the server. Try again in a moment.'}
      </p>
    </div>
  )
}
