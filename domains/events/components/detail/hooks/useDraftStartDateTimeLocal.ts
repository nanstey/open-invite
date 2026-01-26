import * as React from 'react'

import { splitLocalDateTime } from '../../../../../lib/ui/utils/datetime'

export type DraftStartDateTimeLocalModel = {
  draftDate: string
  draftTime: string
  onChangeDraftDate: (nextDate: string) => void
  onChangeDraftTime: (nextTime: string) => void
  draftStartIso: string | null
}

export function useDraftStartDateTimeLocal(input: {
  enabled: boolean
  startDateTimeLocal?: string
  onChangeStartDateTimeLocal?: (value: string) => void
}): DraftStartDateTimeLocalModel {
  const { enabled, startDateTimeLocal, onChangeStartDateTimeLocal } = input

  const [draftDate, setDraftDate] = React.useState<string>('')
  const [draftTime, setDraftTime] = React.useState<string>('')

  React.useEffect(() => {
    if (!enabled) return
    const { date, time } = splitLocalDateTime(startDateTimeLocal)
    setDraftDate(date)
    setDraftTime(time)
  }, [enabled, startDateTimeLocal])

  const onChangeDraftDate = React.useCallback(
    (nextDate: string) => {
      setDraftDate(nextDate)
      const nextLocal = nextDate && draftTime ? `${nextDate}T${draftTime}` : ''
      onChangeStartDateTimeLocal?.(nextLocal)
    },
    [draftTime, onChangeStartDateTimeLocal],
  )

  const onChangeDraftTime = React.useCallback(
    (nextTime: string) => {
      setDraftTime(nextTime)
      const nextLocal = draftDate && nextTime ? `${draftDate}T${nextTime}` : ''
      onChangeStartDateTimeLocal?.(nextLocal)
    },
    [draftDate, onChangeStartDateTimeLocal],
  )

  const draftStartIso = React.useMemo(() => {
    if (!draftDate || !draftTime) return null
    const d = new Date(`${draftDate}T${draftTime}`)
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString()
  }, [draftDate, draftTime])

  return { draftDate, draftTime, onChangeDraftDate, onChangeDraftTime, draftStartIso }
}


