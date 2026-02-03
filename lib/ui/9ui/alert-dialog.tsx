import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from './utils'

type AlertDialogContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const AlertDialogContext = React.createContext<AlertDialogContextValue | undefined>(undefined)

function useAlertDialogContext() {
  const ctx = React.useContext(AlertDialogContext)
  if (!ctx) {
    throw new Error('AlertDialog components must be used within <AlertDialog>')
  }
  return ctx
}

export type AlertDialogProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function AlertDialog({ open, defaultOpen = false, onOpenChange, children }: AlertDialogProps) {
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
    <AlertDialogContext.Provider value={{ open: currentOpen, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  )
}

type AlertDialogActionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  render?: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => React.ReactNode
}

export function AlertDialogTrigger({ className, render, ...props }: AlertDialogActionProps) {
  const { setOpen } = useAlertDialogContext()
  const triggerProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {
    type: 'button',
    className,
    ...props,
    onClick: (event) => {
      props.onClick?.(event)
      if (!event.defaultPrevented) {
        setOpen(true)
      }
    },
  }
  if (render) return <>{render(triggerProps)}</>
  return <button {...triggerProps} />
}

export function AlertDialogClose({ className, render, ...props }: AlertDialogActionProps) {
  const { setOpen } = useAlertDialogContext()
  const closeProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {
    type: 'button',
    className,
    ...props,
    onClick: (event) => {
      props.onClick?.(event)
      if (!event.defaultPrevented) {
        setOpen(false)
      }
    },
  }
  if (render) return <>{render(closeProps)}</>
  return <button {...closeProps} />
}

export function AlertDialogContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useAlertDialogContext()

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70" role="presentation" />
      <div
        className={cn(
          'relative z-[1001] w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-lg',
          className,
        )}
        role="alertdialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 space-y-1', className)} {...props} />
}

export function AlertDialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />
}

export function AlertDialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-slate-400', className)} {...props} />
}

export function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-6 flex items-center justify-end gap-2', className)} {...props} />
}
