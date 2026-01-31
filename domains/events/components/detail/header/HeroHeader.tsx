import * as React from 'react'
import { ArrowLeft, Image as ImageIcon, Move } from 'lucide-react'
import { getTheme } from '../../../../../lib/constants'

export function HeroHeader(props: {
  eventId: string
  headerImageUrl?: string | null
  headerImagePositionY?: number
  activityType: string
  title: string
  showBackButton: boolean
  onBack?: () => void
  showHeaderImagePicker: boolean
  onOpenHeaderImagePicker?: () => void
  onSaveHeaderImagePositionY?: (positionY: number) => void
}) {
  const {
    eventId,
    headerImageUrl,
    headerImagePositionY,
    activityType,
    title,
    showBackButton,
    onBack,
    showHeaderImagePicker,
    onOpenHeaderImagePicker,
    onSaveHeaderImagePositionY,
  } = props

  const headerImageSrc = headerImageUrl || `https://picsum.photos/seed/${eventId}/1200/800`
  const themeBgClass = getTheme(activityType).bg
  const resolvedPositionY = Math.min(100, Math.max(0, headerImagePositionY ?? 50))
  const [isAdjusting, setIsAdjusting] = React.useState(false)
  const [draftPositionY, setDraftPositionY] = React.useState(resolvedPositionY)

  React.useEffect(() => {
    if (!isAdjusting) {
      setDraftPositionY(resolvedPositionY)
    }
  }, [isAdjusting, resolvedPositionY])

  const handleOpenAdjust = () => {
    setDraftPositionY(resolvedPositionY)
    setIsAdjusting(true)
  }

  const handleCancelAdjust = () => {
    setDraftPositionY(resolvedPositionY)
    setIsAdjusting(false)
  }

  const handleSaveAdjust = () => {
    onSaveHeaderImagePositionY?.(draftPositionY)
    setIsAdjusting(false)
  }

  return (
    <div className="relative w-full h-56 md:h-72 bg-slate-800">
      <img
        src={headerImageSrc}
        className="w-full h-full object-cover"
        style={{ objectPosition: `center ${isAdjusting ? draftPositionY : resolvedPositionY}%` }}
        alt="cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/45 to-transparent" />

      {showBackButton && onBack ? (
        <div className="absolute top-4 left-4">
          <button
            onClick={onBack}
            className="bg-black/40 hover:bg-black/60 p-2 rounded-full text-white backdrop-blur transition-all border border-white/10"
            type="button"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      ) : null}

      <div className="absolute bottom-0 left-0 right-0">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pb-5">
          <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white ${themeBgClass}`}>{activityType}</div>
          <div className="flex items-end justify-between gap-4 mt-2 mb-4 h-12">
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight min-w-0">{title || 'Untitled invite'}</h1>
            {showHeaderImagePicker ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenAdjust}
                  className="bg-black/30 hover:bg-black/50 p-3 rounded-xl text-white backdrop-blur transition-all border border-white/10"
                  aria-label="Adjust header image position"
                  title="Adjust header image position"
                >
                  <Move className="w-6 h-6 md:w-5 md:h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenHeaderImagePicker?.()}
                  className="bg-black/30 hover:bg-black/50 p-3 rounded-xl text-white backdrop-blur transition-all border border-white/10"
                  aria-label="Choose header image"
                  title="Choose header image"
                >
                  <ImageIcon className="w-6 h-6 md:w-5 md:h-5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isAdjusting ? (
        <div className="absolute inset-x-4 bottom-4 md:bottom-6">
          <div className="bg-black/60 border border-white/10 rounded-2xl p-4 backdrop-blur text-white space-y-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/70">
              <span>Header image position</span>
              <span>{Math.round(draftPositionY)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={draftPositionY}
              onChange={(event) => setDraftPositionY(Number(event.target.value))}
              className="w-full accent-white"
              aria-label="Header image vertical position"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelAdjust}
                className="px-3 py-1.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAdjust}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white text-black hover:bg-white/90 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

