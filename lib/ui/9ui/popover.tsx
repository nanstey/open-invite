import * as React from 'react'
import { cn } from './utils'

type PopoverContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const PopoverContext = React.createContext<PopoverContextValue | undefined>(undefined)

function usePopoverContext() {
  const ctx = React.useContext(PopoverContext)
  if (!ctx) {
    throw new Error('Popover components must be used within <Popover>')
  }
  return ctx
}

export type PopoverProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  children: React.ReactNode
}

export function Popover({ open, defaultOpen = false, onOpenChange, className, children }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = typeof open === 'boolean'
  const currentOpen = isControlled ? open : uncontrolledOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next)
      }
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )

  return (
    <PopoverContext.Provider value={{ open: currentOpen, setOpen }}>
      <div className={cn('relative inline-flex', className)}>{children}</div>
    </PopoverContext.Provider>
  )
}

export function PopoverTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = usePopoverContext()
  return (
    <button
      type="button"
      className={className}
      aria-expanded={open}
      onClick={(event) => {
        props.onClick?.(event)
        if (!event.defaultPrevented) {
          setOpen(!open)
        }
      }}
      {...props}
    />
  )
}

export function PopoverContent({
  className,
  align = 'center',
  staticPosition = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'center' | 'end'; staticPosition?: boolean }) {
  const { open } = usePopoverContext()
  if (!open) {
    return null
  }

  if (staticPosition) {
    return (
      <div
        className={cn(
          'z-50 w-64 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-white shadow-xl',
          className,
        )}
        {...props}
      />
    )
  }

  const alignment = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  }

  return (
    <div
      className={cn(
        'absolute z-50 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-white shadow-xl',
        alignment[align],
        className,
      )}
      {...props}
    />
  )
}
