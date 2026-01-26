export function openExternalUrl(url: string | null | undefined): void {
  const u = String(url ?? '').trim()
  if (!u) return
  if (typeof window === 'undefined') return
  window.open(u, '_blank', 'noopener,noreferrer')
}


