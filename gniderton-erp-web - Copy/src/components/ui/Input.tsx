import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-600/40',
        'focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('block text-xs font-medium text-ink-700 mb-1.5', className)} {...props} />
)

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-ink-900 outline-none',
        'focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
)
Select.displayName = 'Select'
