import * as React from 'react'

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export interface BadgeProps {
  children: React.ReactNode
  /** Tailwind color classes (bg, text, border) */
  colorClass?: string
  /** Size variant */
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Reusable badge component for status, type, and importance indicators.
 * 
 * @example
 * <Badge colorClass="bg-blue-500/20 text-blue-300 border-blue-500/40">Active</Badge>
 */
export function Badge({ children, colorClass, size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={cx(
        'rounded font-bold border',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2 py-1 text-xs',
        colorClass,
        className,
      )}
    >
      {children}
    </span>
  )
}

