import { SectionCard } from '../SectionCard';

export function CapacityCard(props: {
  maxSeats?: number;
  onChangeMaxSeats?: (next: number | undefined) => void;
  collapsible?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  collapsedActionStyle?: 'plus' | 'chevron';
  isEmptyState?: boolean;
}) {
  const contentVisible = !props.collapsible || props.expanded !== false;

  return (
    <SectionCard
      title="Capacity"
      collapsible={props.collapsible}
      expanded={props.expanded}
      onToggleExpanded={props.onToggleExpanded}
      collapsedActionStyle={props.collapsedActionStyle}
      isEmptyState={props.isEmptyState}
      surface="edit"
    >
      {contentVisible ? (
        <div className="space-y-1">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Seats</div>
          <input
            type="number"
            min={0}
            step={1}
            value={props.maxSeats ?? ''}
            onChange={e => {
              const raw = e.target.value;
              const n = raw === '' ? undefined : Number(raw);
              props.onChangeMaxSeats?.(n && n > 0 ? n : undefined);
            }}
            placeholder="Unlimited"
            className="w-full bg-slate-900 border rounded-lg py-3 px-4 text-white outline-none border-slate-700 focus:border-primary"
          />
          <div className="text-xs text-slate-500 mt-1">Leave blank for unlimited.</div>
        </div>
      ) : null}
    </SectionCard>
  );
}
