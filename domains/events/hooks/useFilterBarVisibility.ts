import * as React from 'react'

type UseFilterBarVisibilityArgs = {
  enabled: boolean
  resetKey: unknown
}

export function useFilterBarVisibility({ enabled, resetKey }: UseFilterBarVisibilityArgs) {
  const [isVisible, setIsVisible] = React.useState(true)
  const lastScrollY = React.useRef(0)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setIsVisible(true)
    lastScrollY.current = 0
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [resetKey])

  const onScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!enabled) return

      const currentScrollY = e.currentTarget.scrollTop
      const diff = currentScrollY - lastScrollY.current

      // Threshold to prevent jitter
      if (Math.abs(diff) > 10) {
        if (diff > 0 && currentScrollY > 50) {
          setIsVisible(false)
        } else if (diff < 0) {
          setIsVisible(true)
        }
        lastScrollY.current = currentScrollY
      }
    },
    [enabled],
  )

  return { isVisible, onScroll, scrollRef }
}


