import { ChevronDown, Plus } from 'lucide-react';

export function CapacityCard(props: {
  maxSeats?: number;
  onChangeMaxSeats?: (next: number | undefined) => void;
  collapsible?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  collapsedActionStyle?: 'plus' | 'chevron';
}) {
  const contentVisible = !props.collapsible || props.expanded !== false;
  const HeaderIcon =
    props.collapsedActionStyle === 'plus' && props.expanded === false ? Plus : ChevronDown;

  return (
    <div className="bg-surface border border-slate-700 rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Capacity</h1>
        {props.collapsible ? (
          <button
            type="button"
            onClick={props.onToggleExpanded}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            aria-expanded={props.expanded}
            aria-label={props.expanded ? 'Collapse Capacity' : 'Expand Capacity'}
          >
            <HeaderIcon
              className={`h-4 w-4 ${props.collapsedActionStyle === 'plus' && props.expanded === false ? '' : 'transition-transform'} ${props.expanded ? 'rotate-180' : ''}`}
            />
          </button>
        ) : null}
      </div>

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
    </div>
  );
}
