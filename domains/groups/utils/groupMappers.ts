import type { Group } from '../../../lib/types';
import type { GroupMember, GroupMemberRequest } from '../../../services/groupService';

/**
 * Maps a database group row to the domain Group type.
 * Ensures consistent transformation across the application.
 */
export function mapGroupRowToDomain(row: {
  id: string;
  name: string;
  created_by: string;
  allow_members_create_events: boolean;
  allow_members_add_members: boolean;
  new_members_require_admin_approval: boolean;
  created_at: string;
}): Group {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    allowMembersCreateEvents: row.allow_members_create_events,
    allowMembersAddMembers: row.allow_members_add_members,
    newMembersRequireAdminApproval: row.new_members_require_admin_approval,
  };
}

/**
 * Maps a database member row to the domain GroupMember type.
 */
export function mapMemberRowToDomain(row: {
  id: string;
  name: string;
  avatar: string | null;
  role: 'ADMIN' | 'MEMBER';
}): GroupMember {
  const user = {
    id: row.id,
    name: row.name,
    avatar: row.avatar ?? '',
  };
  return {
    ...user,
    user,
    role: row.role,
  };
}

/**
 * Maps a database member request row to the domain GroupMemberRequest type.
 */
export function mapMemberRequestRowToDomain(row: {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_avatar: string | null;
  group_id: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  created_at: string;
}): GroupMemberRequest {
  const requester = {
    id: row.requester_id,
    name: row.requester_name,
    avatar: row.requester_avatar ?? '',
  };
  return {
    id: row.id,
    requester,
    requesterId: row.requester_id,
    groupId: row.group_id,
    status: row.status,
    createdAt: row.created_at,
  };
}
