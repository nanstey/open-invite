import * as React from 'react'
import { X } from 'lucide-react'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '../9ui/sheet'

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export interface SlidePanelProps {
  /** Panel title */
  title: string
  /** Close handler */
  onClose: () => void
  /** Panel content */
  children: React.ReactNode
  /** Width class for desktop (default: md:w-[480px]) */
  widthClass?: string
  /** Additional class for the panel container */
  className?: string
}

/**
 * Reusable slide-in panel from the right side.
 * Includes backdrop, header with close button, and scrollable content area.
 * 
 * On mobile, takes full screen.
 * On desktop, slides in from right with customizable width.
 * 
 * @example
 * <SlidePanel title="Details" onClose={() => setOpen(false)}>
 *   <div>Panel content here</div>
 * </SlidePanel>
 */
export function SlidePanel({ 
  title, 
  onClose, 
  children, 
  widthClass = 'md:w-[480px]',
  className,
}: SlidePanelProps) {
  return (
    <Sheet open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent
        side="right"
        className={cx(
          'fixed inset-0 md:inset-auto md:right-0 md:top-0 md:bottom-0',
          widthClass,
          'z-[70] flex flex-col shadow-2xl animate-slide-in-right',
          className,
        )}
      >
        <SheetHeader className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
          <SheetTitle className="text-lg font-bold text-white">{title}</SheetTitle>
          <SheetClose className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </SheetClose>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
