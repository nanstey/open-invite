

import { FormSelect } from '../../../../../../lib/ui/components/FormControls'
import { Checkbox } from '../../../../../../lib/ui/9ui/checkbox'

import type { EventExpense, ExpenseApi, ExpenseAppliesTo, Person } from '../types'
import type { ItineraryItem } from '../../../../types'
import { computeParticipantIdsForAppliesTo } from '../utils'

export function ExpenseParticipantsEditor(props: {
  expense: EventExpense
  people: Person[]
  allPeopleIds: string[]
  hostId?: string
  currentUserId?: string
  expenseApi?: ExpenseApi
  itineraryItems: ItineraryItem[]
}) {
  const { expense: e, people, allPeopleIds, hostId, currentUserId, expenseApi, itineraryItems } = props
  const hasItineraryItems = itineraryItems.length > 0
  const isItineraryMode = hasItineraryItems && !!e.itineraryItemId
  const participantPreset: ExpenseAppliesTo | 'ITINERARY_ITEM' = isItineraryMode ? 'ITINERARY_ITEM' : e.appliesTo

  return (
    <div className="border-t border-slate-800 pt-3">
      <div className="text-sm text-white font-bold mb-2">Participants</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <FormSelect
          value={participantPreset}
          onChange={(ev) => {
            const next = ev.target.value as ExpenseAppliesTo | 'ITINERARY_ITEM'
            if (next === 'ITINERARY_ITEM') {
              const fallbackItemId = itineraryItems[0]?.id ?? null
              const participantIds = computeParticipantIdsForAppliesTo({
                appliesTo: 'EVERYONE',
                peopleIds: allPeopleIds,
                hostId,
                currentUserId,
              })
              expenseApi?.onUpdate(e.id, {
                appliesTo: 'EVERYONE',
                participantIds,
                itineraryItemId: fallbackItemId,
              })
              return
            }

            if (next === 'CUSTOM') {
              expenseApi?.onUpdate(e.id, {
                appliesTo: next,
                itineraryItemId: e.itineraryItemId ? null : undefined,
              })
              return
            }

            const participantIds = computeParticipantIdsForAppliesTo({
              appliesTo: next,
              peopleIds: allPeopleIds,
              hostId,
              currentUserId,
            })
            expenseApi?.onUpdate(e.id, {
              appliesTo: next,
              participantIds,
              itineraryItemId: e.itineraryItemId ? null : undefined,
            })
          }}
          variant="surface"
          size="md"
        >
          <option value="EVERYONE">Everyone</option>
          <option value="HOST_ONLY">Host Only</option>
          <option value="GUESTS_ONLY">Guests Only</option>
          {hasItineraryItems ? <option value="ITINERARY_ITEM">Itinerary Item</option> : null}
          <option value="CUSTOM">Custom</option>
        </FormSelect>
        <div className="md:col-span-2 text-xs text-slate-500 flex items-center">
          {isItineraryMode
            ? 'Participants are derived from the itinerary item selection.'
            : 'Pick a preset to quickly set participants. Choose Custom to fine-tune below.'}
        </div>
      </div>
      {isItineraryMode ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <FormSelect
            value={e.itineraryItemId ?? ''}
            onChange={(ev) => {
              const nextId = ev.target.value || null
              expenseApi?.onUpdate(e.id, { itineraryItemId: nextId })
            }}
            variant="surface"
            size="md"
          >
            {itineraryItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </FormSelect>
          <div className="md:col-span-2 text-xs text-slate-500 flex items-center">
            This expense applies only to attendees who select the item.
          </div>
        </div>
      ) : null}
      {people.length === 0 ? (
        <div className="text-sm text-slate-500 italic">No participants available.</div>
      ) : (
        <>
          {!isItineraryMode && e.appliesTo === 'CUSTOM' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {people.map((p) => {
                const checked = e.participantIds.includes(p.id)
                return (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-slate-200">
                    <Checkbox
                      checked={checked}
                      onChange={(ev) => {
                        const nextRaw = ev.target.checked
                          ? Array.from(new Set([...e.participantIds, p.id]))
                          : e.participantIds.filter((id) => id !== p.id)
                        expenseApi?.onUpdate(e.id, { appliesTo: 'CUSTOM', participantIds: nextRaw })
                      }}
                    />
                    <span className="truncate">{p.name}</span>
                  </label>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-400">{e.participantIds.length} selected</div>
          )}
        </>
      )}
      {!isItineraryMode && e.appliesTo === 'CUSTOM' ? (
        <div className="mt-2 text-xs text-slate-500">{e.participantIds.length} selected</div>
      ) : null}
    </div>
  )
}
