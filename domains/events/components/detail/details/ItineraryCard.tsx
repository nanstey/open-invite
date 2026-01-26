import * as React from 'react'

export function ItineraryCard(props: { children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-slate-700 rounded-2xl p-5">
      <h2 className="text-lg font-bold text-white mb-3">Itinerary</h2>
      {props.children}
    </div>
  )
}


