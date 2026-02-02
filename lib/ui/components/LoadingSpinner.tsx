import * as React from 'react'
import { cn } from '../9ui/utils'

export interface LoadingSpinnerProps {
  /** Message shown below the spinner */
  message?: string
  /** Custom height for the container */
  className?: string
}

/**
 * Centered loading spinner with optional message.
 *
 * @example
 * <LoadingSpinner message="Loading friends..." />
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  className,
}) => (
  <div className={cn('flex items-center justify-center h-64', className)}>
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
      <p className="text-slate-400">{message}</p>
    </div>
  </div>
)

