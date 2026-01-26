export function formatCents(cents: number, args?: { currency?: string; locale?: string }): string {
  const currency = args?.currency ?? 'USD'
  const locale = args?.locale ?? 'en-US'
  const dollars = cents / 100
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(dollars)
}

export function parseMoneyInputToCents(value: string): number | undefined {
  const s = String(value ?? '').trim()
  if (!s) return undefined
  const normalized = s.replace(/[^0-9.-]/g, '')
  const n = Number(normalized)
  if (!Number.isFinite(n)) return undefined
  return Math.round(n * 100)
}

export function centsToInputValue(cents: number | undefined): string {
  if (cents === undefined) return ''
  return (cents / 100).toFixed(2)
}


