import React from 'react'

type ComingSoonState = {
  open: boolean
  x: number
  y: number
  message: string
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function useComingSoonPopover(options?: { durationMs?: number }) {
  const durationMs = options?.durationMs ?? 1400

  const [state, setState] = React.useState<ComingSoonState>({
    open: false,
    x: 0,
    y: 0,
    message: 'Coming Soon!',
  })

  const hideTimerRef = React.useRef<number | null>(null)

  const hide = React.useCallback(() => {
    setState((s) => (s.open ? { ...s, open: false } : s))
  }, [])

  const show = React.useCallback(
    (e: { clientX: number; clientY: number }, message = 'Coming Soon!') => {
      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }

      setState({
        open: true,
        x: e.clientX,
        y: e.clientY,
        message,
      })

      hideTimerRef.current = window.setTimeout(() => {
        hide()
      }, durationMs)
    },
    [durationMs, hide],
  )

  React.useEffect(() => {
    return () => {
      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }
  }, [])

  return { state, show, hide }
}

export function ComingSoonPopover(props: { state: ComingSoonState }) {
  const { state } = props
  const { open, x, y, message } = state

  const ref = React.useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = React.useState({ left: x, top: y })

  React.useLayoutEffect(() => {
    if (!open) return
    const el = ref.current
    if (!el) {
      setPos({ left: x, top: y })
      return
    }

    const rect = el.getBoundingClientRect()
    const margin = 12

    const left = clamp(x, margin + rect.width / 2, window.innerWidth - margin - rect.width / 2)
    const top = clamp(y, margin + rect.height, window.innerHeight - margin)

    setPos({ left, top })
  }, [open, x, y, message])

  if (!open) return null

  return (
    <div
      ref={ref}
      className="fixed z-[9999] pointer-events-none select-none px-3 py-1.5 rounded-lg bg-slate-950/95 border border-slate-700 text-white text-xs font-bold shadow-lg shadow-black/40"
      style={{
        left: pos.left,
        top: pos.top,
        transform: 'translate(-50%, -120%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}


