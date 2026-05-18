import { Clock, X } from 'lucide-react';
import * as React from 'react';
import { useMediaQuery } from '../../../../lib/hooks/useMediaQuery';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../../lib/ui/9ui/alert-dialog';
import { Button } from '../../../../lib/ui/9ui/button';
import { Dialog, DialogContent, DialogTitle } from '../../../../lib/ui/9ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '../../../../lib/ui/9ui/drawer';
import { Input } from '../../../../lib/ui/9ui/input';
import { Switch } from '../../../../lib/ui/9ui/switch';
import { DatePickerField } from '../../../../lib/ui/components/DatePickerField';
import { TimePickerField } from '../../../../lib/ui/components/TimePickerField';
import { createDraftEvent } from '../../../../services/eventService';
import type { SocialEvent } from '../../types';
import { CategoryBadgePicker } from './CategoryBadgePicker';

const desktopMediaQuery = '(min-width: 768px)';
const dateTimeGridClass = 'grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 md:grid-cols-2';

function combineLocalDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function combineAllDayEndDateTime(date: string): string {
  return new Date(`${date}T23:59:00`).toISOString();
}

function parseLocalDate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

export function QuickCreateEventWizard(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (event: SocialEvent) => void;
}) {
  const isDesktop = useMediaQuery(desktopMediaQuery);
  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [title, setTitle] = React.useState('');
  const [category, setCategory] = React.useState('Social');
  const [startDate, setStartDate] = React.useState(today);
  const [endDate, setEndDate] = React.useState(today);
  const [startTime, setStartTime] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [isAllDay, setIsAllDay] = React.useState(false);
  const [endDateTouched, setEndDateTouched] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);
  const resetForm = React.useCallback(() => {
    setTitle('');
    setCategory('Social');
    setStartDate(today);
    setEndDate(today);
    setStartTime('');
    setEndTime('');
    setIsAllDay(false);
    setEndDateTouched(false);
    setError(null);
    setIsSaving(false);
    setConfirmCloseOpen(false);
  }, [today]);

  React.useEffect(() => {
    if (!props.open) {
      resetForm();
    }
  }, [props.open, resetForm]);

  const isDirty =
    title.trim().length > 0 ||
    category !== 'Social' ||
    startDate !== today ||
    endDate !== today ||
    startTime !== '' ||
    endTime !== '' ||
    isAllDay;

  const validationError = React.useMemo(() => {
    if (!title.trim() || !category || !startDate || !endDate) {
      return 'Add a title, category, start date, and end date.';
    }

    if (isAllDay) {
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return 'Choose valid start and end dates.';
      }
      if (end < start) {
        return 'End date must be on or after start date.';
      }
      return null;
    }

    if (!startTime || !endTime) {
      return 'Add a start time and end time.';
    }

    const start = new Date(`${startDate}T${startTime}:00`);
    const end = new Date(`${endDate}T${endTime}:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 'Choose valid start and end times.';
    }
    if (end <= start) {
      return 'End time must be after start time.';
    }
    return null;
  }, [category, endDate, endTime, isAllDay, startDate, startTime, title]);

  const canContinue = !validationError && !isSaving;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      const draft = await createDraftEvent({
        title: title.trim(),
        activityType: category,
        isAllDay,
        startTime: isAllDay
          ? combineLocalDateTime(startDate, '00:00')
          : combineLocalDateTime(startDate, startTime),
        endTime: isAllDay
          ? combineAllDayEndDateTime(endDate)
          : combineLocalDateTime(endDate, endTime),
      });
      if (!draft) throw new Error('Draft event could not be created.');
      props.onCreated(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Draft event could not be created.');
      setIsSaving(false);
    }
  };

  const requestClose = React.useCallback(() => {
    if (isSaving) return;
    if (isDirty) {
      setConfirmCloseOpen(true);
      return;
    }
    props.onOpenChange(false);
  }, [isDirty, isSaving, props]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        props.onOpenChange(true);
        return;
      }
      requestClose();
    },
    [props, requestClose]
  );

  const handleStartDateChange = (nextDate: string) => {
    setStartDate(nextDate);
    if (!endDateTouched) {
      setEndDate(nextDate);
    }
  };

  const handleEndDateChange = (nextDate: string) => {
    setEndDateTouched(true);
    setEndDate(nextDate);
  };

  const confirmDiscard = () => {
    setConfirmCloseOpen(false);
    props.onOpenChange(false);
  };

  const topActions = (
    <div className="relative flex items-center justify-between gap-4 px-6 pb-5 pt-6 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-slate-700/70">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Close create invite"
        className="rounded-full text-slate-300 hover:bg-slate-800 hover:text-white"
        onClick={requestClose}
      >
        <X className="h-5 w-5" />
      </Button>
      <Button
        type="submit"
        disabled={!canContinue}
        className="rounded-full px-5 py-2 text-sm shadow-lg shadow-primary/20"
      >
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );

  const fields = (
    <>
      <div className="sr-only">
        {isDesktop ? (
          <DialogTitle>Create an invite</DialogTitle>
        ) : (
          <DrawerTitle>Create an invite</DrawerTitle>
        )}
      </div>

      {topActions}

      <div className="space-y-5 px-6 pb-6 pt-5">
        <div>
          <Input
            id="quick-event-title"
            aria-label="Title"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Add title"
            className="border-0 bg-transparent px-0 py-2 text-4xl font-black leading-tight text-white placeholder:text-slate-500 focus:border-transparent"
            autoFocus
          />
        </div>

        <CategoryBadgePicker
          value={category}
          onChange={setCategory}
          layout={isDesktop ? 'wrap' : 'scroll'}
        />

        <div className="">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <Switch aria-label="All Day" checked={isAllDay} onCheckedChange={setIsAllDay} />
              </div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                All Day
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className={dateTimeGridClass}>
              <div className="h-12">
                <label htmlFor="quick-event-start-date" className="sr-only">
                  Start date
                </label>
                <DatePickerField
                  id="quick-event-start-date"
                  min={today}
                  value={startDate}
                  onChange={handleStartDateChange}
                  className="h-12 rounded-xl bg-slate-900"
                />
              </div>
              <div
                className={`relative h-12 ${isAllDay ? 'invisible' : ''}`}
                aria-hidden={isAllDay}
              >
                {!isAllDay ? (
                  <>
                    <label htmlFor="quick-event-start-time" className="sr-only">
                      Start time
                    </label>
                    <Clock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <TimePickerField
                      id="quick-event-start-time"
                      ariaLabel="Start time"
                      value={startTime}
                      onChange={setStartTime}
                      className="h-12 rounded-xl bg-slate-900 pl-10 pr-3"
                    />
                  </>
                ) : null}
              </div>
            </div>

            <div className={dateTimeGridClass}>
              <div className="h-12">
                <label htmlFor="quick-event-end-date" className="sr-only">
                  End date
                </label>
                <DatePickerField
                  id="quick-event-end-date"
                  min={startDate || today}
                  value={endDate}
                  onChange={handleEndDateChange}
                  className="h-12 rounded-xl bg-slate-900"
                />
              </div>
              <div
                className={`relative h-12 ${isAllDay ? 'invisible' : ''}`}
                aria-hidden={isAllDay}
              >
                {!isAllDay ? (
                  <>
                    <label htmlFor="quick-event-end-time" className="sr-only">
                      End time
                    </label>
                    <Clock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <TimePickerField
                      id="quick-event-end-time"
                      ariaLabel="End time"
                      value={endTime}
                      onChange={setEndTime}
                      className="h-12 rounded-xl bg-slate-900 pl-10 pr-3"
                    />
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
        ) : null}
      </div>
    </>
  );

  const discardDialog = (
    <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard this invite?</AlertDialogTitle>
          <AlertDialogDescription>
            Closing now will lose the details you have entered.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">
            Keep editing
          </AlertDialogClose>
          <button
            type="button"
            onClick={confirmDiscard}
            className="rounded-xl border border-red-500/40 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/30"
          >
            Discard invite
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (!isDesktop) {
    return (
      <>
        <Drawer
          open={props.open}
          direction="bottom"
          shouldScaleBackground
          dismissible={false}
          onOpenChange={handleOpenChange}
        >
          <DrawerContent className="max-h-[92vh] overflow-hidden border-slate-800 bg-slate-950">
            <form className="flex min-h-0 flex-col" onSubmit={handleSubmit}>
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-0">{fields}</div>
            </form>
          </DrawerContent>
        </Drawer>
        {discardDialog}
      </>
    );
  }

  return (
    <>
      <Dialog open={props.open} onOpenChange={handleOpenChange}>
        <DialogContent className="m-0 !max-w-none w-[min(36rem,calc(100vw-3rem))] overflow-visible rounded-[2rem] border-slate-800 bg-surface p-0 shadow-2xl">
          <form onSubmit={handleSubmit}>
            <div className="p-0">{fields}</div>
          </form>
        </DialogContent>
      </Dialog>
      {discardDialog}
    </>
  );
}
