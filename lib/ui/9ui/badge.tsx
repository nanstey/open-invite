import * as React from 'react'
import { cn } from './utils'

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'muted'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
        variant === 'default' ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-700 bg-slate-900 text-slate-300',
        className,
      )}
      {...props}
    />
  )
}
