import * as React from 'react'

export function ItineraryCard(props: { children: React.ReactNode; isEditMode?: boolean }) {
  const cardClassName = props.isEditMode
    ? 'bg-surface border border-slate-700 rounded-2xl p-5'
    : 'bg-background border border-transparent rounded-2xl p-5'

  return (
    <div className={cardClassName}>
      <h1 className="text-xl font-bold text-white mb-3">Itinerary</h1>
      {props.children}
    </div>
  )
}

