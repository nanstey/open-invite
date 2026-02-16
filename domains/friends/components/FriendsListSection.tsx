import * as React from 'react'
import { UserPlus } from 'lucide-react'
import { EmptyState } from '../../../lib/ui/components/EmptyState'
import { SectionHeader } from '../../../lib/ui/components/SectionHeader'
import { FriendCard } from './FriendCard'
import type { User } from '../../../lib/types'

export interface FriendsListSectionProps {
  groupedFriends: [string, User[]][]
  filteredCount: number
  searchTerm: string
  openMenuId: string | null
  processingIds: Set<string>
  menuRef: React.RefObject<HTMLDivElement | null>
  onMenuToggle: (friendId: string) => void
  onRemoveFriend: (friend: User) => void
}

export const FriendsListSection: React.FC<FriendsListSectionProps> = ({
  groupedFriends,
  filteredCount,
  searchTerm,
  openMenuId,
  processingIds,
  menuRef,
  onMenuToggle,
  onRemoveFriend,
}) => (
  <>
    <SectionHeader title={`${filteredCount} Friends`} className="mt-8 mb-4" />

    {filteredCount === 0 ? (
      <EmptyState
        icon={<UserPlus className="w-full h-full" />}
        message={
          searchTerm
            ? 'No friends found matching your search.'
            : 'No friends yet. Add some friends to get started!'
        }
      />
    ) : (
      <div className="space-y-6">
        {groupedFriends.map(([letter, friendsInGroup]) => (
          <div key={letter}>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
              {letter}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {friendsInGroup.map((friend) => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  isMenuOpen={openMenuId === friend.id}
                  isProcessing={processingIds.has(friend.id)}
                  menuRef={menuRef}
                  onMenuToggle={() => onMenuToggle(friend.id)}
                  onRemove={() => {
                    onMenuToggle(friend.id)
                    onRemoveFriend(friend)
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    )}
  </>
)

