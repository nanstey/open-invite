export function splitLocalDateTime(value: string | undefined): { date: string; time: string } {
  if (!value) return { date: '', time: '' }
  const [date, time] = value.split('T')
  return { date: date ?? '', time: time ?? '' }
}

// yyyy-MM-ddTHH:mm (local) for <input type="datetime-local" />-style usage
export function toLocalDateTimeInputValue(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

// Format exactly like: "Fri Jan 16, 2026"
export function formatDateLongEnUS(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''

  const weekday = get('weekday')
  const month = get('month')
  const day = get('day')
  const year = get('year')

  return `${weekday} ${month} ${day}, ${year}`.trim()
}

export function formatTime12h(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function buildQuarterHourTimeOptions(): Array<{ value: string; label: string }> {
  const opts: { value: string; label: string }[] = []
  for (let m = 0; m < 24 * 60; m += 15) {
    const hh = Math.floor(m / 60)
    const mm = m % 60
    const value = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
    const hour12 = hh % 12 === 0 ? 12 : hh % 12
    const ampm = hh < 12 ? 'AM' : 'PM'
    const label = `${hour12}:${String(mm).padStart(2, '0')} ${ampm}`
    opts.push({ value, label })
  }
  return opts
}


