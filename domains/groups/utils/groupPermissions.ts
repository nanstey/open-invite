import type { Group } from '../../../lib/types'
import type { GroupMember } from '../../../services/groupService'

export function isGroupAdmin(group: Group | null, userId: string | undefined): boolean {
  if (!group || !userId) return false
  return group.createdBy === userId
}

export function canManageGroupSettings(
  group: Group | null,
  roleByGroupId: Record<string, 'ADMIN' | 'MEMBER'>,
  userId: string | undefined
): boolean {
  if (!group || !userId) return false
  return group.createdBy === userId || roleByGroupId[group.id] === 'ADMIN'
}

export function canAddMembersToGroup(
  group: Group | null,
  roleByGroupId: Record<string, 'ADMIN' | 'MEMBER'>,
  userId: string | undefined
): boolean {
  if (!group || !userId) return false
  const isAdmin = canManageGroupSettings(group, roleByGroupId, userId)
  if (isAdmin) return true
  if (!group.allowMembersAddMembers) return false

  // Security hardening: non-admin members cannot create requests on behalf of others
  // when approval flow is enabled.
  if (group.newMembersRequireAdminApproval) return false

  return true
}

export function canRemoveGroupMember(
  group: Group | null,
  member: GroupMember,
  roleByGroupId: Record<string, 'ADMIN' | 'MEMBER'>,
  userId: string | undefined
): boolean {
  if (!group || !userId) return false
  const isAdmin = canManageGroupSettings(group, roleByGroupId, userId)
  if (!isAdmin) return false

  const isCreatorRow = member.id === group.createdBy
  const isSelfRow = member.id === userId

  return !isCreatorRow && !isSelfRow
}
