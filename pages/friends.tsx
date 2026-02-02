import React, { useCallback } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Users as UsersIcon } from 'lucide-react'

import type { FriendsMode } from '../lib/types'
import { FriendsView } from '../domains/friends/FriendsView'
import { coerceFriendsTab, parseFriendsTab } from '../domains/friends/types'
import { useSetHeaderTabs } from '../domains/app/HeaderTabsContext'
import type { TabOption } from '../lib/ui/components/TabGroup'

const friendsTabs: TabOption[] = [
  { id: 'friends', label: 'Friends', icon: <UsersIcon className="w-4 h-4" /> },
]

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
    const navigate = useNavigate()
    const activeTab: FriendsMode = 'FRIENDS'

    const handleTabChange = useCallback(
      (id: string) => navigate({ to: '/friends', search: { tab: coerceFriendsTab(id) } }),
      [navigate]
    )

    // useSetHeaderTabs(friendsTabs, tab ?? 'friends', handleTabChange)

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pt-2">
        <div className="max-w-6xl mx-auto">
          <FriendsView activeTab={activeTab} />
        </div>
      </div>
    )
  },
})
