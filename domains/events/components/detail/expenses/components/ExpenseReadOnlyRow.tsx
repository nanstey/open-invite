import * as React from 'react'

import type { EventExpense, Person } from '../types'
import type { ExpenseDetails } from '../useExpenseCalculator'
import { formatCentsMaybeEstimate, titleForKind } from '../utils'

export function ExpenseReadOnlyRow(props: {
  expense: EventExpense
  expenseDetails: ExpenseDetails
  peopleById: Map<string, Person>
}) {
  const { expense: e, expenseDetails, peopleById } = props

  const { effectiveParticipantIds, perPersonCents, totalCents, isEstimate } = expenseDetails

  const totalLabel = formatCentsMaybeEstimate(totalCents, { currency: e.currency, isEstimate })
  const perLabel = formatCentsMaybeEstimate(perPersonCents, { currency: e.currency, isEstimate })

  const participantNames = effectiveParticipantIds
    .map((id) => peopleById.get(id)?.name ?? 'Unknown')
    .filter(Boolean)

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-white font-bold truncate">{e.title}</div>
          <div className="text-xs text-slate-500 mt-1">{titleForKind(e)}</div>
        </div>
        <div className="text-right">
          <div className="text-white font-extrabold text-lg leading-tight">{perLabel}</div>
          <div className="text-xs text-slate-400 -mt-0.5">/ person</div>
          {e.splitType === 'GROUP' ? <div className="text-xs text-slate-500 mt-1">{totalLabel} total</div> : null}
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-500">
        {effectiveParticipantIds.length} people{participantNames.length ? ` · ${participantNames.join(', ')}` : ''}
      </div>
    </div>
  )
}
