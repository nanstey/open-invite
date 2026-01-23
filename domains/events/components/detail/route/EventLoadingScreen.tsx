import * as React from 'react'

export function EventLoadingScreen(props: { label?: string }) {
  const label = props.label ?? 'Loading...'
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-slate-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-slate-400">{label}</p>
      </div>
    </div>
  )
}


