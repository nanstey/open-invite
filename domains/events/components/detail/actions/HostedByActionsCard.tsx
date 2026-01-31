import * as React from 'react'

import type { User } from '../../../../../lib/types'
import { EventActions } from './EventActions'
import type { EventActionsModel } from './types'

export function HostedByActionsCard(props: {
  host?: User | null
  seats: { goingLabel: string; spotsLeft: number | null }
  actions: EventActionsModel
}) {
  const { host, seats, actions } = props

  return (
    <div className="hidden md:block lg:hidden max-w-6xl mx-auto px-4 md:px-6 py-4">
      <div
        className={
          actions.mode === 'edit'
            ? 'bg-surface border border-slate-700 rounded-2xl p-5 shadow-sm'
            : 'bg-background border border-transparent rounded-2xl p-5'
        }
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {host ? (
              <img src={host.avatar} className="w-12 h-12 rounded-full border-2 border-slate-700" alt={host.name} />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-700 animate-pulse border-2 border-slate-700" />
            )}
            <div className="min-w-0">
              <div className="text-xs text-slate-400">{actions.mode === 'edit' ? 'Editing as' : 'Hosted by'}</div>
              <div className="font-bold text-white text-lg truncate">{host?.name || 'Loading...'}</div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs text-slate-400">Going</div>
            <div className="font-bold text-white">{seats.goingLabel}</div>
            {seats.spotsLeft !== null ? (
              <div className="text-xs text-slate-500">{seats.spotsLeft} left</div>
            ) : (
              <div className="text-xs text-slate-600">No limit</div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <EventActions
            variant="md_row"
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
    </div>
  )
}

