import * as React from 'react'
import { cn } from './utils'

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none',
        className,
      )}
      {...props}
    />
  )
})

Select.displayName = 'Select'
