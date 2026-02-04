import * as React from 'react'

import type { SocialEvent } from '../../../types'
import { EventVisibility } from '../../../types'
import { Checkbox } from '../../../../../lib/ui/9ui/checkbox'
import { FormSelect } from '../../../../../lib/ui/components/FormControls'

type GuestsSettingsCardProps = {
  event: SocialEvent
  onChangeMaxSeats?: (next: number | undefined) => void
  onChangeVisibility?: (next: EventVisibility) => void
  onChangeItineraryAttendanceEnabled?: (next: boolean) => void
}

export function GuestsSettingsCard(props: GuestsSettingsCardProps) {
  const { event, onChangeMaxSeats, onChangeVisibility, onChangeItineraryAttendanceEnabled } = props

  return (
    <div className="bg-surface border border-slate-700 rounded-2xl p-5 space-y-4">
      <h2 className="text-lg font-bold text-white">Attendance & visibility</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Seats</div>
          <input
            type="number"
            min={0}
            step={1}
            value={event.maxSeats ?? ''}
            onChange={(e) => {
              const raw = e.target.value
              const n = raw === '' ? undefined : Number(raw)
              onChangeMaxSeats?.(n && n > 0 ? n : undefined)
            }}
            placeholder="Unlimited"
            className="w-full bg-slate-900 border rounded-lg py-3 px-4 text-white outline-none border-slate-700 focus:border-primary"
          />
          <div className="text-xs text-slate-500 mt-1">Leave blank for unlimited.</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Visibility</div>
          <FormSelect
            value={event.visibilityType}
            size="lg"
            onChange={(e) => onChangeVisibility?.(e.target.value as EventVisibility)}
          >
            <option value={EventVisibility.ALL_FRIENDS}>All Friends</option>
            <option value={EventVisibility.INVITE_ONLY}>Invite only</option>
          </FormSelect>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Itinerary attendance</div>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <Checkbox
            checked={event.itineraryAttendanceEnabled ?? false}
            onChange={(e) => onChangeItineraryAttendanceEnabled?.(e.target.checked)}
          />
          Enable partial attendance
        </label>
        <div className="text-xs text-slate-500">
          Attendees select itinerary items when they join, and expense totals are calculated accordingly.
        </div>
      </div>
    </div>
  )
}
