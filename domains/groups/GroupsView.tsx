import * as React from 'react'
import { ArrowLeft, Lock, MessageSquare, Plus, Settings, Users } from 'lucide-react'

import type { Group } from '../../lib/types'
import { useAuth } from '../auth/AuthProvider'
import { EmptyState } from '../../lib/ui/components/EmptyState'
import { SearchInput } from '../../lib/ui/components/SearchInput'
import { SectionHeader } from '../../lib/ui/components/SectionHeader'
import { TabGroup, type TabOption } from '../../lib/ui/components/TabGroup'
import { UserAvatar } from '../../lib/ui/components/UserAvatar'
import {
  addUserToGroup,
  createGroup,
  fetchCurrentUserGroupRoles,
  fetchFriends,
  fetchGroupMembersWithRoles,
  fetchGroups,
  type GroupMember,
} from '../../services/friendService'

const groupTabs: TabOption[] = [
  { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
]

type GroupChatMessage = {
  id: string
  userName: string
  text: string
  timestamp: string
}

export function GroupsView() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = React.useState('')
  const [groups, setGroups] = React.useState<Group[]>([])
  const [roleByGroupId, setRoleByGroupId] = React.useState<Record<string, 'ADMIN' | 'MEMBER'>>({})
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null)
  const [members, setMembers] = React.useState<GroupMember[]>([])
  const [friends, setFriends] = React.useState<{ id: string; name: string; avatar: string }[]>([])
  const [selectedFriendId, setSelectedFriendId] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadingMembers, setLoadingMembers] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('chat')
  const [messagesByGroup, setMessagesByGroup] = React.useState<Record<string, GroupChatMessage[]>>({})
  const [draftMessage, setDraftMessage] = React.useState('')

  const isDesktopViewport = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(min-width: 1024px)').matches

  React.useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      setIsLoading(true)
      const [groupData, roleData, friendData] = await Promise.all([
        fetchGroups(user.id),
        fetchCurrentUserGroupRoles(user.id),
        fetchFriends(),
      ])
      setGroups(groupData)
      setRoleByGroupId(roleData)
      setFriends(friendData)
      setSelectedGroupId((prev) => {
        if (!isDesktopViewport()) return null
        if (prev && groupData.some((group) => group.id === prev)) return prev
        return groupData[0]?.id ?? null
      })
      setIsLoading(false)
    }
    void load()
  }, [user?.id])

  React.useEffect(() => {
    const loadMembers = async () => {
      if (!selectedGroupId) return
      setLoadingMembers(true)
      const groupMembers = await fetchGroupMembersWithRoles(selectedGroupId)
      setMembers(groupMembers)
      setLoadingMembers(false)
    }
    void loadMembers()
  }, [selectedGroupId])

  const filteredGroups = React.useMemo(
    () => groups.filter((group) => group.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [groups, searchTerm],
  )

  const selectedGroup = React.useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  )

  const isAdmin = selectedGroup ? roleByGroupId[selectedGroup.id] === 'ADMIN' || selectedGroup.createdBy === user?.id : false

  const addableFriends = React.useMemo(() => {
    const memberIds = new Set(members.map((member) => member.id))
    return friends.filter((friend) => !memberIds.has(friend.id))
  }, [friends, members])

  const chatMessages = selectedGroup ? messagesByGroup[selectedGroup.id] ?? [] : []

  const handleCreateGroup = async () => {
    const fallbackName = `New Group ${groups.length + 1}`
    const created = await createGroup(fallbackName)
    if (!created) return
    setGroups((prev) => [created, ...prev])
    setRoleByGroupId((prev) => ({ ...prev, [created.id]: 'ADMIN' }))
    setSelectedGroupId(created.id)
  }

  const handleSendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedGroup || !draftMessage.trim()) return
    const newMessage: GroupChatMessage = {
      id: `msg-${Date.now()}`,
      userName: user?.name ?? 'You',
      text: draftMessage.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessagesByGroup((prev) => ({
      ...prev,
      [selectedGroup.id]: [...(prev[selectedGroup.id] ?? []), newMessage],
    }))
    setDraftMessage('')
  }

  const handleAddMember = async () => {
    if (!selectedGroup || !selectedFriendId) return
    const added = await addUserToGroup(selectedFriendId, selectedGroup.id)
    if (!added) return
    const refreshed = await fetchGroupMembersWithRoles(selectedGroup.id)
    setMembers(refreshed)
    setSelectedFriendId('')
  }

  const showDetailOnMobile = !!selectedGroupId

  return (
    <div className="w-full pt-2 pb-20 md:pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
        <section className={`${showDetailOnMobile ? 'hidden lg:block' : 'block'} space-y-6`}>
          <div className="flex items-stretch gap-2">
            <div className="bg-slate-900/50 p-1 rounded-xl flex-1">
              <SearchInput
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search groups..."
                size="lg"
              />
            </div>
            <button
              type="button"
              onClick={handleCreateGroup}
              className="h-[54px] w-[54px] mt-0.5 sm:w-auto sm:px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold inline-flex items-center justify-center gap-2 shrink-0"
              aria-label="Create group"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>

          <div className="space-y-4">
            <SectionHeader title="Your Groups" count={isLoading ? 'Loading...' : `${filteredGroups.length} Groups`} />
            {isLoading ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
                Loading groups...
              </div>
            ) : filteredGroups.length === 0 ? (
              <EmptyState
                icon={<Users className="w-full h-full" />}
                message={searchTerm ? 'No groups found matching your search.' : 'No groups yet. Create one to get started.'}
                className="py-8"
              />
            ) : (
              <div className="space-y-4">
                {filteredGroups.map((group) => {
                  const role = roleByGroupId[group.id] ?? (group.createdBy === user?.id ? 'ADMIN' : 'MEMBER')
                  const selected = selectedGroupId === group.id
                  return (
                    <button
                      type="button"
                      key={group.id}
                      onClick={() => {
                        setSelectedGroupId(group.id)
                        setActiveTab('chat')
                      }}
                      className={`w-full bg-surface border p-4 rounded-xl text-left flex items-center gap-3 transition-colors ${
                        selected ? 'border-primary bg-slate-700/60' : 'border-slate-700 hover:border-primary/50'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full shrink-0 border border-slate-500 bg-slate-700/70 flex items-center justify-center text-white font-bold">
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate">{group.name}</div>
                        <div className="text-xs text-slate-400">Group</div>
                      </div>
                      <span className="text-xs font-semibold tracking-wide px-2.5 py-1 rounded-full border border-slate-600 text-slate-300">
                        {role}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

      <section className={`${showDetailOnMobile ? 'block' : 'hidden lg:block'} min-h-[380px]`}>
        {selectedGroup ? (
          <div className="bg-surface border border-slate-700 rounded-2xl p-4 md:p-5 space-y-4 h-full">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedGroupId(null)}
                className="lg:hidden p-2 rounded-full border border-slate-700 text-slate-300"
                aria-label="Back to groups"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">{selectedGroup.name}</h2>
                <p className="text-xs uppercase tracking-widest text-slate-400">Group</p>
              </div>
            </div>

            <TabGroup tabs={groupTabs} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'chat' ? (
              <div className="space-y-4">
                <div className="space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-slate-500 py-12 border border-dashed border-slate-700 rounded-xl">
                      No messages yet. Start the group chat.
                    </div>
                  ) : (
                    chatMessages.map((message) => (
                      <div key={message.id} className="bg-slate-800 rounded-2xl rounded-tl-none p-4">
                        <div className="text-sm font-semibold text-white">{message.userName}</div>
                        <div className="text-slate-200 mt-1">{message.text}</div>
                        <div className="text-[11px] text-slate-500 mt-2">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                    placeholder="Write a message..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500"
                  />
                  <button type="submit" className="px-4 rounded-xl bg-primary hover:bg-primary/90 font-semibold text-white">
                    Send
                  </button>
                </form>
              </div>
            ) : null}

            {activeTab === 'members' ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <select
                    value={selectedFriendId}
                    onChange={(event) => setSelectedFriendId(event.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white"
                  >
                    <option value="">Add a friend to this group...</option>
                    {addableFriends.map((friend) => (
                      <option value={friend.id} key={friend.id}>
                        {friend.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={!selectedFriendId}
                    className="px-4 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold"
                  >
                    Add
                  </button>
                </div>

                {loadingMembers ? (
                  <div className="text-sm text-slate-400">Loading members...</div>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member.id} className="bg-slate-900/40 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
                        <UserAvatar src={member.avatar} alt={member.name} size="sm" className="border-slate-500" />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-white truncate">{member.name}</div>
                        </div>
                        <span className="text-xs text-slate-300 tracking-wide">{member.role}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === 'settings' ? (
              isAdmin ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">Group name</label>
                    <input
                      value={selectedGroup.name}
                      readOnly
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
                    />
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-300">
                    Admin controls for this group will live here.
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 text-center text-slate-300 flex flex-col items-center gap-3">
                  <Lock className="w-5 h-5 text-slate-400" />
                  Settings are available to group admins only.
                </div>
              )
            ) : null}
          </div>
        ) : (
          <div className="hidden lg:flex items-center justify-center bg-surface border border-slate-700 rounded-2xl h-full text-slate-400">
            Select a group to see details.
          </div>
        )}
      </section>
      </div>
    </div>
  )
}
