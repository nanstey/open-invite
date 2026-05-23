import type * as React from 'react';
import { Switch } from '../../../../../lib/ui/9ui/switch';
import { FormSelect } from '../../../../../lib/ui/components/FormControls';
import { SectionCard } from '../SectionCard';

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
  isEmptyState?: boolean;
}) {
  const contentVisible = !props.collapsible || props.expanded !== false;

  return (
    <SectionCard
      title="Schedule"
      collapsible={props.collapsible}
      expanded={props.expanded}
      onToggleExpanded={props.onToggleExpanded}
      collapsedActionStyle={props.collapsedActionStyle}
      headerActions={contentVisible ? props.headerActions : undefined}
      isEmptyState={props.isEmptyState}
      surface={props.isEditMode ? 'edit' : 'read'}
    >
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
    </SectionCard>
  );
}
