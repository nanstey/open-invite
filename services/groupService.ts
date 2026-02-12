import { supabase } from '../lib/supabase';
import type { User, Group, GroupRole } from '../lib/types';
import type { Database } from '../lib/database.types';
import { fetchUsers } from './userService';

type GroupRow = Database['public']['Tables']['groups']['Row'];
type GroupInsert = Database['public']['Tables']['groups']['Insert'];
type GroupUpdate = Database['public']['Tables']['groups']['Update'];
type UserGroupRow = Database['public']['Tables']['user_groups']['Row'];
type UserGroupInsert = Database['public']['Tables']['user_groups']['Insert'];
type GroupMemberRequestRow = Database['public']['Tables']['group_member_requests']['Row'];

export type GroupMembership = {
  group: Group;
  role: GroupRole;
};

export type GroupMembershipRole = GroupRole;

export type GroupMember = User & {
  user: User;
  role: GroupMembershipRole;
};

export type GroupMemberRequest = {
  id: string;
  groupId: string;
  requester: User;
  requesterId: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  createdAt: string;
};

const DEFAULT_GROUP_SETTINGS = {
  allowMembersCreateEvents: true,
  allowMembersAddMembers: true,
  newMembersRequireAdminApproval: false,
};

/**
 * Fetch groups that the user can access (groups they created or are members of)
 */
export async function fetchGroups(_userId: string): Promise<Group[]> {
  const { data: groups, error } = await supabase
    .from('groups')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error || !groups) {
    console.error('Error fetching groups:', error);
    return [];
  }

  return (groups as GroupRow[]).map(g => ({
    id: g.id,
    name: g.name,
    createdBy: g.created_by,
    allowMembersCreateEvents: g.allow_members_create_events ?? DEFAULT_GROUP_SETTINGS.allowMembersCreateEvents,
    allowMembersAddMembers: g.allow_members_add_members ?? DEFAULT_GROUP_SETTINGS.allowMembersAddMembers,
    newMembersRequireAdminApproval:
      g.new_members_require_admin_approval ?? DEFAULT_GROUP_SETTINGS.newMembersRequireAdminApproval,
    deletedAt: g.deleted_at || undefined,
  }));
}

/**
 * Fetch user groups for the current user (groups they are members of)
 */
export async function fetchUserGroups(userId: string): Promise<Group[]> {
  const { data: userGroups, error } = await supabase
    .from('user_groups')
    .select('group_id, groups(*)')
    .eq('user_id', userId);

  if (error || !userGroups) {
    console.error('Error fetching user groups:', error);
    return [];
  }

  type UserGroupWithGroup = Pick<UserGroupRow, 'group_id'> & {
    groups: GroupRow | null;
  };

  return (userGroups as UserGroupWithGroup[])
    .filter(ug => ug.groups && !ug.groups.deleted_at)
    .map(ug => ({
      id: ug.groups!.id,
      name: ug.groups!.name,
      createdBy: ug.groups!.created_by,
      allowMembersCreateEvents:
        ug.groups!.allow_members_create_events ?? DEFAULT_GROUP_SETTINGS.allowMembersCreateEvents,
      allowMembersAddMembers: ug.groups!.allow_members_add_members ?? DEFAULT_GROUP_SETTINGS.allowMembersAddMembers,
      newMembersRequireAdminApproval:
        ug.groups!.new_members_require_admin_approval ?? DEFAULT_GROUP_SETTINGS.newMembersRequireAdminApproval,
      deletedAt: ug.groups!.deleted_at || undefined,
    }));
}

/**
 * Create a new group
 */
export async function createGroup(
  name: string,
  settings: {
    allowMembersCreateEvents: boolean;
    allowMembersAddMembers: boolean;
    newMembersRequireAdminApproval: boolean;
  } = DEFAULT_GROUP_SETTINGS,
): Promise<Group | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const insertData: GroupInsert = {
    name,
    created_by: userId,
    allow_members_create_events: settings.allowMembersCreateEvents,
    allow_members_add_members: settings.allowMembersAddMembers,
    new_members_require_admin_approval: settings.newMembersRequireAdminApproval,
  };
  const { data: group, error } = await (supabase
    .from('groups') as any)
    .insert(insertData)
    .select()
    .single();

  if (error || !group) {
    console.error('Error creating group:', error);
    return null;
  }

  // Add creator as admin member
  const userGroupInsert: UserGroupInsert = {
    user_id: userId,
    group_id: (group as GroupRow).id,
    role: 'ADMIN',
  };
  await (supabase.from('user_groups') as any).insert(userGroupInsert);

  const groupRow = group as GroupRow;
  return {
    id: groupRow.id,
    name: groupRow.name,
    createdBy: groupRow.created_by,
    allowMembersCreateEvents:
      groupRow.allow_members_create_events ?? settings.allowMembersCreateEvents,
    allowMembersAddMembers: groupRow.allow_members_add_members ?? settings.allowMembersAddMembers,
    newMembersRequireAdminApproval:
      groupRow.new_members_require_admin_approval ?? settings.newMembersRequireAdminApproval,
    deletedAt: groupRow.deleted_at || undefined,
  };
}

export async function updateGroup(
  groupId: string,
  updates: Partial<{
    name: string;
    allowMembersCreateEvents: boolean;
    allowMembersAddMembers: boolean;
    newMembersRequireAdminApproval: boolean;
  }>,
): Promise<Group | null> {
  const payload: GroupUpdate = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.allowMembersCreateEvents !== undefined) {
    payload.allow_members_create_events = updates.allowMembersCreateEvents;
  }
  if (updates.allowMembersAddMembers !== undefined) {
    payload.allow_members_add_members = updates.allowMembersAddMembers;
  }
  if (updates.newMembersRequireAdminApproval !== undefined) {
    payload.new_members_require_admin_approval = updates.newMembersRequireAdminApproval;
  }

  const { data: updated, error } = await (supabase
    .from('groups') as any)
    .update(payload)
    .eq('id', groupId)
    .select()
    .single();

  if (error || !updated) {
    console.error('Error updating group:', error);
    return null;
  }

  const row = updated as GroupRow;
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    allowMembersCreateEvents:
      row.allow_members_create_events ?? DEFAULT_GROUP_SETTINGS.allowMembersCreateEvents,
    allowMembersAddMembers: row.allow_members_add_members ?? DEFAULT_GROUP_SETTINGS.allowMembersAddMembers,
    newMembersRequireAdminApproval:
      row.new_members_require_admin_approval ?? DEFAULT_GROUP_SETTINGS.newMembersRequireAdminApproval,
    deletedAt: row.deleted_at || undefined,
  };
}

/**
 * Add user to a group
 */
export async function addUserToGroup(userId: string, groupId: string): Promise<boolean> {
  const insertData: UserGroupInsert = {
    user_id: userId,
    group_id: groupId,
    role: 'MEMBER',
  };
  const { error } = await (supabase
    .from('user_groups') as any)
    .insert(insertData);

  return !error;
}

/**
 * Remove user from a group
 */
export async function removeUserFromGroup(userId: string, groupId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_groups')
    .delete()
    .eq('user_id', userId)
    .eq('group_id', groupId);

  return !error;
}

/**
 * Fetch group members
 */
export async function fetchGroupMembers(groupId: string): Promise<User[]> {
  const { data: userGroups, error } = await supabase
    .from('user_groups')
    .select('user_id')
    .eq('group_id', groupId);

  if (error || !userGroups) {
    console.error('Error fetching group members:', error);
    return [];
  }

  const userIds = (userGroups as Pick<UserGroupRow, 'user_id'>[]).map(ug => ug.user_id);
  return fetchUsers(userIds);
}


export async function fetchGroupMembershipsForCurrentUser(): Promise<GroupMembership[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return [];
  }

  const { data: userGroups, error } = await supabase
    .from('user_groups')
    .select('role, groups(*)')
    .eq('user_id', userId);

  if (error || !userGroups) {
    console.error('Error fetching group memberships:', error);
    return [];
  }

  type UserGroupWithGroup = Pick<UserGroupRow, 'role'> & {
    groups: GroupRow | null;
  };

  return (userGroups as UserGroupWithGroup[])
    .filter((ug) => ug.groups && !ug.groups.deleted_at)
    .map((ug) => ({
      role: (ug.role ?? 'MEMBER') as GroupRole,
      group: {
        id: ug.groups!.id,
        name: ug.groups!.name,
        createdBy: ug.groups!.created_by,
        allowMembersCreateEvents:
          ug.groups!.allow_members_create_events ?? DEFAULT_GROUP_SETTINGS.allowMembersCreateEvents,
        allowMembersAddMembers:
          ug.groups!.allow_members_add_members ?? DEFAULT_GROUP_SETTINGS.allowMembersAddMembers,
        newMembersRequireAdminApproval:
          ug.groups!.new_members_require_admin_approval ?? DEFAULT_GROUP_SETTINGS.newMembersRequireAdminApproval,
        deletedAt: ug.groups!.deleted_at || undefined,
      },
    }));
}

/**
 * Fetch roles for the current user across all groups they belong to.
 */
export async function fetchCurrentUserGroupRoles(userId: string): Promise<Record<string, GroupMembershipRole>> {
  const { data: memberships, error } = await supabase
    .from('user_groups')
    .select('group_id, role')
    .eq('user_id', userId);

  if (error || !memberships) {
    console.error('Error fetching user group roles:', error);
    return {};
  }

  const roleByGroupId: Record<string, GroupMembershipRole> = {};
  for (const membership of memberships as Pick<UserGroupRow, 'group_id' | 'role'>[]) {
    roleByGroupId[membership.group_id] = membership.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
  }

  return roleByGroupId;
}

/**
 * Fetch group members including their role in the group.
 */
export async function fetchGroupMembersWithRoles(groupId: string): Promise<GroupMember[]> {
  const { data: userGroups, error } = await supabase
    .from('user_groups')
    .select('user_id, role')
    .eq('group_id', groupId);

  if (error || !userGroups) {
    console.error('Error fetching group members with roles:', error);
    return [];
  }

  const rows = userGroups as Pick<UserGroupRow, 'user_id' | 'role'>[];
  const userIds = rows.map((row) => row.user_id);
  const users = await fetchUsers(userIds);
  const userMap = new Map(users.map((u) => [u.id, u]));

  return rows
    .map((row) => {
      const user = userMap.get(row.user_id);
      if (!user) return null;
      return {
        ...user,
        user,
        role: (row.role ?? 'MEMBER') as GroupMembershipRole,
      } satisfies GroupMember;
    })
    .filter((row): row is GroupMember => !!row);
}

export async function updateGroupMemberRole(groupId: string, userId: string, role: GroupRole): Promise<boolean> {
  const { error } = await supabase
    .from('user_groups')
    .update({ role })
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating group member role:', error);
  }

  return !error;
}

export async function createGroupMemberRequest(groupId: string, requesterId: string): Promise<boolean> {
  const { error } = await supabase
    .from('group_member_requests')
    .insert({ group_id: groupId, requester_id: requesterId, status: 'PENDING' });

  if (error) {
    console.error('Error creating group member request:', error);
  }

  return !error;
}

export async function fetchGroupMemberRequests(groupId: string): Promise<GroupMemberRequest[]> {
  const { data: requests, error } = await supabase
    .from('group_member_requests')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });

  if (error || !requests) {
    console.error('Error fetching group member requests:', error);
    return [];
  }

  const rows = requests as GroupMemberRequestRow[];
  const requesterIds = rows.map((row) => row.requester_id);
  const requesters = await fetchUsers(requesterIds);
  const requesterMap = new Map(requesters.map((u) => [u.id, u]));

  return rows
    .map((row) => {
      const requester = requesterMap.get(row.requester_id);
      if (!requester) return null;
      return {
        id: row.id,
        groupId: row.group_id,
        requester,
        requesterId: row.requester_id,
        status: row.status as GroupMemberRequest['status'],
        createdAt: row.created_at,
      };
    })
    .filter((row): row is GroupMemberRequest => !!row);
}

export async function approveGroupMemberRequest(requestId: string, userId: string, groupId: string): Promise<boolean> {
  const { error: updateError } = await supabase
    .from('group_member_requests')
    .update({ status: 'APPROVED' })
    .eq('id', requestId);

  if (updateError) {
    console.error('Error approving group member request:', updateError);
    return false;
  }

  return addUserToGroup(userId, groupId);
}

export async function denyGroupMemberRequest(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('group_member_requests')
    .update({ status: 'DENIED' })
    .eq('id', requestId);

  if (error) {
    console.error('Error denying group member request:', error);
  }

  return !error;
}
