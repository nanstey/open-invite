import * as React from 'react'
import { ArrowLeft, Image as ImageIcon } from 'lucide-react'
import { getTheme } from '../../../../../lib/constants'

export function HeroHeader(props: {
  eventId: string
  headerImageUrl?: string | null
  activityType: string
  title: string
  showBackButton: boolean
  onBack?: () => void
  showHeaderImagePicker: boolean
  onOpenHeaderImagePicker?: () => void
}) {
  const {
    eventId,
    headerImageUrl,
    activityType,
    title,
    showBackButton,
    onBack,
    showHeaderImagePicker,
    onOpenHeaderImagePicker,
  } = props

  const headerImageSrc = headerImageUrl || `https://picsum.photos/seed/${eventId}/1200/800`
  const themeBgClass = getTheme(activityType).bg

  return (
    <div className="relative w-full h-56 md:h-72 bg-slate-800">
      <img src={headerImageSrc} className="w-full h-full object-cover" alt="cover" />
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
              <button
                type="button"
                onClick={() => onOpenHeaderImagePicker?.()}
                className="shrink-0 bg-black/30 hover:bg-black/50 p-3 rounded-xl text-white backdrop-blur transition-all border border-white/10"
                aria-label="Choose header image"
                title="Choose header image"
              >
                <ImageIcon className="w-6 h-6 md:w-5 md:h-5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}


