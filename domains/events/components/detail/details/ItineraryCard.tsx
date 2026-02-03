import * as React from 'react'
import { Card } from '../../../../../lib/ui/9ui/card'
import { FormSelect } from '../../../../../lib/ui/components/FormControls'

export function ItineraryCard(props: {
  children: React.ReactNode
  isEditMode?: boolean
  showItineraryStartTimeOnly?: boolean
  onChangeItineraryStartTimeOnly?: (next: boolean) => void
  headerActions?: React.ReactNode
}) {
  const cardClassName = props.isEditMode
    ? 'bg-surface border border-slate-700 rounded-2xl p-5'
    : 'bg-background border border-transparent rounded-2xl p-5'

  return (
    <Card className={cardClassName}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h1 className="text-2xl font-bold text-white">Itinerary</h1>
        {props.isEditMode || props.headerActions ? (
          <div className="shrink-0 flex flex-wrap items-center gap-2">
            {props.headerActions ? <div className="flex items-center gap-2">{props.headerActions}</div> : null}
            {props.isEditMode ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Time display</span>
                <FormSelect
                  size="sm"
                  variant="muted"
                  aria-label="Itinerary time display"
                  value={props.showItineraryStartTimeOnly ? 'start' : 'range'}
                  onChange={(event) => props.onChangeItineraryStartTimeOnly?.(event.target.value === 'start')}
                >
                  <option value="start">Start only</option>
                  <option value="range">Start &amp; end</option>
                </FormSelect>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {props.children}
    </Card>
  )
}
