import React from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'

import type { FriendsMode } from '../lib/types'
import { FriendsView } from '../domains/friends/FriendsView'

type FriendsTab = 'friends' | 'groups'

function parseFriendsTab(value: unknown): FriendsTab {
  const tab = typeof value === 'string' ? value.toLowerCase() : 'friends'
  return tab === 'groups' ? 'groups' : 'friends'
}

function tabToMode(tab: FriendsTab): FriendsMode {
  return tab === 'groups' ? 'GROUPS' : 'FRIENDS'
}

export const Route = createFileRoute('/friends')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: parseFriendsTab(search.tab),
  }),
  beforeLoad: ({ context }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({ to: '/' })
    }
  },
  component: function FriendsRouteComponent() {
    const { tab } = Route.useSearch()
    const activeTab = tabToMode(tab)

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pt-2">
        <FriendsView activeTab={activeTab} />
      </div>
    )
  },
})

