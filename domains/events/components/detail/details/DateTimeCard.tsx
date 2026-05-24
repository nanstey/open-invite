import { Clock } from 'lucide-react';
import { Switch } from '../../../../../lib/ui/9ui/switch';
import { DatePickerField } from '../../../../../lib/ui/components/DatePickerField';
import { TimePickerField } from '../../../../../lib/ui/components/TimePickerField';
import { SectionCard } from '../SectionCard';
import type { EventDateTimeModel } from '../utils/eventDateTimeModel';

const dateTimeGridClass = 'grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 md:grid-cols-2';

export function DateTimeCard(props: {
  isEditMode: boolean;
  dateTime: EventDateTimeModel;
  isFlexibleStart: boolean;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  onChangeStartDate?: (next: string) => void;
  onChangeEndDate?: (next: string) => void;
  onChangeStartTime?: (next: string) => void;
  onChangeEndTime?: (next: string) => void;
  onChangeIsAllDay?: (next: boolean) => void;
  errorStartTime?: string;
  errorEndTime?: string;
  collapsible?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}) {
  const {
    isEditMode,
    dateTime,
    isFlexibleStart,
    startDate,
    endDate,
    startTime,
    endTime,
    isAllDay = false,
    onChangeStartDate,
    onChangeEndDate,
    onChangeStartTime,
    onChangeEndTime,
    onChangeIsAllDay,
    errorStartTime,
    errorEndTime,
    collapsible,
    expanded,
    onToggleExpanded,
  } = props;
  const errorText = errorStartTime || errorEndTime;

  return (
    <SectionCard
      title="Date & Time"
      surface={isEditMode ? 'edit' : 'read'}
      collapsible={collapsible}
      expanded={expanded}
      onToggleExpanded={onToggleExpanded}
    >
      {isEditMode ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <Switch
                  aria-label="All Day"
                  checked={isAllDay}
                  onCheckedChange={checked => onChangeIsAllDay?.(checked)}
                />
              </div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                All Day
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className={dateTimeGridClass}>
              <div className="h-12">
                <label htmlFor="event-start-date" className="sr-only">
                  Start date
                </label>
                <DatePickerField
                  id="event-start-date"
                  value={startDate ?? ''}
                  onChange={next => onChangeStartDate?.(next)}
                  invalid={!!errorStartTime}
                  className="h-12 rounded-xl bg-slate-900"
                />
              </div>
              <div
                className={`relative h-12 ${isAllDay ? 'invisible' : ''}`}
                aria-hidden={isAllDay}
              >
                {!isAllDay ? (
                  <>
                    <label htmlFor="event-start-time" className="sr-only">
                      Start time
                    </label>
                    <Clock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <TimePickerField
                      id="event-start-time"
                      ariaLabel="Start time"
                      value={startTime ?? ''}
                      onChange={next => onChangeStartTime?.(next)}
                      className="h-12 rounded-xl bg-slate-900 pl-10 pr-3"
                      invalid={!!errorStartTime}
                    />
                  </>
                ) : null}
              </div>
            </div>

            <div className={dateTimeGridClass}>
              <div className="h-12">
                <label htmlFor="event-end-date" className="sr-only">
                  End date
                </label>
                <DatePickerField
                  id="event-end-date"
                  value={endDate ?? ''}
                  onChange={next => onChangeEndDate?.(next)}
                  min={startDate}
                  invalid={!!errorEndTime}
                  className="h-12 rounded-xl bg-slate-900"
                />
              </div>
              <div
                className={`relative h-12 ${isAllDay ? 'invisible' : ''}`}
                aria-hidden={isAllDay}
              >
                {!isAllDay ? (
                  <>
                    <label htmlFor="event-end-time" className="sr-only">
                      End time
                    </label>
                    <Clock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <TimePickerField
                      id="event-end-time"
                      ariaLabel="End time"
                      value={endTime ?? ''}
                      onChange={next => onChangeEndTime?.(next)}
                      className="h-12 rounded-xl bg-slate-900 pl-10 pr-3"
                      invalid={!!errorEndTime}
                    />
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {errorText ? (
            <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{errorText}</div>
          ) : null}
        </div>
      ) : (
        <div className="text-slate-300">
          {dateTime.isAllDay && dateTime.showMultiDay ? (
            <>
              <div className="font-bold text-white">{dateTime.startDateText}</div>
              {dateTime.endDateText ? (
                <div className="font-bold text-white">{dateTime.endDateText}</div>
              ) : null}
              <div className="text-sm text-slate-400">
                All day
                {isFlexibleStart && <span className="italic"> (Flexible)</span>}
              </div>
            </>
          ) : dateTime.showMultiDay ? (
            <>
              <div className="leading-tight text-white">
                <span className="font-bold">{dateTime.startDateText}</span>{' '}
                <span className="font-normal text-slate-400">{dateTime.startTimeText} -</span>
              </div>
              {dateTime.endDateText && dateTime.endTimeText && (
                <div className="leading-tight text-white">
                  <span className="font-bold">{dateTime.endDateText}</span>{' '}
                  <span className="font-normal text-slate-400">{dateTime.endTimeText}</span>
                </div>
              )}
              {isFlexibleStart ? (
                <div className="text-sm text-slate-400 leading-tight italic">(Flexible)</div>
              ) : null}
            </>
          ) : (
            <>
              <div className="font-bold text-white">{dateTime.startDateText}</div>
              <div className="text-sm text-slate-400">
                {dateTime.timeRangeText}
                {isFlexibleStart && <span className="italic"> (Flexible)</span>}
              </div>
            </>
          )}
        </div>
      )}
    </SectionCard>
  );
}
