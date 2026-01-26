type EventEditorValuesLike = {
  title: string
  description: string
  location: string
  activityType: string
  startDateTimeLocal: string
  durationHours: number | ''
}

export function validateEventEditor(values: EventEditorValuesLike, hasItinerary: boolean): {
  title?: string
  activityType?: string
  description?: string
  startTime?: string
  durationHours?: string
  location?: string
} {
  const title = values.title.trim()
  const location = values.location.trim()
  const description = values.description.trim()
  const activityType = String(values.activityType ?? '').trim()
  const startDateTimeLocal = values.startDateTimeLocal
  const durationHours = values.durationHours === '' ? undefined : Number(values.durationHours)

  return {
    title: title ? undefined : 'Title is required',
    activityType: activityType ? undefined : 'Category is required',
    // Description is optional
    description: undefined,
    startTime: hasItinerary ? undefined : startDateTimeLocal ? undefined : 'Date & time is required',
    durationHours: hasItinerary ? undefined : durationHours && durationHours > 0 ? undefined : 'Duration is required',
    location: location ? undefined : 'Location is required',
  }
}


