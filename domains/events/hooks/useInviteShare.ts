import * as React from 'react'

import { copyToClipboard } from '../../../lib/ui/utils/clipboard'

type UseInviteShareInput = {
  eventId: string
  eventSlug?: string | null
  eventTitle: string
}

export function useInviteShare(input: UseInviteShareInput): {
  inviteCopied: boolean
  shareInvite: () => Promise<void>
} {
  const { eventId, eventSlug, eventTitle } = input

  const [inviteCopied, setInviteCopied] = React.useState(false)
  const inviteCopiedTimeoutRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (inviteCopiedTimeoutRef.current) {
        window.clearTimeout(inviteCopiedTimeoutRef.current)
        inviteCopiedTimeoutRef.current = null
      }
    }
  }, [])

  const buildInviteUrl = React.useCallback(() => {
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : ''
    const slugOrId = eventSlug || eventId
    const path = `/e/${encodeURIComponent(slugOrId)}`
    return origin ? `${origin}${path}` : path
  }, [eventId, eventSlug])

  const pulseInviteCopied = React.useCallback(() => {
    setInviteCopied(true)
    if (inviteCopiedTimeoutRef.current) window.clearTimeout(inviteCopiedTimeoutRef.current)
    inviteCopiedTimeoutRef.current = window.setTimeout(() => {
      setInviteCopied(false)
      inviteCopiedTimeoutRef.current = null
    }, 2000)
  }, [])

  const shareInvite = React.useCallback(async () => {
    const inviteUrl = buildInviteUrl()
    const isCoarsePointer =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches

    if (isCoarsePointer && typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
      try {
        await (navigator as any).share({
          title: eventTitle,
          text: `Open Invite to ${eventTitle}`,
          url: inviteUrl,
        })
        return
      } catch {
        // User cancelled or share failed; fall back to copy.
      }
    }

    const copied = await copyToClipboard(inviteUrl)
    if (copied) pulseInviteCopied()
  }, [buildInviteUrl, eventTitle, pulseInviteCopied])

  return { inviteCopied, shareInvite }
}


