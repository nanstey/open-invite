import * as React from 'react'

import type { Group } from '../../../../../lib/types'
import type { SocialEvent } from '../../../types'
import { EventVisibility } from '../../../types'
import { Checkbox } from '../../../../../lib/ui/9ui/checkbox'
import {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '../../../../../lib/ui/9ui/combobox'
import { FormSelect } from '../../../../../lib/ui/components/FormControls'

type GuestsSettingsCardProps = {
  event: SocialEvent
  onChangeMaxSeats?: (next: number | undefined) => void
  onChangeVisibility?: (next: EventVisibility) => void
  onChangeGroupIds?: (nextGroupIds: string[]) => void
  groupOptions?: Group[]
  groupsLoading?: boolean
  groupError?: string
  onChangeItineraryAttendanceEnabled?: (next: boolean) => void
}

export function GuestsSettingsCard(props: GuestsSettingsCardProps) {
  const {
    event,
    onChangeMaxSeats,
    onChangeVisibility,
    onChangeGroupIds,
    groupOptions,
    groupsLoading,
    groupError,
    onChangeItineraryAttendanceEnabled,
  } = props
  const [pickerValue, setPickerValue] = React.useState<Group | null>(null)

  const selectedGroupIds = event.groupIds ?? []
  const selectedGroups = React.useMemo(() => {
    const groupsById = new Map((groupOptions ?? []).map((group) => [group.id, group] as const))
    return selectedGroupIds
      .map((groupId) => groupsById.get(groupId))
      .filter((group): group is Group => !!group)
  }, [groupOptions, selectedGroupIds])
  const availableGroups = React.useMemo(
    () => (groupOptions ?? []).filter((group) => !selectedGroupIds.includes(group.id)),
    [groupOptions, selectedGroupIds],
  )

  const addGroup = React.useCallback(
    (group: Group | null) => {
      setPickerValue(null)
      if (!group) {
        return
      }
      if (selectedGroupIds.includes(group.id)) {
        return
      }
      onChangeGroupIds?.([...selectedGroupIds, group.id])
    },
    [onChangeGroupIds, selectedGroupIds],
  )

  const removeGroup = React.useCallback(
    (groupId: string) => {
      onChangeGroupIds?.(selectedGroupIds.filter((id) => id !== groupId))
    },
    [onChangeGroupIds, selectedGroupIds],
  )

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
            <option value={EventVisibility.GROUPS}>Groups</option>
            <option value={EventVisibility.INVITE_ONLY}>Invite only</option>
          </FormSelect>
        </div>
      </div>

      {event.visibilityType === EventVisibility.GROUPS ? (
        <div className="space-y-2">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Group visibility</div>
          <Combobox<Group>
            items={availableGroups}
            value={pickerValue}
            onValueChange={addGroup}
            itemToString={(group) => group?.name ?? ''}
          >
            <ComboboxInput
              disabled={groupsLoading}
              showClear={false}
              placeholder={
                groupsLoading
                  ? 'Loading groups...'
                  : availableGroups.length === 0
                    ? 'All groups selected'
                    : 'Select group'
              }
              startContent={
                selectedGroups.length > 0 ? (
                  <ComboboxChips>
                    {selectedGroups.map((group) => (
                      <ComboboxChip key={group.id}>
                        <span>{group.name}</span>
                        <ComboboxChipRemove
                          onClick={(event) => {
                            event.stopPropagation()
                            removeGroup(group.id)
                          }}
                          aria-label={`Remove ${group.name}`}
                        />
                      </ComboboxChip>
                    ))}
                  </ComboboxChips>
                ) : null
              }
            />
            <ComboboxContent>
              <ComboboxEmpty>
                {groupsLoading ? 'Loading groups...' : 'No groups match your search.'}
              </ComboboxEmpty>
              <ComboboxList<Group>>
                {(group) => (
                  <ComboboxItem key={group.id} value={group}>
                    {group.name}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {groupError ? <div className="text-xs text-red-400">{groupError}</div> : null}
          <div className="text-xs text-slate-500">
            Select one or more groups to control who can view this event.
          </div>
        </div>
      ) : null}

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
