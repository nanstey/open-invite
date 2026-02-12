import * as React from 'react'
import { Plus, ShieldCheck, UserPlus, UsersRound } from 'lucide-react'

import type { GroupRole } from '../../lib/types'
import { supabase } from '../../lib/supabase'
import { Button } from '../../lib/ui/9ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../lib/ui/9ui/card'
import { Checkbox } from '../../lib/ui/9ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../lib/ui/9ui/dialog'
import { Input } from '../../lib/ui/9ui/input'
import { LoadingSpinner } from '../../lib/ui/components/LoadingSpinner'
import { SearchInput } from '../../lib/ui/components/SearchInput'
import {
  addUserToGroup,
  approveGroupMemberRequest,
  createGroup,
  createGroupMemberRequest,
  denyGroupMemberRequest,
  fetchGroupMemberRequests,
  fetchGroupMembershipsForCurrentUser,
  fetchGroupMembersWithRoles,
  removeUserFromGroup,
  updateGroup,
  updateGroupMemberRole,
  type GroupMember,
  type GroupMemberRequest,
  type GroupMembership,
} from '../../services/friendService'

type GroupFormState = {
  name: string
  allowMembersCreateEvents: boolean
  allowMembersAddMembers: boolean
  newMembersRequireAdminApproval: boolean
}

const DEFAULT_GROUP_FORM: GroupFormState = {
  name: '',
  allowMembersCreateEvents: true,
  allowMembersAddMembers: true,
  newMembersRequireAdminApproval: false,
}

export function GroupsView() {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [memberships, setMemberships] = React.useState<GroupMembership[]>([])
  const [loadingGroups, setLoadingGroups] = React.useState(true)
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null)
  const [members, setMembers] = React.useState<GroupMember[]>([])
  const [pendingRequests, setPendingRequests] = React.useState<GroupMemberRequest[]>([])
  const [loadingMembers, setLoadingMembers] = React.useState(false)
  const [loadingRequests, setLoadingRequests] = React.useState(false)
  const [memberActionIds, setMemberActionIds] = React.useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)

  const [groupForm, setGroupForm] = React.useState<GroupFormState>(DEFAULT_GROUP_FORM)
  const [savingGroup, setSavingGroup] = React.useState(false)

  const [newGroupForm, setNewGroupForm] = React.useState<GroupFormState>(DEFAULT_GROUP_FORM)
  const [creatingGroup, setCreatingGroup] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)

  const [memberInput, setMemberInput] = React.useState('')
  const [memberError, setMemberError] = React.useState('')

  const groups = memberships.map((membership) => membership.group)
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null
  const selectedRole = memberships.find((membership) => membership.group.id === selectedGroupId)?.role ?? 'MEMBER'
  const canAdmin = selectedRole === 'ADMIN'

  React.useEffect(() => {
    let isMounted = true
    const loadInitial = async () => {
      setLoadingGroups(true)
      const { data } = await supabase.auth.getSession()
      if (!isMounted) return
      setCurrentUserId(data.session?.user?.id ?? null)

      const dataMemberships = await fetchGroupMembershipsForCurrentUser()
      if (!isMounted) return
      setMemberships(dataMemberships)
      setLoadingGroups(false)
      if (dataMemberships.length > 0 && !selectedGroupId) {
        setSelectedGroupId(dataMemberships[0].group.id)
      }
    }
    loadInitial()
    return () => {
      isMounted = false
    }
  }, [])

  React.useEffect(() => {
    if (!selectedGroupId) return
    let isMounted = true
    const loadMembers = async () => {
      setLoadingMembers(true)
      const dataMembers = await fetchGroupMembersWithRoles(selectedGroupId)
      if (!isMounted) return
      setMembers(dataMembers)
      setLoadingMembers(false)
    }
    loadMembers()
    return () => {
      isMounted = false
    }
  }, [selectedGroupId])

  React.useEffect(() => {
    if (!selectedGroupId || !canAdmin) {
      setPendingRequests([])
      return
    }
    let isMounted = true
    const loadRequests = async () => {
      setLoadingRequests(true)
      const dataRequests = await fetchGroupMemberRequests(selectedGroupId)
      if (!isMounted) return
      setPendingRequests(dataRequests)
      setLoadingRequests(false)
    }
    loadRequests()
    return () => {
      isMounted = false
    }
  }, [selectedGroupId, canAdmin])

  React.useEffect(() => {
    if (!selectedGroup) return
    setGroupForm({
      name: selectedGroup.name,
      allowMembersCreateEvents: selectedGroup.allowMembersCreateEvents,
      allowMembersAddMembers: selectedGroup.allowMembersAddMembers,
      newMembersRequireAdminApproval: selectedGroup.newMembersRequireAdminApproval,
    })
    setMemberInput('')
    setMemberError('')
  }, [selectedGroup])

  React.useEffect(() => {
    if (!createDialogOpen) {
      setNewGroupForm(DEFAULT_GROUP_FORM)
    }
  }, [createDialogOpen])

  const filteredMemberships = memberships.filter((membership) =>
    membership.group.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return
    setSavingGroup(true)
    const updated = await updateGroup(selectedGroup.id, {
      name: groupForm.name.trim(),
      allowMembersCreateEvents: groupForm.allowMembersCreateEvents,
      allowMembersAddMembers: groupForm.allowMembersAddMembers,
      newMembersRequireAdminApproval: groupForm.newMembersRequireAdminApproval,
    })
    if (updated) {
      setMemberships((prev) =>
        prev.map((membership) =>
          membership.group.id === updated.id ? { ...membership, group: updated } : membership,
        ),
      )
    }
    setSavingGroup(false)
  }

  const handleCreateGroup = async () => {
    const name = newGroupForm.name.trim()
    if (!name) return
    setCreatingGroup(true)
    const created = await createGroup(name, {
      allowMembersCreateEvents: newGroupForm.allowMembersCreateEvents,
      allowMembersAddMembers: newGroupForm.allowMembersAddMembers,
      newMembersRequireAdminApproval: newGroupForm.newMembersRequireAdminApproval,
    })
    if (created) {
      setMemberships((prev) => [{ group: created, role: 'ADMIN' }, ...prev])
      setSelectedGroupId(created.id)
      setNewGroupForm(DEFAULT_GROUP_FORM)
      setCreateDialogOpen(false)
    }
    setCreatingGroup(false)
  }

  const updateMemberAction = (id: string, active: boolean) => {
    setMemberActionIds((prev) => {
      const next = new Set(prev)
      active ? next.add(id) : next.delete(id)
      return next
    })
  }

  const handleAddMember = async () => {
    if (!selectedGroup) return
    const userId = memberInput.trim()
    if (!userId) return
    setMemberError('')
    updateMemberAction(userId, true)
    let success = false
    if (canAdmin || !selectedGroup.newMembersRequireAdminApproval) {
      success = await addUserToGroup(userId, selectedGroup.id)
    } else if (selectedGroup.allowMembersAddMembers) {
      success = await createGroupMemberRequest(selectedGroup.id, userId)
    } else {
      setMemberError('Only admins can add new members.')
    }

    if (success) {
      setMemberInput('')
      const refreshedMembers = await fetchGroupMembersWithRoles(selectedGroup.id)
      setMembers(refreshedMembers)
    }
    updateMemberAction(userId, false)
  }

  const handleUpdateMemberRole = async (member: GroupMember, nextRole: GroupRole) => {
    if (!selectedGroup) return
    updateMemberAction(member.user.id, true)
    const success = await updateGroupMemberRole(selectedGroup.id, member.user.id, nextRole)
    if (success) {
      setMembers((prev) =>
        prev.map((row) => (row.user.id === member.user.id ? { ...row, role: nextRole } : row)),
      )
    }
    updateMemberAction(member.user.id, false)
  }

  const handleRemoveMember = async (member: GroupMember) => {
    if (!selectedGroup) return
    updateMemberAction(member.user.id, true)
    const success = await removeUserFromGroup(member.user.id, selectedGroup.id)
    if (success) {
      setMembers((prev) => prev.filter((row) => row.user.id !== member.user.id))
    }
    updateMemberAction(member.user.id, false)
  }

  const handleApproveRequest = async (request: GroupMemberRequest) => {
    updateMemberAction(request.id, true)
    const success = await approveGroupMemberRequest(request.id, request.requesterId, request.groupId)
    if (success) {
      setPendingRequests((prev) => prev.filter((row) => row.id !== request.id))
      const refreshedMembers = await fetchGroupMembersWithRoles(request.groupId)
      setMembers(refreshedMembers)
    }
    updateMemberAction(request.id, false)
  }

  const handleDenyRequest = async (request: GroupMemberRequest) => {
    updateMemberAction(request.id, true)
    const success = await denyGroupMemberRequest(request.id)
    if (success) {
      setPendingRequests((prev) => prev.filter((row) => row.id !== request.id))
    }
    updateMemberAction(request.id, false)
  }

  const hasGroupChanges =
    selectedGroup &&
    (groupForm.name.trim() !== selectedGroup.name ||
      groupForm.allowMembersCreateEvents !== selectedGroup.allowMembersCreateEvents ||
      groupForm.allowMembersAddMembers !== selectedGroup.allowMembersAddMembers ||
      groupForm.newMembersRequireAdminApproval !== selectedGroup.newMembersRequireAdminApproval)

  return (
    <div className="w-full pb-20 pt-2 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search groups..."
            size="lg"
          />
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New group
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create group</DialogTitle>
              <DialogDescription>Start a new group and configure its permissions.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 uppercase tracking-wide">Group name</label>
                <Input
                  value={newGroupForm.name}
                  onChange={(e) => setNewGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Weekend Crew"
                />
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <Checkbox
                    checked={newGroupForm.allowMembersCreateEvents}
                    onChange={(e) =>
                      setNewGroupForm((prev) => ({ ...prev, allowMembersCreateEvents: e.target.checked }))
                    }
                  />
                  Allow members to create events for the group
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <Checkbox
                    checked={newGroupForm.allowMembersAddMembers}
                    onChange={(e) =>
                      setNewGroupForm((prev) => ({ ...prev, allowMembersAddMembers: e.target.checked }))
                    }
                  />
                  Allow members to add new members
                </label>
                {newGroupForm.allowMembersAddMembers ? (
                  <label className="ml-6 flex items-center gap-2 text-sm text-slate-300">
                    <Checkbox
                      checked={newGroupForm.newMembersRequireAdminApproval}
                      onChange={(e) =>
                        setNewGroupForm((prev) => ({
                          ...prev,
                          newMembersRequireAdminApproval: e.target.checked,
                        }))
                      }
                    />
                    New members require admin approval
                  </label>
                ) : null}
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" size="sm" onClick={() => setNewGroupForm(DEFAULT_GROUP_FORM)}>
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleCreateGroup}
                disabled={creatingGroup || !newGroupForm.name.trim()}
              >
                {creatingGroup ? 'Creating...' : 'Create group'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loadingGroups ? (
        <LoadingSpinner message="Loading groups..." />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="h-4 w-4" />
                Your groups
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredMemberships.length === 0 ? (
                <div className="text-sm text-slate-400">No groups found.</div>
              ) : (
                filteredMemberships.map((membership) => (
                  <button
                    key={membership.group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(membership.group.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                      selectedGroupId === membership.group.id
                        ? 'border-primary bg-slate-800 text-white'
                        : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{membership.group.name}</span>
                      <span className="text-xs text-slate-400">{membership.role}</span>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {selectedGroup ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Group settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400 uppercase tracking-wide">Group name</label>
                      <Input
                        value={groupForm.name}
                        onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                        disabled={!canAdmin}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm text-slate-200">
                        <Checkbox
                          checked={groupForm.allowMembersCreateEvents}
                          onChange={(e) =>
                            setGroupForm((prev) => ({ ...prev, allowMembersCreateEvents: e.target.checked }))
                          }
                          disabled={!canAdmin}
                        />
                        Allow members to create events for the group
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-200">
                        <Checkbox
                          checked={groupForm.allowMembersAddMembers}
                          onChange={(e) =>
                            setGroupForm((prev) => ({ ...prev, allowMembersAddMembers: e.target.checked }))
                          }
                          disabled={!canAdmin}
                        />
                        Allow members to add new members
                      </label>
                      {groupForm.allowMembersAddMembers ? (
                        <label className="ml-6 flex items-center gap-2 text-sm text-slate-300">
                          <Checkbox
                            checked={groupForm.newMembersRequireAdminApproval}
                            onChange={(e) =>
                              setGroupForm((prev) => ({
                                ...prev,
                                newMembersRequireAdminApproval: e.target.checked,
                              }))
                            }
                            disabled={!canAdmin}
                          />
                          New members require admin approval
                        </label>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      onClick={handleUpdateGroup}
                      disabled={!canAdmin || !hasGroupChanges || savingGroup}
                    >
                      {savingGroup ? 'Saving...' : 'Save changes'}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                      <Input
                        value={memberInput}
                        onChange={(e) => setMemberInput(e.target.value)}
                        placeholder="Add member by user ID"
                        disabled={!selectedGroup.allowMembersAddMembers && !canAdmin}
                      />
                      <Button
                        size="sm"
                        onClick={handleAddMember}
                        disabled={!memberInput.trim() || memberActionIds.has(memberInput.trim())}
                      >
                        Add member
                      </Button>
                    </div>
                    {memberError ? <div className="text-xs text-red-400">{memberError}</div> : null}

                    {loadingMembers ? (
                      <LoadingSpinner message="Loading members..." />
                    ) : (
                      <div className="space-y-3">
                        {members.map((member) => {
                          const isProcessing = memberActionIds.has(member.user.id)
                          return (
                            <div
                              key={member.user.id}
                              className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3 md:flex-row md:items-center md:justify-between"
                            >
                              <div>
                                <div className="font-semibold text-white">{member.user.name}</div>
                                <div className="text-xs text-slate-400">{member.user.id}</div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                <span className="rounded-full border border-slate-700 px-2 py-1">{member.role}</span>
                                {canAdmin && member.user.id !== currentUserId ? (
                                  <>
                                    {member.role === 'MEMBER' ? (
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleUpdateMemberRole(member, 'ADMIN')}
                                        disabled={isProcessing}
                                      >
                                        Promote to admin
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleUpdateMemberRole(member, 'MEMBER')}
                                        disabled={isProcessing}
                                      >
                                        Demote to member
                                      </Button>
                                    )}
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleRemoveMember(member)}
                                      disabled={isProcessing}
                                    >
                                      Remove
                                    </Button>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {canAdmin ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Pending requests</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {loadingRequests ? (
                        <LoadingSpinner message="Loading requests..." />
                      ) : pendingRequests.length === 0 ? (
                        <div className="text-sm text-slate-400">No pending requests.</div>
                      ) : (
                        pendingRequests.map((request) => (
                          <div
                            key={request.id}
                            className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <div className="font-semibold text-white">{request.requester.name}</div>
                              <div className="text-xs text-slate-400">{request.requester.id}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveRequest(request)}
                                disabled={memberActionIds.has(request.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDenyRequest(request)}
                                disabled={memberActionIds.has(request.id)}
                              >
                                Deny
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </>
            ) : (
              <div className="text-sm text-slate-400">Select a group to manage settings.</div>
            )}
          </div>
        </div>
      )}
      {groups.length === 0 ? (
        <div className="text-sm text-slate-400">Create your first group to start organizing events.</div>
      ) : null}
    </div>
  )
}
