import type { Group } from '../../../lib/types';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../lib/ui/9ui/alert-dialog';

type DeleteGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedGroup: Group | null;
  deleteConfirmationInput: string;
  deletingGroup: boolean;
  deleteError: string | null;
  canConfirmDelete: boolean;
  onInputChange: (value: string) => void;
  onConfirmDelete: () => void;
};

export function DeleteGroupDialog({
  open,
  onOpenChange,
  selectedGroup,
  deleteConfirmationInput,
  deletingGroup,
  deleteError,
  canConfirmDelete,
  onInputChange,
  onConfirmDelete,
}: DeleteGroupDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription className="pt-4">
            <p>Type the group name to confirm:</p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <input
          value={deleteConfirmationInput}
          onChange={event => onInputChange(event.target.value)}
          placeholder={selectedGroup?.name ?? ''}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500"
        />
        {deleteError ? <div className="mt-2 text-xs text-red-300">{deleteError}</div> : null}

        <AlertDialogFooter>
          <AlertDialogClose
            disabled={deletingGroup}
            className="px-4 py-2 rounded-xl text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
          >
            Cancel
          </AlertDialogClose>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={!canConfirmDelete || deletingGroup}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/20 text-red-200 border border-red-500/40 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deletingGroup ? 'Deleting...' : 'Delete'}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
