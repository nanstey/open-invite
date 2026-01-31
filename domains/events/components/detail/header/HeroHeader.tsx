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
  const [isDragging, setIsDragging] = React.useState(false)
  const dragStartRef = React.useRef<{ y: number; startPosition: number } | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

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

  const handleDragStart = (clientY: number) => {
    if (!isAdjusting) return
    setIsDragging(true)
    dragStartRef.current = { y: clientY, startPosition: draftPositionY }
  }

  const handleDragMove = (clientY: number) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return
    const containerHeight = containerRef.current.offsetHeight
    const deltaY = clientY - dragStartRef.current.y
    // Dragging down = show more of the top = decrease position
    // Dragging up = show more of the bottom = increase position
    const sensitivity = 100 / containerHeight // Full drag = full range
    const newPosition = dragStartRef.current.startPosition - deltaY * sensitivity
    setDraftPositionY(Math.min(100, Math.max(0, newPosition)))
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    dragStartRef.current = null
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isAdjusting) return
    e.preventDefault()
    handleDragStart(e.clientY)
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isAdjusting) return
    handleDragStart(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY)
  }

  // Global mouse move/up listeners
  React.useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY)
    }

    const handleMouseUp = () => {
      handleDragEnd()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-56 md:h-72 bg-slate-800 ${isAdjusting ? 'cursor-grab' : ''} ${isDragging ? 'cursor-grabbing' : ''}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleDragEnd}
    >
      <img
        src={headerImageSrc}
        className={`w-full h-full object-cover select-none ${isAdjusting ? 'pointer-events-none' : ''}`}
        style={{ objectPosition: `center ${isAdjusting ? draftPositionY : resolvedPositionY}%` }}
        alt="cover"
        draggable={false}
      />
      <div className={`absolute inset-0 bg-gradient-to-t from-background/95 via-background/45 to-transparent ${isAdjusting ? 'pointer-events-none' : ''}`} />

      {showBackButton && onBack && !isAdjusting ? (
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

      {!isAdjusting ? (
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
      ) : null}

      {isAdjusting ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-white/80">
            <Move className="w-8 h-8 animate-pulse" />
            <span className="text-sm font-medium">Drag to reposition</span>
          </div>
        </div>
      ) : null}

      {isAdjusting ? (
        <div className="absolute bottom-8 left-0 right-0 pointer-events-none">
          <div className="max-w-6xl mx-auto px-4 md:px-6 flex justify-end">
            <div className="flex items-center gap-3 pointer-events-auto">
              <button
                type="button"
                onClick={handleCancelAdjust}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAdjust}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 text-white transition-all shadow-lg shadow-primary/25"
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

