import { CalendarIcon, ChevronsUpDownIcon } from 'lucide-react';
import * as React from 'react';

import { Calendar } from '../9ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../9ui/popover';
import { cn } from '../9ui/utils';
import { formatDateLongEnUS } from '../utils/datetime';

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
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);
  const selectedDate = React.useMemo(() => parseDateValue(value), [value]);
  const minDate = React.useMemo(() => (min ? parseDateValue(min) : undefined), [min]);

  return (
    <Popover open={open} onOpenChange={setOpen} className="w-full">
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-required={required}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm text-white outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60',
          className,
          invalid && 'border-red-500 focus:border-red-500'
        )}
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
        <Calendar
          className="border-0"
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate ?? minDate}
          disabled={minDate ? { before: minDate } : undefined}
          onSelect={nextDate => {
            if (!nextDate) return;
            onChange(formatDateValue(nextDate));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
