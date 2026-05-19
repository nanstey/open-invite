import { ChevronDown, Plus } from 'lucide-react';
import type * as React from 'react';
import { Card } from '../../../../../lib/ui/9ui/card';
import { Switch } from '../../../../../lib/ui/9ui/switch';
import { FormSelect } from '../../../../../lib/ui/components/FormControls';

export function ScheduleCard(props: {
  children: React.ReactNode;
  isEditMode?: boolean;
  hasScheduleItems?: boolean;
  itineraryAttendanceEnabled?: boolean;
  onChangeItineraryAttendanceEnabled?: (next: boolean) => void;
  showItineraryStartTimeOnly?: boolean;
  onChangeItineraryStartTimeOnly?: (next: boolean) => void;
  headerActions?: React.ReactNode;
  collapsible?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  collapsedActionStyle?: 'plus' | 'chevron';
}) {
  const cardClassName = props.isEditMode
    ? 'bg-surface border border-slate-700 rounded-2xl p-5'
    : 'bg-background border border-transparent rounded-2xl p-5';
  const contentVisible = !props.collapsible || props.expanded !== false;
  const HeaderIcon =
    props.collapsedActionStyle === 'plus' && props.expanded === false ? Plus : ChevronDown;

  return (
    <Card className={cardClassName}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h1 className="text-2xl font-bold text-white">Schedule</h1>
        <div className="shrink-0 flex flex-wrap items-center gap-2">
          {contentVisible && props.headerActions ? (
            <div className="shrink-0 flex flex-wrap items-center gap-2">
              {props.headerActions ? (
                <div className="flex items-center gap-2">{props.headerActions}</div>
              ) : null}
            </div>
          ) : null}
          {props.collapsible ? (
            <button
              type="button"
              onClick={props.onToggleExpanded}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              aria-expanded={props.expanded}
              aria-label={props.expanded ? 'Collapse Schedule' : 'Expand Schedule'}
            >
              <HeaderIcon
                className={`h-4 w-4 ${props.collapsedActionStyle === 'plus' && props.expanded === false ? '' : 'transition-transform'} ${props.expanded ? 'rotate-180' : ''}`}
              />
            </button>
          ) : null}
        </div>
      </div>
      {contentVisible ? (
        <>
          {props.isEditMode && props.hasScheduleItems ? (
            <div className="mb-4 space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  Time display
                </span>
                <FormSelect
                  size="sm"
                  variant="muted"
                  aria-label="Schedule time display"
                  value={props.showItineraryStartTimeOnly ? 'start' : 'range'}
                  onChange={event =>
                    props.onChangeItineraryStartTimeOnly?.(event.target.value === 'start')
                  }
                >
                  <option value="start">Start only</option>
                  <option value="range">Start &amp; end</option>
                </FormSelect>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    Schedule attendance
                  </div>
                  <div className="text-sm text-slate-300">
                    Attendees select schedule items when they join, and expense totals are
                    calculated accordingly.
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-200">
                  <Switch
                    aria-label="Enable partial attendance"
                    checked={props.itineraryAttendanceEnabled ?? false}
                    onCheckedChange={checked => props.onChangeItineraryAttendanceEnabled?.(checked)}
                  />
                  <span>Enable partial attendance</span>
                </div>
              </div>
            </div>
          ) : null}
          {props.children}
        </>
      ) : null}
    </Card>
  );
}
