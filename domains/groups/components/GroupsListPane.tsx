import { Plus, Users } from 'lucide-react';

import type { Group } from '../../../lib/types';
import { EmptyState } from '../../../lib/ui/components/EmptyState';
import { SearchInput } from '../../../lib/ui/components/SearchInput';
import { SectionHeader } from '../../../lib/ui/components/SectionHeader';

type GroupsListPaneProps = {
  /** @deprecated Use filteredGroups instead. Kept for backward compatibility with GroupsView. */
  groups: Group[];
  filteredGroups: Group[];
  roleByGroupId: Record<string, 'ADMIN' | 'MEMBER'>;
  selectedGroupId: string | null;
  searchTerm: string;
  isLoading: boolean;
  userId: string | undefined;
  onSearchChange: (value: string) => void;
  onSelectGroup: (groupId: string) => void;
  onCreateGroup: () => void;
};

export function GroupsListPane({
  // eslint-ignore-next-line
  groups: _groups,
  filteredGroups,
  roleByGroupId,
  selectedGroupId,
  searchTerm,
  isLoading,
  userId,
  onSearchChange,
  onSelectGroup,
  onCreateGroup,
}: GroupsListPaneProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-stretch gap-2">
        <div className="bg-slate-900/50 p-1 rounded-xl flex-1">
          <SearchInput
            value={searchTerm}
            onChange={event => onSearchChange(event.target.value)}
            placeholder="Search groups..."
            size="lg"
          />
        </div>
        <button
          type="button"
          onClick={onCreateGroup}
          className="h-[54px] w-[54px] mt-0.5 sm:w-auto sm:px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold inline-flex items-center justify-center gap-2 shrink-0"
          aria-label="Create group"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New</span>
        </button>
      </div>

      <div className="space-y-4">
        <SectionHeader
          title="Your Groups"
          count={isLoading ? 'Loading...' : `${filteredGroups.length} Groups`}
        />
        {isLoading ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
            Loading groups...
          </div>
        ) : filteredGroups.length === 0 ? (
          <EmptyState
            icon={<Users className="w-full h-full" />}
            message={
              searchTerm
                ? 'No groups found matching your search.'
                : 'No groups yet. Create one to get started.'
            }
            className="py-8"
          />
        ) : (
          <div className="space-y-4">
            {filteredGroups.map(group => {
              const isOwner = group.createdBy === userId;
              const role = isOwner ? 'OWNER' : roleByGroupId[group.id] === 'ADMIN' ? 'ADMIN' : null;
              const selected = selectedGroupId === group.id;
              return (
                <button
                  type="button"
                  key={group.id}
                  onClick={() => onSelectGroup(group.id)}
                  className={`w-full bg-surface border p-4 rounded-xl text-left flex items-center gap-3 transition-colors ${
                    selected
                      ? 'border-primary bg-slate-700/60'
                      : 'border-slate-700 hover:border-primary/50'
                  }`}
                >
                  <div className="w-11 h-11 rounded-full shrink-0 border border-slate-500 bg-slate-700/70 flex items-center justify-center text-white font-bold">
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white truncate">{group.name}</div>
                  </div>
                  {role ? (
                    <span className="text-xs font-semibold tracking-wide px-2.5 py-1 rounded-full border border-slate-600 text-slate-300">
                      {role}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
