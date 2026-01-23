export function buildGoogleMapsLatLngUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`
}

export function buildGoogleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}


