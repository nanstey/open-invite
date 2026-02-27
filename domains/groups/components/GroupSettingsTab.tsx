import { Lock } from 'lucide-react'
import * as React from 'react'
import type { Group } from '../../../lib/types'
import { Switch } from '../../../lib/ui/9ui/switch'
import { UserAvatar } from '../../../lib/ui/components/UserAvatar'
import type { GroupMemberRequest } from '../../../services/groupService'

type GroupSettingsDraft = {
  name: string
  allowMembersCreateEvents: boolean
  allowMembersAddMembers: boolean
  newMembersRequireAdminApproval: boolean
}

type GroupSettingsTabProps = {
  selectedGroup: Group
  groupSettingsDraft: GroupSettingsDraft | null
  isAdmin: boolean
  savingSettings: boolean
  settingsDirty: boolean
  settingsMessage: string | null
  pendingRequests: GroupMemberRequest[]
  loadingRequests: boolean
  processingRequestId: string | null
  onSettingsDraftChange: React.Dispatch<React.SetStateAction<GroupSettingsDraft | null>>
  onSaveSettings: () => void
  onApproveRequest: (request: GroupMemberRequest) => void
  onDenyRequest: (requestId: string) => void
  onDeleteDialogOpen: () => void
}

export function GroupSettingsTab({
  selectedGroup,
  groupSettingsDraft,
  isAdmin,
  savingSettings,
  settingsDirty,
  settingsMessage,
  pendingRequests,
  loadingRequests,
  processingRequestId,
  onSettingsDraftChange,
  onSaveSettings,
  onApproveRequest,
  onDenyRequest,
  onDeleteDialogOpen,
}: GroupSettingsTabProps) {
  const groupNameInputId = React.useId()
  const membersCanAddMembers =
    groupSettingsDraft?.allowMembersAddMembers ?? selectedGroup.allowMembersAddMembers ?? false
  const newMembersRequireAdminApprovalEnabled =
    membersCanAddMembers &&
    (groupSettingsDraft?.newMembersRequireAdminApproval ??
      selectedGroup.newMembersRequireAdminApproval ??
      false)

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 text-center text-slate-300 flex flex-col items-center gap-3">
        <Lock className="w-5 h-5 text-slate-400" />
        Settings are available to group admins only.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor={groupNameInputId}
          className="block text-xs uppercase tracking-wider text-slate-400 mb-2"
        >
          Group name
        </label>
        <input
          id={groupNameInputId}
          value={groupSettingsDraft?.name ?? selectedGroup.name}
          onChange={event =>
            onSettingsDraftChange(prev =>
              prev
                ? {
                    ...prev,
                    name: event.target.value,
                  }
                : prev
            )
          }
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
        />
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 space-y-3">
        <div className="text-sm font-semibold text-white">Permissions</div>
        <div className="flex items-center gap-3 text-sm text-slate-200">
          <Switch
            aria-label="Members can create events"
            checked={
              groupSettingsDraft?.allowMembersCreateEvents ?? selectedGroup.allowMembersCreateEvents
            }
            onCheckedChange={(checked: boolean) =>
              onSettingsDraftChange(prev =>
                prev
                  ? {
                      ...prev,
                      allowMembersCreateEvents: checked,
                    }
                  : prev
              )
            }
          />
          <span>Members can create events</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-200">
          <Switch
            aria-label="Members can add members"
            checked={
              groupSettingsDraft?.allowMembersAddMembers ?? selectedGroup.allowMembersAddMembers
            }
            onCheckedChange={(checked: boolean) =>
              onSettingsDraftChange(prev =>
                prev
                  ? {
                      ...prev,
                      allowMembersAddMembers: checked,
                      newMembersRequireAdminApproval: checked
                        ? prev.newMembersRequireAdminApproval
                        : false,
                    }
                  : prev
              )
            }
          />
          <span>Members can add members</span>
        </div>
        <div
          className={`ml-7 flex items-center gap-3 text-sm ${
            membersCanAddMembers ? 'text-slate-200' : 'text-slate-400'
          }`}
        >
          <Switch
            aria-label="New members require admin approval"
            checked={newMembersRequireAdminApprovalEnabled}
            disabled={!membersCanAddMembers}
            onCheckedChange={(checked: boolean) =>
              onSettingsDraftChange(prev =>
                prev
                  ? {
                      ...prev,
                      newMembersRequireAdminApproval: checked,
                    }
                  : prev
              )
            }
          />
          <span>New members require admin approval</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSaveSettings}
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
              {pendingRequests.map(request => (
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
                    <div className="text-sm font-semibold text-white truncate">
                      {request.requester.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      Requested {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onApproveRequest(request)}
                    disabled={processingRequestId === request.id}
                    className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-xs text-white font-semibold"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onDenyRequest(request.id)}
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

      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 space-y-3">
        <div className="text-sm font-semibold text-red-200">Danger zone</div>
        <div className="text-xs text-red-100/80">
          Deleting this group is a destructive action and cannot be undone.
        </div>
        <button
          type="button"
          onClick={onDeleteDialogOpen}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/20 text-red-200 border border-red-500/40 hover:bg-red-500/30"
        >
          Delete group
        </button>
      </div>
    </div>
  )
}
