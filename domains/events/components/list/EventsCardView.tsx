import type { User } from '../../../../lib/types';
import type { SocialEvent } from '../../types';
import { EventCard } from './EventCard';
import type { StatusFilter } from './EventsFilterBar';

type EventsGroup = { title: string; events: SocialEvent[] };

type EventsCardViewProps = {
  groupedEvents: EventsGroup[];
  currentUser: User;
  statusFilter: StatusFilter;
  onEventClick: (event: SocialEvent) => void;
  onRestore: (eventId: string) => void;
};

export function EventsCardView({
  groupedEvents,
  currentUser,
  statusFilter,
  onEventClick,
  onRestore,
}: EventsCardViewProps) {
  return (
    <div className="space-y-8 pb-20">
      {groupedEvents.map(group => (
        <div key={group.title}>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 mt-6 first:mt-0 py-1">
            {group.title}
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 min-[1200px]:[grid-template-columns:repeat(3,minmax(0,24rem))] min-[1800px]:[grid-template-columns:repeat(4,minmax(0,24rem))]">
            {group.events.map(event => (
              <div key={event.id} className="relative group">
                <EventCard
                  event={event}
                  onClick={() => onEventClick(event)}
                  currentUser={currentUser}
                />
                {statusFilter === 'DISMISSED' ? (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onRestore(event.id);
                    }}
                    className="absolute top-2 right-2 bg-slate-800 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/50 hover:bg-green-500/20 z-10"
                    type="button"
                  >
                    Restore
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-3">
        <div className="w-16 h-1 bg-slate-800 rounded-full"></div>
        <span className="text-xs font-bold uppercase tracking-widest">No more events</span>
      </div>
    </div>
  );
}
