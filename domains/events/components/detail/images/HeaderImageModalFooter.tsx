import * as React from 'react'

type HeaderImageModalFooterProps = {
  onCancel: () => void
  onConfirm: () => void
  isSaving: boolean
  canSave: boolean
}

export function HeaderImageModalFooter(props: HeaderImageModalFooterProps) {
  const { onCancel, onConfirm, isSaving, canSave } = props

  return (
    <div className="p-4 border-t border-slate-700 bg-slate-900/60 flex justify-end items-center shrink-0">
      <div className="flex gap-3 w-full sm:w-auto">
        <button
          onClick={onCancel}
          className="w-1/2 sm:w-auto px-5 py-3 rounded-xl text-slate-200 hover:bg-slate-800 text-base font-semibold"
          type="button"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSave || isSaving}
          onClick={onConfirm}
          className="w-1/2 sm:w-auto px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary text-white text-base font-bold shadow-lg shadow-primary/20"
        >
          {isSaving ? 'Updating…' : 'Update'}
        </button>
      </div>
    </div>
  )
}
