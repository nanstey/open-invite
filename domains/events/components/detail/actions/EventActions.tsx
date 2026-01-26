import * as React from 'react'
import { CheckCircle2, EyeOff, Link, Save, Send, X } from 'lucide-react'

export type EventActionsVariant = 'md_row' | 'lg_column' | 'mobile_row'

export function EventActions(props: {
  variant: EventActionsVariant
  mode: 'view' | 'edit'

  // Share
  inviteCopied: boolean
  onShareInvite: () => void | Promise<void>

  // Hide (view mode)
  showDismiss?: boolean
  onDismiss?: () => void

  // Primary (view mode)
  isHost: boolean
  onEditRequested?: () => void
  onJoinLeave?: () => void | Promise<void>
  isJoinDisabled?: boolean
  isAttending?: boolean
  isFull?: boolean

  // Edit mode buttons
  onSave?: () => void
  onCancel?: () => void
  canSave?: boolean
  isSaving?: boolean
  primaryLabel?: string
}) {
  const {
    variant,
    mode,
    inviteCopied,
    onShareInvite,
    showDismiss,
    onDismiss,
    isHost,
    onEditRequested,
    onJoinLeave,
    isJoinDisabled,
    isAttending,
    isFull,
    onSave,
    onCancel,
    canSave,
    isSaving,
    primaryLabel,
  } = props

  const showHide = !!showDismiss && !!onDismiss && mode === 'view'

  if (variant === 'lg_column') {
    return (
      <div className="mt-5 space-y-3">
        {mode === 'edit' ? (
          <div className="space-y-3">
            <button
              onClick={() => onSave?.()}
              disabled={!!isSaving}
              aria-disabled={!canSave}
              className={`w-full py-3 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
                canSave ? 'bg-primary hover:bg-primary/90 text-white shadow-primary/25' : 'bg-slate-700 text-slate-300'
              } disabled:opacity-60`}
              type="button"
            >
              <Save className="w-5 h-5" /> {isSaving ? 'Saving…' : primaryLabel || 'Save'}
            </button>
            <button
              onClick={() => onCancel?.()}
              className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"
              type="button"
            >
              <X className="w-5 h-5" /> Cancel
            </button>
          </div>
        ) : null}

        {mode === 'view' ? (
          <button
            onClick={() => void onShareInvite()}
            className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"
            type="button"
          >
            {inviteCopied ? <Link className="w-5 h-5" /> : <Send className="w-5 h-5" />}{' '}
            {inviteCopied ? 'URL Copied!' : 'Share Invite'}
          </button>
        ) : null}

        {showHide ? (
          <button
            onClick={() => onDismiss?.()}
            className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"
            type="button"
          >
            <EyeOff className="w-5 h-5" /> Hide
          </button>
        ) : null}

        {mode === 'view' ? (
          isHost ? (
            <button
              onClick={() => onEditRequested?.()}
              className="w-full py-3 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg bg-primary hover:bg-primary/90 text-white shadow-primary/25"
              type="button"
            >
              <Save className="w-5 h-5" /> Edit Event
            </button>
          ) : (
            <button
              onClick={() => void onJoinLeave?.()}
              disabled={!!isJoinDisabled}
              aria-disabled={!!isJoinDisabled}
              className={`w-full py-3 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
                isAttending
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50'
                  : isFull
                    ? 'bg-slate-700/60 text-slate-300 border border-slate-600'
                    : 'bg-primary hover:bg-primary/90 text-white shadow-primary/25'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
              type="button"
            >
              {isAttending ? (
                <>
                  <X className="w-5 h-5" /> Leave Event
                </>
              ) : isFull ? (
                <>No Spots Left</>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" /> I'm In!
                </>
              )}
            </button>
          )
        ) : null}
      </div>
    )
  }

  const isMobile = variant === 'mobile_row'
  const shareClassName = isMobile
    ? 'w-1/3 py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all border border-slate-700 hover:border-slate-600'
    : 'py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700'

  const dismissClassName = isMobile
    ? 'w-1/3 py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all border border-slate-700 hover:border-slate-600'
    : 'py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700'

  return (
    <div className="flex gap-3">
      {mode === 'edit' ? (
        <>
          <button
            onClick={() => onCancel?.()}
            className={`${isMobile ? 'w-1/3 py-3.5 text-base' : 'w-1/3 py-3 text-sm'} rounded-2xl font-bold flex items-center justify-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700`}
            type="button"
          >
            <X className="w-5 h-5" /> Cancel
          </button>
          <button
            onClick={() => onSave?.()}
            disabled={!!isSaving}
            aria-disabled={!canSave}
            className={`flex-1 ${isMobile ? 'py-3.5 text-base' : 'py-3 text-base'} rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
              canSave ? 'bg-primary hover:bg-primary/90 text-white shadow-primary/25' : 'bg-slate-700 text-slate-300'
            } disabled:opacity-60`}
            type="button"
          >
            <Save className="w-5 h-5" /> {isSaving ? 'Saving…' : primaryLabel || 'Save'}
          </button>
        </>
      ) : null}

      {mode === 'view' ? (
        <button onClick={() => void onShareInvite()} className={shareClassName} type="button">
          {isMobile ? <Send className="w-5 h-5" /> : inviteCopied ? <Link className="w-5 h-5" /> : <Send className="w-5 h-5" />}{' '}
          {inviteCopied ? 'URL Copied!' : 'Share Invite'}
        </button>
      ) : null}

      {showHide ? (
        <button onClick={() => onDismiss?.()} className={dismissClassName} type="button">
          <EyeOff className="w-5 h-5" /> Hide
        </button>
      ) : null}

      {mode === 'view' ? (
        isHost ? (
          <button
            onClick={() => onEditRequested?.()}
            className={`flex-1 ${isMobile ? 'py-3.5 text-base' : 'py-3 text-base'} rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg bg-primary hover:bg-primary/90 text-white shadow-primary/25`}
            type="button"
          >
            <Save className="w-5 h-5" /> Edit Event
          </button>
        ) : (
          <button
            onClick={() => void onJoinLeave?.()}
            disabled={!!isJoinDisabled}
            aria-disabled={!!isJoinDisabled}
            className={`flex-1 ${isMobile ? 'py-3.5 text-base' : 'py-3 text-base'} rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
              isAttending
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50'
                : isFull
                  ? 'bg-slate-700/60 text-slate-300 border border-slate-600'
                  : 'bg-primary hover:bg-primary/90 text-white shadow-primary/25'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
            type="button"
          >
            {isAttending ? (
              <>
                <X className="w-5 h-5" /> Leave Event
              </>
            ) : isFull ? (
              <>No Spots Left</>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" /> I'm In!
              </>
            )}
          </button>
        )
      ) : null}
    </div>
  )
}


