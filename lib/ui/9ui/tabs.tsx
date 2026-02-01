import * as React from 'react'
import { cn } from './utils'

type TabsContextValue = {
  value: string
  setValue: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

function useTabsContext() {
  const ctx = React.useContext(TabsContext)
  if (!ctx) {
    throw new Error('Tabs components must be used within <Tabs>')
  }
  return ctx
}

export type TabsProps = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

export function Tabs({ value, defaultValue, onValueChange, children }: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? '')
  const isControlled = typeof value === 'string'
  const currentValue = isControlled ? value : uncontrolledValue

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) {
        setUncontrolledValue(next)
      }
      onValueChange?.(next)
    },
    [isControlled, onValueChange],
  )

  return <TabsContext.Provider value={{ value: currentValue, setValue }}>{children}</TabsContext.Provider>
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('inline-flex rounded-full bg-slate-800 p-1', className)} {...props} />
}

export type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string
}

export function TabsTrigger({ value, className, ...props }: TabsTriggerProps) {
  const { value: activeValue, setValue } = useTabsContext()
  const isActive = activeValue === value
  return (
    <button
      type="button"
      className={cn(
        'px-3 py-1.5 text-xs font-semibold rounded-full transition-colors',
        isActive ? 'bg-primary text-white' : 'text-slate-300 hover:text-white',
        className,
      )}
      onClick={(event) => {
        props.onClick?.(event)
        if (!event.defaultPrevented) {
          setValue(value)
        }
      }}
      {...props}
    />
  )
}

export type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string
}

export function TabsContent({ value, className, ...props }: TabsContentProps) {
  const { value: activeValue } = useTabsContext()
  if (activeValue !== value) {
    return null
  }
  return <div className={cn('mt-4', className)} {...props} />
}
