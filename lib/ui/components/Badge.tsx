import * as React from 'react'
import { Badge as BaseBadge } from '../9ui/badge'
import { cn } from '../9ui/utils'

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
    <BaseBadge
      className={cn(
        'font-bold',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2 py-1 text-xs',
        colorClass,
        className,
      )}
    >
      {children}
    </BaseBadge>
  )
}
