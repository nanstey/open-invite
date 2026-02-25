

import { ChevronDown } from 'lucide-react'

import type { ExpenseCalculator } from '../useExpenseCalculator'
import { formatSummaryCents } from '../utils'

export function ExpensesSummarySection(props: {
  expenseCalculator: ExpenseCalculator
  expenseCount: number
  expanded: boolean
  onExpand: () => void
  currency: string
}) {
  const { expenseCalculator, expenseCount, expanded, onExpand, currency } = props

  const summary = expenseCalculator.getSummary()

  return (
    <div className="mt-4">
      {!expanded ? (
        <button
          type="button"
          onClick={onExpand}
          className="w-full text-sm text-slate-400 hover:text-slate-200 transition-colors font-semibold"
          aria-expanded={expanded}
        >
          <span className="flex items-center gap-3">
            <span className="shrink-0">{expenseCount} expense items</span>
            <span className="flex-1 border-b border-slate-700/80" aria-hidden="true" />
            <span className="shrink-0 inline-flex items-center gap-1">
              <span>see details</span>
              <ChevronDown className="w-4 h-4" />
            </span>
          </span>
        </button>
      ) : null}
      <hr className="border-slate-800" />
      <div className="pt-3">
        <div className="text-sm font-bold text-white mb-2">You pay</div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-300 font-bold">Up Front</div>
            <div className="text-sm text-white font-bold text-right">
              {formatSummaryCents(summary.upFrontCents, { currency, isEstimate: false })}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-300 font-bold">Settled After</div>
            <div className="text-sm text-white font-bold text-right">
              {formatSummaryCents(summary.settledAfterCents, { currency, isEstimate: summary.hasEstimate })}
            </div>
          </div>
          <hr className="border-slate-800 my-2" />
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-300 font-bold">Total</div>
            <div className="text-sm text-white font-bold text-right">
              {formatSummaryCents(summary.totalCents, {
                currency,
                isEstimate: summary.hasEstimate,
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
