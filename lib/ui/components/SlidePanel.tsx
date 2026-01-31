import * as React from 'react'
import { X } from 'lucide-react'

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
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] md:hidden"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        className={cx(
          'fixed inset-0 md:inset-auto md:right-0 md:top-0 md:bottom-0',
          widthClass,
          'bg-slate-900 z-[70] flex flex-col border-l border-slate-700 shadow-2xl animate-slide-in-right',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {children}
        </div>
      </div>
    </>
  )
}

