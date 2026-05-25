import { CalendarIcon, ChevronsUpDownIcon, X } from 'lucide-react';
import * as React from 'react';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Calendar } from '../9ui/calendar';
import { Dialog, DialogContent, DialogTitle } from '../9ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../9ui/popover';
import { cn } from '../9ui/utils';
import { formatDateLongEnUS } from '../utils/datetime';

const desktopMediaQuery = '(min-width: 768px)';

export type DatePickerFieldProps = {
  id?: string;
  value: string;
  onChange: (nextDate: string) => void;
  required?: boolean;
  min?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  invalid?: boolean;
  label?: string;
};

function parseDateValue(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }

  return date;
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DatePickerField({
  id,
  value,
  onChange,
  required,
  min,
  disabled,
  placeholder = 'Select a date',
  className,
  invalid,
  label = 'Date',
}: DatePickerFieldProps) {
  const isDesktop = useMediaQuery(desktopMediaQuery);
  const [open, setOpen] = React.useState(false);
  const selectedDate = React.useMemo(() => parseDateValue(value), [value]);
  const minDate = React.useMemo(() => (min ? parseDateValue(min) : undefined), [min]);
  const [draftDate, setDraftDate] = React.useState<Date | undefined>(selectedDate);

  React.useEffect(() => {
    if (open && !isDesktop) {
      setDraftDate(selectedDate);
      return;
    }

    if (!open) {
      setDraftDate(selectedDate);
    }
  }, [isDesktop, open, selectedDate]);

  const buttonClassName = cn(
    'flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm text-white outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60',
    className,
    invalid && 'border-red-500 focus:border-red-500'
  );

  const trigger = (
    <button
      type="button"
      id={id}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      className={buttonClassName}
      onClick={() => setOpen(true)}
    >
      <span className="flex min-w-0 items-center gap-2">
        <CalendarIcon className="h-4 w-4 shrink-0 text-slate-400" />
        <span className={cn('truncate', !selectedDate && 'text-slate-500')}>
          {selectedDate ? formatDateLongEnUS(selectedDate) : placeholder}
        </span>
      </span>
      <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 text-slate-500" />
    </button>
  );

  const calendar = (
    <Calendar
      className="border-0"
      mode="single"
      selected={isDesktop ? selectedDate : draftDate}
      defaultMonth={(isDesktop ? selectedDate : draftDate) ?? minDate}
      disabled={minDate ? { before: minDate } : undefined}
      onSelect={nextDate => {
        if (!nextDate) return;
        if (isDesktop) {
          onChange(formatDateValue(nextDate));
          setOpen(false);
          return;
        }

        setDraftDate(nextDate);
      }}
    />
  );

  if (!isDesktop) {
    return (
      <>
        {trigger}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            containerClassName="z-[1100]"
            className="mx-3 w-[min(32rem,calc(100vw-1.5rem))] max-w-none overflow-hidden rounded-[1.75rem] border-slate-800 bg-slate-950 p-0"
          >
            <div className="sr-only">
              <DialogTitle>Start date</DialogTitle>
            </div>
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  {label}
                </div>
                <div className="mt-1 text-base font-semibold text-white">
                  {draftDate ? formatDateLongEnUS(draftDate) : placeholder}
                </div>
              </div>
              <button
                type="button"
                aria-label="Close date picker"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                onClick={() => {
                  setDraftDate(selectedDate);
                  setOpen(false);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-3 pt-2">{calendar}</div>
            <div className="flex items-center justify-end gap-2 px-5 py-4">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                onClick={() => {
                  setDraftDate(selectedDate);
                  setOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                onClick={() => {
                  if (!draftDate) return;
                  onChange(formatDateValue(draftDate));
                  setOpen(false);
                }}
              >
                Done
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} className="w-full">
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-required={required}
        aria-invalid={invalid || undefined}
        className={buttonClassName}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarIcon className="h-4 w-4 shrink-0 text-slate-400" />
          <span className={cn('truncate', !selectedDate && 'text-slate-500')}>
            {selectedDate ? formatDateLongEnUS(selectedDate) : placeholder}
          </span>
        </span>
        <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 text-slate-500" />
      </PopoverTrigger>
      <PopoverContent align="start" side="auto" className="w-[286px] p-0">
        {calendar}
      </PopoverContent>
    </Popover>
  );
}
