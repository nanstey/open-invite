import * as React from 'react'

type Size = 'sm' | 'md' | 'lg'

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function sizeClasses(size: Size | undefined) {
  switch (size) {
    case 'sm':
      return 'text-sm rounded-lg px-3 py-2.5'
    case 'lg':
      return 'text-base rounded-lg px-4 py-3'
    case 'md':
    default:
      return 'text-sm rounded-lg px-3 py-2'
  }
}

function variantClasses(variant: 'surface' | 'muted' | undefined) {
  switch (variant) {
    case 'muted':
      return 'bg-slate-800 border-slate-700'
    case 'surface':
    default:
      return 'bg-slate-900 border-slate-700'
  }
}

export type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  size?: Size
  variant?: 'surface' | 'muted'
}

export function FormInput({ className, size, variant, ...props }: FormInputProps) {
  return (
    <input
      {...props}
      className={cx(
        'w-full border text-white outline-none focus:border-primary placeholder:text-slate-500',
        variantClasses(variant),
        sizeClasses(size),
        className,
      )}
    />
  )
}

export type FormSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  size?: Size
  variant?: 'surface' | 'muted'
  wrapperClassName?: string
  caretClassName?: string
}

export function FormSelect({
  className,
  size,
  variant,
  wrapperClassName,
  caretClassName,
  children,
  ...props
}: FormSelectProps) {
  return (
    <div className={cx('relative', wrapperClassName)}>
      <select
        {...props}
        className={cx(
          'w-full border text-white outline-none focus:border-primary appearance-none',
          variantClasses(variant),
          sizeClasses(size),
          // keep text clear of the caret
          'pr-10',
          className,
        )}
      >
        {children}
      </select>
      <div className={cx('pointer-events-none absolute inset-y-0 right-4 flex items-center', caretClassName)}>
        <div className="w-2 h-2 border-r border-b border-slate-400 rotate-45" />
      </div>
    </div>
  )
}


