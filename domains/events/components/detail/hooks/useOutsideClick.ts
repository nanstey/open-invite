import * as React from 'react'

export function useOutsideClick(args: {
  enabled: boolean
  onOutsideClick: () => void
}): void {
  const { enabled, onOutsideClick } = args
  const onOutsideClickRef = React.useRef(onOutsideClick)

  React.useEffect(() => {
    onOutsideClickRef.current = onOutsideClick
  }, [onOutsideClick])

  React.useEffect(() => {
    if (!enabled) return
    const onDocClick = () => onOutsideClickRef.current()
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [enabled])
}


