import type { LocationData } from '../../../types'

export function formatRawLocationForDisplay(raw: string): { primary: string; secondary?: string } {
  const value = String(raw ?? '').trim()
  if (!value) return { primary: '' }

  const parts = value.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length <= 1) return { primary: value }

  const primary = parts[0] ?? value
  const secondaryParts = parts.slice(1, 3)
  const secondary = secondaryParts.length ? secondaryParts.join(', ') : undefined
  return { primary, secondary }
}

export function formatEventLocationForDisplay(args: {
  raw: string
  locationData?: LocationData
}): { primary: string; secondary?: string } {
  const { raw, locationData } = args

  const data = locationData
  if (data?.display?.placeName) {
    const primary = data.display.placeName
    const secondary = [data.display.addressLine, data.display.localityLine].filter(Boolean).join(', ') || undefined
    return { primary, secondary }
  }

  return formatRawLocationForDisplay(raw)
}

export function formatItineraryLocationForDisplay(location: string | undefined): {
  full: string
  label: string
  isReal: boolean
} {
  const full = String(location ?? '').trim()
  if (!full) return { full: '', label: '', isReal: false }
  // Heuristic: locations selected from autocomplete tend to include a comma-separated full address.
  const isReal = full.includes(',')
  const label = isReal ? full.split(',')[0]?.trim() || full : full
  return { full, label, isReal }
}


