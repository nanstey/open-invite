import type { Group } from '../../../lib/types'
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../lib/ui/9ui/alert-dialog'
import type { GroupMember } from '../../../services/groupService'

type RemoveMemberDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  removeTargetMember: GroupMember | null
  selectedGroup: Group | null
  removingMemberId: string | null
  onConfirmRemove: () => void
}

export function RemoveMemberDialog({
  open,
  onOpenChange,
  removeTargetMember,
  selectedGroup,
  removingMemberId,
  onConfirmRemove,
}: RemoveMemberDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove member?</AlertDialogTitle>
          <AlertDialogDescription className="pt-4">
            {removeTargetMember && selectedGroup
              ? `Remove ${removeTargetMember.name} from ${selectedGroup.name}?`
              : 'Remove this member from the group?'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogClose
            disabled={!!removingMemberId}
            className="px-4 py-2 rounded-xl text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
          >
            Cancel
          </AlertDialogClose>
          <button
            type="button"
            onClick={onConfirmRemove}
            disabled={!removeTargetMember || !!removingMemberId}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/20 text-red-200 border border-red-500/40 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {removingMemberId ? 'Removing...' : 'Remove'}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
