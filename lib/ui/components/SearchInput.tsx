import * as React from 'react'
import { Search } from 'lucide-react'

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Container class name */
  wrapperClassName?: string
}

function sizeClasses(size: SearchInputProps['size']) {
  switch (size) {
    case 'sm':
      return { input: 'pl-9 pr-4 py-2 text-sm rounded-lg', icon: 'left-3 w-4 h-4' }
    case 'lg':
      return { input: 'pl-12 pr-4 py-3 text-base rounded-xl', icon: 'left-4 w-5 h-5' }
    case 'md':
    default:
      return { input: 'pl-10 pr-4 py-2.5 text-sm rounded-lg', icon: 'left-3 w-4 h-4' }
  }
}

/**
 * Search input with icon.
 * 
 * @example
 * <SearchInput
 *   value={searchTerm}
 *   onChange={(e) => setSearchTerm(e.target.value)}
 *   placeholder="Search..."
 * />
 */
export function SearchInput({ 
  size = 'md', 
  wrapperClassName, 
  className,
  ...props 
}: SearchInputProps) {
  const classes = sizeClasses(size)
  
  return (
    <div className={cx('relative', wrapperClassName)}>
      <Search 
        className={cx(
          'absolute top-1/2 -translate-y-1/2 text-slate-400',
          classes.icon
        )} 
      />
      <input
        type="text"
        {...props}
        className={cx(
          'w-full bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 outline-none focus:border-primary',
          classes.input,
          className,
        )}
      />
    </div>
  )
}

