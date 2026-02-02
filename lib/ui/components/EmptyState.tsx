import * as React from 'react'
import { cn } from '../9ui/utils'

export interface EmptyStateProps {
  /** Icon element to display */
  icon: React.ReactNode
  /** Message to display */
  message: string
  /** Optional additional content (e.g., action button) */
  children?: React.ReactNode
  /** Custom class name */
  className?: string
}

/**
 * Empty state component with icon and message.
 *
 * @example
 * <EmptyState
 *   icon={<UserPlus className="w-full h-full" />}
 *   message="No friends yet. Add some friends to get started!"
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  message,
  children,
  className,
}) => (
  <div className={cn('text-center py-12 text-slate-400', className)}>
    <div className="w-12 h-12 mx-auto mb-4 opacity-50">{icon}</div>
    <p>{message}</p>
    {children}
  </div>
)

