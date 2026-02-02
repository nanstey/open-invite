import * as React from 'react'
import { cn } from '../9ui/utils'

export interface SectionHeaderProps {
  /** Section title */
  title: string
  /** Optional count or status text on the right */
  count?: string
  /** Custom class name */
  className?: string
}

/**
 * Section header with title and optional count/status.
 *
 * @example
 * <SectionHeader title="Pending Friend Requests" count="3 Pending" />
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  count,
  className,
}) => (
  <div className={cn('flex justify-between items-center px-1', className)}>
    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">
      {title}
    </h3>
    {count && (
      <div className="text-xs text-slate-500 font-semibold">{count}</div>
    )}
  </div>
)

