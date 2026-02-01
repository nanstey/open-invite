import * as React from 'react'

import { FormSelect } from '../../../../../../lib/ui/components/FormControls'
import { Checkbox } from '../../../../../../lib/ui/9ui/checkbox'

import type { EventExpense, ExpenseApi, ExpenseAppliesTo, Person } from '../types'
import { computeParticipantIdsForAppliesTo } from '../utils'

export function ExpenseParticipantsEditor(props: {
  expense: EventExpense
  people: Person[]
  allPeopleIds: string[]
  hostId?: string
  currentUserId?: string
  expenseApi?: ExpenseApi
}) {
  const { expense: e, people, allPeopleIds, hostId, currentUserId, expenseApi } = props

  return (
    <div className="border-t border-slate-800 pt-3">
      <div className="text-sm text-white font-bold mb-2">Participants</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <FormSelect
          value={e.appliesTo}
          onChange={(ev) => {
            const appliesTo = ev.target.value as ExpenseAppliesTo
            if (appliesTo === 'CUSTOM') {
              expenseApi?.onUpdate(e.id, { appliesTo })
              return
            }
            const participantIds = computeParticipantIdsForAppliesTo({
              appliesTo,
              peopleIds: allPeopleIds,
              hostId,
              currentUserId,
            })
            expenseApi?.onUpdate(e.id, { appliesTo, participantIds })
          }}
          variant="surface"
          size="md"
        >
          <option value="EVERYONE">Everyone</option>
          <option value="HOST_ONLY">Host Only</option>
          <option value="GUESTS_ONLY">Guests Only</option>
          <option value="CUSTOM">Custom</option>
        </FormSelect>
        <div className="md:col-span-2 text-xs text-slate-500 flex items-center">
          Pick a preset to quickly set participants. Choose Custom to fine-tune below.
        </div>
      </div>
      {people.length === 0 ? (
        <div className="text-sm text-slate-500 italic">No participants available.</div>
      ) : (
        <>
          {e.appliesTo === 'CUSTOM' ? (
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
      {e.appliesTo === 'CUSTOM' ? (
        <div className="mt-2 text-xs text-slate-500">{e.participantIds.length} selected</div>
      ) : null}
    </div>
  )
}

