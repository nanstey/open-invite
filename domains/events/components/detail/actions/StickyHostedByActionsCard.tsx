import * as React from 'react'

import type { User } from '../../../../../lib/types'
import { EventActions } from './EventActions'
import type { EventActionsModel } from './types'

export function StickyHostedByActionsCard(props: {
  host?: User | null
  seats: { goingLabel: string; spotsLeft: number | null }
  actions: EventActionsModel
}) {
  const { host, seats, actions } = props

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-6 space-y-4">
        <div
          className={
            actions.mode === 'edit'
              ? 'bg-surface border border-slate-700 rounded-2xl p-5 shadow-sm'
              : 'bg-background border border-transparent rounded-2xl p-5'
          }
        >
          <div className="flex items-center gap-4">
            {host ? (
              <img src={host.avatar} className="w-12 h-12 rounded-full border-2 border-slate-700" alt={host.name} />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-700 animate-pulse border-2 border-slate-700" />
            )}
            <div className="min-w-0">
              <div className="text-xs text-slate-400">Hosted by</div>
              <div className="font-bold text-white text-lg truncate">{host?.name || 'Loading...'}</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Going</span>
              <span className="font-bold text-white">{seats.goingLabel}</span>
            </div>
            {seats.spotsLeft !== null ? (
              <div className="text-xs text-slate-500">{seats.spotsLeft} spots left</div>
            ) : (
              <div className="text-xs text-slate-600">No limit</div>
            )}
          </div>

          <EventActions
            variant="lg_column"
            mode={actions.mode}
            inviteCopied={actions.inviteCopied}
            onShareInvite={actions.onShareInvite}
            showDismiss={actions.showDismiss}
            onDismiss={actions.onDismiss}
            isHost={actions.isHost}
            onEditRequested={actions.onEditRequested}
            onJoinLeave={actions.onJoinLeave}
            isJoinDisabled={actions.isJoinDisabled}
            isAttending={actions.isAttending}
            isFull={actions.isFull}
            onSave={actions.onSave}
            onCancel={actions.onCancel}
            canSave={actions.canSave}
            isSaving={actions.isSaving}
            primaryLabel={actions.primaryLabel}
          />
        </div>
      </div>
    </aside>
  )
}

