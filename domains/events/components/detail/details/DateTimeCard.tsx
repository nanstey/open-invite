import * as React from 'react'

import { DateTimeFields } from '../../../../../lib/ui/components/DateTimeFields'
import { buildQuarterHourTimeOptions } from '../../../../../lib/ui/utils/datetime'
import type { EventDateTimeModel } from '../utils/eventDateTimeModel'
import type { DraftStartDateTimeLocalModel } from '../hooks/useDraftStartDateTimeLocal'

export function DateTimeCard(props: {
  isEditMode: boolean
  hasItinerary: boolean
  dateTime: EventDateTimeModel
  isFlexibleStart: boolean
  draft?: DraftStartDateTimeLocalModel
  durationHours?: number | ''
  onChangeDurationHours?: (next: number | '') => void
  errorStartTime?: string
  errorDurationHours?: string
}) {
  const {
    isEditMode,
    hasItinerary,
    dateTime,
    isFlexibleStart,
    draft,
    durationHours,
    onChangeDurationHours,
    errorStartTime,
    errorDurationHours,
  } = props

  const timeOptions = React.useMemo(() => buildQuarterHourTimeOptions(), [])

  return (
    <div className="bg-surface border border-slate-700 rounded-2xl p-5">
      <h2 className="text-lg font-bold text-white mb-3">Date &amp; Time</h2>
      {isEditMode ? (
        hasItinerary ? (
          <div className="text-sm text-slate-400 bg-slate-900/40 border border-slate-800 rounded-xl p-4">
            Event time is derived from itinerary items. Edit the itinerary below to change the overall time.
          </div>
        ) : (
          <DateTimeFields
            date={draft?.draftDate ?? ''}
            time={draft?.draftTime ?? ''}
            durationHours={durationHours ?? ''}
            timeOptions={timeOptions}
            required
            size="lg"
            minDurationHours={0}
            durationStepHours={0.25}
            durationPlaceholder="e.g. 2"
            invalidStartTime={!!errorStartTime}
            invalidDuration={!!errorDurationHours}
            durationErrorText={errorDurationHours}
            onChangeDate={(nextDate) => draft?.onChangeDraftDate(nextDate)}
            onChangeTime={(nextTime) => draft?.onChangeDraftTime(nextTime)}
            onChangeDurationHours={(next) => onChangeDurationHours?.(next)}
          />
        )
      ) : (
        <div className="text-slate-300">
          {dateTime.showMultiDay ? (
            <>
              <div className="leading-tight text-white">
                <span className="font-bold">{dateTime.startDateText}</span>{' '}
                <span className="font-normal text-slate-400">{dateTime.startTimeText} -</span>
              </div>
              {dateTime.endDateText && dateTime.endTimeText && (
                <div className="leading-tight text-white">
                  <span className="font-bold">{dateTime.endDateText}</span>{' '}
                  <span className="font-normal text-slate-400">{dateTime.endTimeText}</span>
                </div>
              )}
              {isFlexibleStart ? <div className="text-sm text-slate-400 leading-tight italic">(Flexible)</div> : null}
            </>
          ) : (
            <>
              <div className="font-bold text-white">{dateTime.startDateText}</div>
              <div className="text-sm text-slate-400">
                {dateTime.timeRangeText}
                {isFlexibleStart && <span className="italic"> (Flexible)</span>}
              </div>
            </>
          )}
        </div>
      )}
      {isEditMode && errorStartTime ? <div className="text-xs text-red-400 mt-2">{errorStartTime}</div> : null}
    </div>
  )
}


