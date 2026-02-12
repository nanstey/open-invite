import * as React from 'react'
import { ArrowLeft, Lock, MessageSquare, Plus, Settings, Users } from 'lucide-react'

import type { Group } from '../../lib/types'
import { useAuth } from '../auth/AuthProvider'
import {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '../../lib/ui/9ui/combobox'
import { EmptyState } from '../../lib/ui/components/EmptyState'
import { Switch } from '../../lib/ui/9ui/switch'
import { SearchInput } from '../../lib/ui/components/SearchInput'
import { SectionHeader } from '../../lib/ui/components/SectionHeader'
import { TabGroup, type TabOption } from '../../lib/ui/components/TabGroup'
import { UserAvatar } from '../../lib/ui/components/UserAvatar'
import {
  fetchFriends,
} from '../../services/friendService'
import {
  addUserToGroup,
  approveGroupMemberRequest,
  createGroup,
  denyGroupMemberRequest,
  fetchCurrentUserGroupRoles,
  fetchGroupMemberRequests,
  fetchGroupMembersWithRoles,
  fetchGroups,
  updateGroup,
  type GroupMember,
  type GroupMemberRequest,
} from '../../services/groupService'

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

type GroupSettingsDraft = {
  name: string
  allowMembersCreateEvents: boolean
  allowMembersAddMembers: boolean
  newMembersRequireAdminApproval: boolean
}

export function GroupsView() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = React.useState('')
  const [groups, setGroups] = React.useState<Group[]>([])
  const [roleByGroupId, setRoleByGroupId] = React.useState<Record<string, 'ADMIN' | 'MEMBER'>>({})
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null)
  const [members, setMembers] = React.useState<GroupMember[]>([])
  const [friends, setFriends] = React.useState<{ id: string; name: string; avatar: string }[]>([])
  const [selectedFriendIds, setSelectedFriendIds] = React.useState<string[]>([])
  const [memberPickerValue, setMemberPickerValue] = React.useState<{ id: string; name: string; avatar: string } | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadingMembers, setLoadingMembers] = React.useState(false)
  const [addingMembers, setAddingMembers] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('chat')
  const [messagesByGroup, setMessagesByGroup] = React.useState<Record<string, GroupChatMessage[]>>({})
  const [draftMessage, setDraftMessage] = React.useState('')
  const [groupSettingsDraft, setGroupSettingsDraft] = React.useState<GroupSettingsDraft | null>(null)
  const [savingSettings, setSavingSettings] = React.useState(false)
  const [settingsMessage, setSettingsMessage] = React.useState<string | null>(null)
  const [pendingRequests, setPendingRequests] = React.useState<GroupMemberRequest[]>([])
  const [loadingRequests, setLoadingRequests] = React.useState(false)
  const [processingRequestId, setProcessingRequestId] = React.useState<string | null>(null)

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
  const canAddMembers = selectedGroup ? isAdmin || selectedGroup.allowMembersAddMembers : false

  const addableFriends = React.useMemo(() => {
    const memberIds = new Set(members.map((member) => member.id))
    return friends.filter((friend) => !memberIds.has(friend.id))
  }, [friends, members])

  const selectedFriends = React.useMemo(() => {
    const friendsById = new Map(friends.map((friend) => [friend.id, friend] as const))
    return selectedFriendIds
      .map((friendId) => friendsById.get(friendId))
      .filter((friend): friend is { id: string; name: string; avatar: string } => !!friend)
  }, [friends, selectedFriendIds])

  const selectableFriends = React.useMemo(() => {
    const selectedIds = new Set(selectedFriendIds)
    return addableFriends.filter((friend) => !selectedIds.has(friend.id))
  }, [addableFriends, selectedFriendIds])

  const chatMessages = selectedGroup ? messagesByGroup[selectedGroup.id] ?? [] : []

  const settingsDirty = React.useMemo(() => {
    if (!selectedGroup || !groupSettingsDraft) return false
    return (
      selectedGroup.name !== groupSettingsDraft.name ||
      selectedGroup.allowMembersCreateEvents !== groupSettingsDraft.allowMembersCreateEvents ||
      selectedGroup.allowMembersAddMembers !== groupSettingsDraft.allowMembersAddMembers ||
      selectedGroup.newMembersRequireAdminApproval !== groupSettingsDraft.newMembersRequireAdminApproval
    )
  }, [groupSettingsDraft, selectedGroup])

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

  const handleSelectFriend = (friend: { id: string; name: string; avatar: string } | null) => {
    setMemberPickerValue(null)
    if (!friend) return
    setSelectedFriendIds((prev) => (prev.includes(friend.id) ? prev : [...prev, friend.id]))
  }

  const handleRemoveSelectedFriend = (friendId: string) => {
    setSelectedFriendIds((prev) => prev.filter((id) => id !== friendId))
  }

  const handleAddMembers = async () => {
    if (!selectedGroup || selectedFriendIds.length === 0 || addingMembers) return
    const groupId = selectedGroup.id
    const pendingFriendIds = [...selectedFriendIds]
    setAddingMembers(true)
    try {
      const failedFriendIds: string[] = []
      const addedFriendIds: string[] = []

      for (const friendId of pendingFriendIds) {
        const added = await addUserToGroup(friendId, groupId)
        if (added) {
          addedFriendIds.push(friendId)
        } else {
          failedFriendIds.push(friendId)
        }
      }

      if (addedFriendIds.length > 0) {
        setMembers((prev) => {
          const existingIds = new Set(prev.map((member) => member.id))
          const additions = addedFriendIds
            .map((friendId) => friends.find((friend) => friend.id === friendId))
            .filter((friend): friend is { id: string; name: string; avatar: string } => !!friend)
            .filter((friend) => !existingIds.has(friend.id))
            .map((friend) => ({
              ...friend,
              user: {
                id: friend.id,
                name: friend.name,
                avatar: friend.avatar,
              },
              role: 'MEMBER' as const,
            }))

          return additions.length > 0 ? [...prev, ...additions] : prev
        })
      }

      const refreshed = await fetchGroupMembersWithRoles(groupId)
      if (refreshed.length > 0) {
        setMembers(refreshed)
      }

      setSelectedFriendIds(failedFriendIds)
    } finally {
      setAddingMembers(false)
    }
  }

  React.useEffect(() => {
    setSelectedFriendIds([])
    setMemberPickerValue(null)
  }, [selectedGroupId])

  React.useEffect(() => {
    if (!selectedGroup) {
      setGroupSettingsDraft(null)
      return
    }
    setGroupSettingsDraft({
      name: selectedGroup.name,
      allowMembersCreateEvents: selectedGroup.allowMembersCreateEvents,
      allowMembersAddMembers: selectedGroup.allowMembersAddMembers,
      newMembersRequireAdminApproval: selectedGroup.allowMembersAddMembers
        ? selectedGroup.newMembersRequireAdminApproval
        : false,
    })
    setSettingsMessage(null)
    setProcessingRequestId(null)
  }, [selectedGroup])

  const refreshPendingRequests = React.useCallback(async () => {
    if (!selectedGroup || !isAdmin) {
      setPendingRequests([])
      return
    }
    setLoadingRequests(true)
    const requests = await fetchGroupMemberRequests(selectedGroup.id)
    setPendingRequests(requests)
    setLoadingRequests(false)
  }, [isAdmin, selectedGroup])

  React.useEffect(() => {
    if (activeTab !== 'settings') return
    void refreshPendingRequests()
  }, [activeTab, refreshPendingRequests])

  const handleSaveSettings = async () => {
    if (!selectedGroup || !groupSettingsDraft || savingSettings) return
    const trimmedName = groupSettingsDraft.name.trim()
    const newMembersRequireAdminApproval =
      groupSettingsDraft.allowMembersAddMembers && groupSettingsDraft.newMembersRequireAdminApproval
    if (!trimmedName) {
      setSettingsMessage('Group name is required.')
      return
    }

    setSavingSettings(true)
    setSettingsMessage(null)
    const updated = await updateGroup(selectedGroup.id, {
      name: trimmedName,
      allowMembersCreateEvents: groupSettingsDraft.allowMembersCreateEvents,
      allowMembersAddMembers: groupSettingsDraft.allowMembersAddMembers,
      newMembersRequireAdminApproval,
    })
    if (!updated) {
      setSettingsMessage('Failed to save settings. Please try again.')
      setSavingSettings(false)
      return
    }

    setGroups((prev) => prev.map((group) => (group.id === updated.id ? updated : group)))
    setGroupSettingsDraft({
      name: updated.name,
      allowMembersCreateEvents: updated.allowMembersCreateEvents,
      allowMembersAddMembers: updated.allowMembersAddMembers,
      newMembersRequireAdminApproval: updated.allowMembersAddMembers
        ? updated.newMembersRequireAdminApproval
        : false,
    })
    setSettingsMessage('Settings saved.')
    setSavingSettings(false)

    if (updated.allowMembersAddMembers && updated.newMembersRequireAdminApproval) {
      void refreshPendingRequests()
    } else {
      setPendingRequests([])
    }
  }

  const handleApproveRequest = async (request: GroupMemberRequest) => {
    if (!selectedGroup || processingRequestId) return
    setProcessingRequestId(request.id)
    const approved = await approveGroupMemberRequest(request.id, request.requesterId, selectedGroup.id)
    if (!approved) {
      setSettingsMessage('Failed to approve request.')
      setProcessingRequestId(null)
      return
    }

    const [updatedMembers] = await Promise.all([
      fetchGroupMembersWithRoles(selectedGroup.id),
      refreshPendingRequests(),
    ])
    setMembers(updatedMembers)
    setSettingsMessage('Request approved.')
    setProcessingRequestId(null)
  }

  const handleDenyRequest = async (requestId: string) => {
    if (processingRequestId) return
    setProcessingRequestId(requestId)
    const denied = await denyGroupMemberRequest(requestId)
    if (!denied) {
      setSettingsMessage('Failed to deny request.')
      setProcessingRequestId(null)
      return
    }
    await refreshPendingRequests()
    setSettingsMessage('Request denied.')
    setProcessingRequestId(null)
  }

  const membersCanAddMembers =
    groupSettingsDraft?.allowMembersAddMembers ?? selectedGroup?.allowMembersAddMembers ?? false
  const newMembersRequireAdminApprovalEnabled =
    membersCanAddMembers &&
    (groupSettingsDraft?.newMembersRequireAdminApproval ??
      selectedGroup?.newMembersRequireAdminApproval ??
      false)

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
                {canAddMembers ? (
                  <div className="flex gap-2">
                    <Combobox<{ id: string; name: string; avatar: string }>
                      items={selectableFriends}
                      value={memberPickerValue}
                      onValueChange={handleSelectFriend}
                      itemToString={(friend) => friend?.name ?? ''}
                      className="flex-1"
                    >
                      <ComboboxInput
                        disabled={addableFriends.length === 0 || addingMembers}
                        showClear={false}
                        placeholder={addableFriends.length === 0 ? 'No friends to add' : 'Add friends to this group...'}
                        startContent={
                          selectedFriends.length > 0 ? (
                            <ComboboxChips>
                              {selectedFriends.map((friend) => (
                                <ComboboxChip key={friend.id}>
                                  <span>{friend.name}</span>
                                  <ComboboxChipRemove
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleRemoveSelectedFriend(friend.id)
                                    }}
                                    aria-label={`Remove ${friend.name}`}
                                  />
                                </ComboboxChip>
                              ))}
                            </ComboboxChips>
                          ) : null
                        }
                      />
                      <ComboboxContent>
                        <ComboboxEmpty>
                          {addableFriends.length === 0 ? 'All friends are already members.' : 'No friends match your search.'}
                        </ComboboxEmpty>
                        <ComboboxList<{ id: string; name: string; avatar: string }>>
                          {(friend) => (
                            <ComboboxItem key={friend.id} value={friend}>
                              {friend.name}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    <button
                      type="button"
                      onClick={handleAddMembers}
                      disabled={selectedFriendIds.length === 0 || addingMembers}
                      className="px-4 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold"
                    >
                      {addingMembers ? 'Adding...' : `Add${selectedFriendIds.length > 0 ? ` (${selectedFriendIds.length})` : ''}`}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3 text-sm text-slate-300">
                    Only admins can add members for this group.
                  </div>
                )}

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
                      value={groupSettingsDraft?.name ?? selectedGroup.name}
                      onChange={(event) =>
                        setGroupSettingsDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                name: event.target.value,
                              }
                            : prev,
                        )
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 space-y-3">
                    <div className="text-sm font-semibold text-white">Permissions</div>
                    <label className="flex items-center gap-3 text-sm text-slate-200">
                      <Switch
                        checked={groupSettingsDraft?.allowMembersCreateEvents ?? selectedGroup.allowMembersCreateEvents}
                        onCheckedChange={(checked) =>
                          setGroupSettingsDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  allowMembersCreateEvents: checked,
                                }
                              : prev,
                          )
                        }
                      />
                      <span>Members can create events</span>
                    </label>
                    <label className="flex items-center gap-3 text-sm text-slate-200">
                      <Switch
                        checked={groupSettingsDraft?.allowMembersAddMembers ?? selectedGroup.allowMembersAddMembers}
                        onCheckedChange={(checked) =>
                          setGroupSettingsDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  allowMembersAddMembers: checked,
                                  newMembersRequireAdminApproval: checked
                                    ? prev.newMembersRequireAdminApproval
                                    : false,
                                }
                              : prev,
                          )
                        }
                      />
                      <span>Members can add members</span>
                    </label>
                    <label
                      className={`ml-7 flex items-center gap-3 text-sm ${
                        membersCanAddMembers ? 'text-slate-200' : 'text-slate-400'
                      }`}
                    >
                      <Switch
                        checked={newMembersRequireAdminApprovalEnabled}
                        disabled={!membersCanAddMembers}
                        onCheckedChange={(checked) =>
                          setGroupSettingsDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  newMembersRequireAdminApproval: checked,
                                }
                              : prev,
                          )
                        }
                      />
                      <span>New members require admin approval</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={!settingsDirty || savingSettings}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold"
                    >
                      {savingSettings ? 'Saving...' : 'Save settings'}
                    </button>
                    {settingsMessage ? <div className="text-xs text-slate-300">{settingsMessage}</div> : null}
                  </div>

                  {newMembersRequireAdminApprovalEnabled ? (
                    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-white">Membership requests</div>
                        <span className="text-xs text-slate-400">{pendingRequests.length} pending</span>
                      </div>

                      {loadingRequests ? (
                        <div className="text-sm text-slate-400">Loading requests...</div>
                      ) : pendingRequests.length === 0 ? (
                        <div className="text-sm text-slate-400">No pending requests.</div>
                      ) : (
                        <div className="space-y-2">
                          {pendingRequests.map((request) => (
                            <div
                              key={request.id}
                              className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
                            >
                              <UserAvatar
                                src={request.requester.avatar}
                                alt={request.requester.name}
                                size="sm"
                                className="border-slate-500"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-white truncate">{request.requester.name}</div>
                                <div className="text-xs text-slate-400">
                                  Requested {new Date(request.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleApproveRequest(request)}
                                disabled={processingRequestId === request.id}
                                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-xs text-white font-semibold"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDenyRequest(request.id)}
                                disabled={processingRequestId === request.id}
                                className="px-3 py-1.5 rounded-lg border border-slate-600 hover:border-slate-500 disabled:opacity-50 text-xs text-slate-200 font-semibold"
                              >
                                Deny
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
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
