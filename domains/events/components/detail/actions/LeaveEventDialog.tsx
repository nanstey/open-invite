import * as React from 'react'

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../../../lib/ui/9ui/alert-dialog'

type LeaveEventDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
}

export function LeaveEventDialog(props: LeaveEventDialogProps) {
  const { open, onOpenChange, onConfirm } = props

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave this event?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be removed from the guest list.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose className="px-4 py-2 rounded-xl text-slate-200 hover:bg-slate-800 text-sm font-semibold">
            Cancel
          </AlertDialogClose>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/20 text-red-200 border border-red-500/40 hover:bg-red-500/30"
          >
            Leave event
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
