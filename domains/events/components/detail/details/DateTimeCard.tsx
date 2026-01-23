import * as React from 'react'

import { FormSelect } from '../../../../../lib/ui/components/FormControls'
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Date</div>
              <input
                type="date"
                value={draft?.draftDate ?? ''}
                onChange={(e) => {
                  const nextDate = e.target.value
                  draft?.onChangeDraftDate(nextDate)
                }}
                required
                className={`w-full bg-slate-900 border rounded-lg py-3 px-4 text-white outline-none [color-scheme:dark] ${
                  errorStartTime ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-primary'
                }`}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Time</div>
              <FormSelect
                value={draft?.draftTime ?? ''}
                onChange={(e) => {
                  const nextTime = e.target.value
                  draft?.onChangeDraftTime(nextTime)
                }}
                required
                size="lg"
                variant="surface"
                className={errorStartTime ? 'border-red-500 focus:border-red-500' : ''}
              >
                <option value="">Select time</option>
                {timeOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Duration (hours)</div>
              <input
                type="number"
                min={0}
                step={0.25}
                value={durationHours ?? ''}
                onChange={(e) => {
                  const raw = e.target.value
                  const next = raw === '' ? '' : Number(raw)
                  onChangeDurationHours?.(next === '' ? '' : next)
                }}
                placeholder="e.g. 2"
                required
                className={`w-full bg-slate-900 border rounded-lg py-3 px-4 text-white outline-none ${
                  errorDurationHours ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-primary'
                }`}
              />
              {errorDurationHours ? <div className="text-xs text-red-400 mt-1">{errorDurationHours}</div> : null}
            </div>
          </div>
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


