import * as React from 'react'
import { MoreVertical, UserMinus } from 'lucide-react'
import { UserAvatar } from '../../../lib/ui/components/UserAvatar'
import type { User } from '../../../lib/types'

export interface FriendCardProps {
  friend: User
  isMenuOpen: boolean
  isProcessing: boolean
  menuRef: React.RefObject<HTMLDivElement | null>
  onMenuToggle: () => void
  onRemove: () => void
}

export const FriendCard: React.FC<FriendCardProps> = ({
  friend,
  isMenuOpen,
  isProcessing,
  menuRef,
  onMenuToggle,
  onRemove,
}) => (
  <div className="bg-surface border border-slate-700 p-4 rounded-xl flex items-center gap-3 hover:border-primary/50 transition-colors">
    <UserAvatar src={friend.avatar} alt={friend.name} className="shrink-0" />
    <div className="min-w-0 flex-1">
      <div className="font-bold text-white truncate">{friend.name}</div>
    </div>
    <div className="relative shrink-0" ref={isMenuOpen ? menuRef : null}>
      <button
        className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
        onClick={onMenuToggle}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 min-w-[140px] py-1">
          <button
            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2 transition-colors"
            onClick={onRemove}
            disabled={isProcessing}
          >
            <UserMinus className="w-4 h-4" />
            Unfriend
          </button>
        </div>
      )}
    </div>
  </div>
)

