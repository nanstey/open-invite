import * as React from 'react'

export function AboutCard(props: {
  isEditMode: boolean
  description: string
  onChangeDescription?: (next: string) => void
  error?: string
}) {
  const { isEditMode, description, onChangeDescription, error } = props

  return (
    <div className="bg-surface border border-slate-700 rounded-2xl p-5">
      <h2 className="text-lg font-bold text-white mb-3">About</h2>
      {isEditMode ? (
        <textarea
          value={description}
          onChange={(e) => onChangeDescription?.(e.target.value)}
          placeholder="What’s the vibe?"
          required
          className={`w-full bg-slate-900 border rounded-lg py-3 px-4 text-white outline-none h-32 resize-none ${
            error ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-primary'
          }`}
        />
      ) : (
        <div className="text-slate-300 leading-relaxed text-base whitespace-pre-wrap">{description}</div>
      )}
      {isEditMode && error ? <div className="text-xs text-red-400 mt-2">{error}</div> : null}
    </div>
  )
}


