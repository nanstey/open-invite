import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import type * as React from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';

import { cn } from './utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('relative w-full min-w-[286px] p-3 text-slate-100', className)}
      classNames={{
        root: cn(defaultClassNames.root),
        months: 'flex flex-col gap-4',
        month: 'space-y-4',
        month_caption:
          'pointer-events-none relative z-0 flex h-9 items-center justify-center px-10',
        caption_label: 'whitespace-nowrap text-sm font-semibold leading-none text-white',
        nav: 'absolute inset-x-0 top-3 z-10 flex h-9 items-center justify-between px-3',
        button_previous:
          'pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-md bg-transparent text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:pointer-events-none disabled:opacity-50',
        button_next:
          'pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-md bg-transparent text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:pointer-events-none disabled:opacity-50',
        month_grid: 'w-full border-collapse',
        weekdays: 'grid grid-cols-7',
        weekday: 'py-2 text-center text-xs font-medium text-slate-500',
        weeks: 'grid gap-1',
        week: 'grid grid-cols-7 gap-1',
        day: 'relative flex h-9 min-w-0 items-center justify-center rounded-md text-center text-sm text-slate-200 transition-colors hover:bg-slate-800 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-slate-900',
        day_button: 'flex h-9 w-full items-center justify-center rounded-md outline-none',
        selected: 'bg-primary text-white hover:bg-primary [&>button]:font-semibold',
        today: 'border border-primary/60 text-white',
        outside: 'text-slate-600 opacity-70',
        disabled: 'pointer-events-none text-slate-700 opacity-50',
        hidden: 'invisible',
        range_start: 'bg-primary text-white',
        range_middle: 'bg-primary/20 text-white',
        range_end: 'bg-primary text-white',
        chevron: 'h-4 w-4',
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, size, disabled: _disabled, ...chevronProps }) => {
          const Icon =
            orientation === 'left'
              ? ChevronLeft
              : orientation === 'right'
                ? ChevronRight
                : orientation === 'up'
                  ? ChevronUp
                  : ChevronDown;

          return <Icon className={cn('h-4 w-4', className)} size={size ?? 16} {...chevronProps} />;
        },
        ...components,
      }}
      {...props}
    />
  );
}
