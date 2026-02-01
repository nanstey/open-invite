import * as React from 'react'
import { cn } from './utils'

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border border-slate-600 bg-slate-900 text-primary focus:ring-2 focus:ring-primary/40',
        className,
      )}
      {...props}
    />
  )
})

Checkbox.displayName = 'Checkbox'
