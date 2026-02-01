import * as React from 'react'
import { Card } from '../../../../../lib/ui/9ui/card'

export function ItineraryCard(props: { children: React.ReactNode; isEditMode?: boolean }) {
  const cardClassName = props.isEditMode
    ? 'bg-surface border border-slate-700 rounded-2xl p-5'
    : 'bg-background border border-transparent rounded-2xl p-5'

  return (
    <Card className={cardClassName}>
      <h1 className="text-2xl font-bold text-white mb-3">Itinerary</h1>
      {props.children}
    </Card>
  )
}
