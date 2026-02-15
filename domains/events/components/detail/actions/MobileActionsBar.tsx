

import { EventActions } from './EventActions'
import type { EventActionsModel } from './types'

export function MobileActionsBar(props: {
  reserveBottomNavSpace: boolean
  actions: EventActionsModel
}) {
  const { reserveBottomNavSpace, actions } = props

  return (
    <div
      className={`md:hidden fixed left-0 right-0 ${
        reserveBottomNavSpace ? 'bottom-16' : 'bottom-0'
      } p-4 border-t border-slate-800 bg-surface/95 backdrop-blur z-[1200] pb-safe-area`}
    >
      <div className="max-w-6xl mx-auto">
        <EventActions
          variant="mobile_row"
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
  )
}


