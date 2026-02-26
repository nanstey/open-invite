import { MoreVertical, UserMinus } from 'lucide-react';
import type * as React from 'react';

import type { GroupMember } from '../../../services/groupService';

type GroupMemberActionsMenuProps = {
  member: GroupMember;
  isOpen: boolean;
  isRemoving: boolean;
  onOpen: () => void;
  onClose: () => void;
  onRemove: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
};

export function GroupMemberActionsMenu({
  member,
  isOpen,
  isRemoving,
  onOpen,
  onClose,
  onRemove,
  menuRef,
}: GroupMemberActionsMenuProps) {
  return (
    <div className="relative shrink-0" ref={isOpen ? menuRef : null}>
      <button
        type="button"
        onClick={isOpen ? onClose : onOpen}
        disabled={isRemoving}
        className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`Open actions menu for ${member.name}`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 min-w-[140px] py-1">
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onRemove}
            disabled={isRemoving}
          >
            <UserMinus className="w-4 h-4" />
            {isRemoving ? 'Removing...' : 'Remove'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
