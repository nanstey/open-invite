import { useEffect, RefObject } from 'react'

/**
 * Hook that triggers a callback when clicking outside the referenced element.
 *
 * @example
 * const menuRef = useRef<HTMLDivElement>(null)
 * useClickOutside(menuRef, () => setIsOpen(false), isOpen)
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onClickOutside: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutside()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [ref, onClickOutside, enabled])
}

