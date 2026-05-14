import { useNavigate } from '@tanstack/react-router';
import * as React from 'react';

import { SearchInput } from '../../../../lib/ui/components/SearchInput';
import { useAuth } from '../../../auth/AuthProvider';
import { buildExploreSections } from '../../explore/buildExploreSections';
import { useEventsFeed } from '../../hooks/useEventsFeed';
import { EventsLoadingScreen } from '../list/EventsLoadingScreen';
import { ExploreRail } from './ExploreRail';

export function ExplorePage() {
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = React.useState('');

  const { events, loading: eventsLoading } = useEventsFeed({
    currentUserId: currentUser?.id ?? null,
    enabled: !authLoading,
  });

  const sections = React.useMemo(
    () => buildExploreSections(events, searchTerm),
    [events, searchTerm]
  );

  const handleEventClick = React.useCallback(
    (eventSlug: string) => {
      navigate({
        to: '/events/$slug',
        params: { slug: eventSlug },
        search: { view: undefined, tab: undefined, from: 'explore' },
      });
    },
    [navigate]
  );

  if (authLoading || eventsLoading) return <EventsLoadingScreen />;
  if (!currentUser) return null;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-8 pb-20">
        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Find your next invite
            </h1>
            <p className="max-w-2xl text-sm text-slate-400 md:text-base">
              Browse what&apos;s happening soon, what&apos;s coming up this week, and the rest of
              the feed by category.
            </p>
          </div>

          <SearchInput
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Search events by title, location, or category..."
            size="lg"
            wrapperClassName="max-w-3xl"
            className="bg-slate-950/90"
          />
        </div>

        {sections.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-700 bg-slate-900/40 px-6 py-16 text-center">
            <h2 className="text-2xl font-semibold text-white">
              No upcoming events match that search.
            </h2>
            <p className="mt-2 text-slate-400">
              Try another keyword or clear the search to see the full explore feed.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {sections.map(section => (
              <ExploreRail
                key={section.id}
                title={section.title}
                events={section.events}
                currentUser={currentUser}
                onEventClick={event => handleEventClick(event.slug)}
                variant={section.id === 'happening-soon' ? 'featured' : 'standard'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
