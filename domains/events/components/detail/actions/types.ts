export type EventActionsModel = {
  mode: 'view' | 'edit'

  inviteCopied: boolean
  onShareInvite: () => void | Promise<void>

  showDismiss: boolean
  onDismiss?: () => void

  isHost: boolean
  onEditRequested?: () => void
  onJoinLeave?: () => void | Promise<void>
  isJoinDisabled?: boolean
  isAttending?: boolean
  isFull?: boolean

  onSave?: () => void
  onCancel?: () => void
  canSave?: boolean
  isSaving?: boolean
  primaryLabel?: string
}


