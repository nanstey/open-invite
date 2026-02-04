import * as React from 'react'

import { X } from 'lucide-react'

type HeaderImageModalHeaderProps = {
  title: string
  onClose: () => void
}

export function HeaderImageModalHeader(props: HeaderImageModalHeaderProps) {
  const { title, onClose } = props

  return (
    <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/60 shrink-0">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" type="button">
        <X className="w-6 h-6" />
      </button>
    </div>
  )
}
