import React, { useCallback } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Users as UsersIcon, UsersRound } from 'lucide-react'

import { GroupsView } from '../domains/friends/GroupsView'
import { useSetHeaderTabs } from '../domains/app/HeaderTabsContext'
import type { TabOption } from '../lib/ui/components/TabGroup'

const socialTabs: TabOption[] = [
  { id: 'friends', label: 'Friends', icon: <UsersIcon className="w-4 h-4" /> },
  { id: 'groups', label: 'Groups', icon: <UsersRound className="w-4 h-4" /> },
]

export const Route = createFileRoute('/groups')({
  beforeLoad: ({ context }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({ to: '/' })
    }
  },
  component: function GroupsRouteComponent() {
    const navigate = useNavigate()

    const handleTabChange = useCallback(
      (id: string) => {
        const to = id === 'groups' ? '/groups' : '/friends'
        navigate({ to })
      },
      [navigate],
    )

    useSetHeaderTabs(socialTabs, 'groups', handleTabChange)

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pt-2">
        <div className="max-w-6xl mx-auto">
          <GroupsView />
        </div>
      </div>
    )
  },
})
