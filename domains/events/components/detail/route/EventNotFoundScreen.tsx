
import { ArrowLeft } from 'lucide-react'

export function EventNotFoundScreen(props: {
  title?: string
  message: string
  primaryLabel: string
  onPrimary: () => void
  onBack?: () => void
  primaryClassName?: string
}) {
  const {
    title = 'Event not found',
    message,
    primaryLabel,
    onPrimary,
    onBack,
    primaryClassName = 'mt-6 px-5 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors',
  } = props

  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-slate-100 relative">
      {onBack ? (
        <div className="absolute top-4 left-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="bg-black/40 hover:bg-black/60 p-2 rounded-full text-white backdrop-blur transition-all border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      ) : null}

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-xl font-bold text-white">{title}</div>
          <div className="text-slate-400 mt-2">{message}</div>
          <button type="button" onClick={onPrimary} className={primaryClassName}>
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  )
}


