import { createFileRoute, redirect } from '@tanstack/react-router'

import { FriendsView } from '../domains/friends/FriendsView'
import { parseFriendsTab } from '../domains/friends/types'


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
  Route.useSearch()  // search params unused
    const activeTab = 'FRIENDS'



    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pt-2">
        <div className="max-w-6xl mx-auto">
          <FriendsView activeTab={activeTab} />
        </div>
      </div>
    )
  },
})
