import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from './utils'

type SheetContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue | undefined>(undefined)

function useSheetContext() {
  const ctx = React.useContext(SheetContext)
  if (!ctx) {
    throw new Error('Sheet components must be used within <Sheet>')
  }
  return ctx
}

export type SheetProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Sheet({ open, defaultOpen = false, onOpenChange, children }: SheetProps) {
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

  return <SheetContext.Provider value={{ open: currentOpen, setOpen }}>{children}</SheetContext.Provider>
}

export function SheetTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useSheetContext()
  return (
    <button
      type="button"
      className={className}
      onClick={(event) => {
        props.onClick?.(event)
        if (!event.defaultPrevented) {
          setOpen(true)
        }
      }}
      {...props}
    />
  )
}

export function SheetClose({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useSheetContext()
  return (
    <button
      type="button"
      className={className}
      onClick={(event) => {
        props.onClick?.(event)
        if (!event.defaultPrevented) {
          setOpen(false)
        }
      }}
      {...props}
    />
  )
}

type SheetContentProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: 'right' | 'left' | 'bottom'
}

export function SheetContent({ className, side = 'right', children, ...props }: SheetContentProps) {
  const { open, setOpen } = useSheetContext()

  if (!open) {
    return null
  }

  const sideClasses = {
    right: 'right-0 top-0 h-full w-full max-w-md',
    left: 'left-0 top-0 h-full w-full max-w-md',
    bottom: 'bottom-0 left-0 w-full max-h-[85vh]',
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      <div
        className="fixed inset-0 bg-black/70"
        onClick={() => setOpen(false)}
        role="presentation"
      />
      <div
        className={cn(
          'fixed bg-slate-900 text-white shadow-xl border border-slate-700',
          sideClasses[side],
          side === 'bottom' ? 'rounded-t-2xl' : 'rounded-l-2xl',
          className,
        )}
        role="dialog"
        aria-modal="true"
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-slate-800 px-6 py-4', className)} {...props} />
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />
}

export function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-slate-400', className)} {...props} />
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-t border-slate-800 px-6 py-4', className)} {...props} />
}
