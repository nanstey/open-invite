import { createFileRoute, redirect, useNavigate, useRouterState } from '@tanstack/react-router';
import * as React from 'react';

import { useAuth } from '../domains/auth/AuthProvider';
import { EventDetail } from '../domains/events/components/detail/EventDetail';
import { EventEditor } from '../domains/events/components/detail/EventEditor';
import { EventLoadingScreen } from '../domains/events/components/detail/route/EventLoadingScreen';
import { EventNotFoundScreen } from '../domains/events/components/detail/route/EventNotFoundScreen';
import {
  coerceEventTab,
  type EventTab,
  parseEventTab,
} from '../domains/events/components/detail/route/routing';
import { useEventDetailActions } from '../domains/events/hooks/useEventDetailActions';
import {
  parseEventsView,
  parseEventsViewOptional,
} from '../domains/events/hooks/useEventNavigation';
import { useEventRouteData } from '../domains/events/hooks/useEventRouteData';
import { markEventViewedFromRouteParam } from '../services/eventService';

function parseEventTabSearch(value: unknown): EventTab | undefined {
  return parseEventTab(value);
}

function parseOriginSearch(value: unknown): 'explore' | undefined {
  return value === 'explore' ? 'explore' : undefined;
}

export const Route = createFileRoute('/events/$slug')({
  validateSearch: (search: Record<string, unknown>) => ({
    view: parseEventsViewOptional(search.view),
    tab: parseEventTabSearch(search.tab),
    from: parseOriginSearch(search.from),
  }),
  beforeLoad: ({ context, params }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({
        to: '/e/$slug',
        params: { slug: params.slug },
        search: { tab: undefined },
      });
    }
  },
  component: function EventDetailRouteComponent() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { slug } = Route.useParams();
    const search = Route.useSearch();
    const activeTab = coerceEventTab(search.tab, 'details');
    const { fromEventsView } = useRouterState({
      select: s => ({
        fromEventsView: s.location.state.fromEventsView,
      }),
    });
    const view = parseEventsView(fromEventsView);
    const returnToOrigin = React.useCallback(() => {
      if (search.from === 'explore') {
        navigate({ to: '/explore' });
        return;
      }
      navigate({ to: '/events', search: { view } });
    }, [navigate, search.from, view]);
    const handleTabChange = (next: EventTab) =>
      navigate({
        to: '/events/$slug',
        params: { slug },
        search: { ...search, tab: next },
        replace: true,
        state: { fromEventsView },
      });

    const [isEditing, setIsEditing] = React.useState(false);
    const [autoInviteEventId, setAutoInviteEventId] = React.useState<string | null>(null);

    // Treat opening an event while authenticated as "invited by link" so it shows up in Pending/Going.
    React.useEffect(() => {
      if (!user) return;
      markEventViewedFromRouteParam(slug).catch(e =>
        console.warn('markEventViewedFromRouteParam failed:', e)
      );
    }, [slug, user?.id, user]);

    const { event, setEvent, isLoading } = useEventRouteData({
      slugOrId: slug,
      pauseRealtime: isEditing,
      onCanonicalSlug: canonicalSlug =>
        navigate({
          to: '/events/$slug',
          params: { slug: canonicalSlug },
          search: { view: undefined, tab: activeTab, from: search.from },
          replace: true,
          state: { fromEventsView: view },
        }),
      onDelete: returnToOrigin,
    });

    // IMPORTANT: Call hooks unconditionally to preserve hook ordering across renders.
    // `user` may be null briefly while auth is initializing, or `event` may be null while loading.
    const {
      onUpdateEvent,
      handleJoinEvent,
      handleLeaveEvent,
      handlePostComment,
      handleToggleCommentReaction,
    } = useEventDetailActions({
      userId: user?.id ?? '',
      setEvent,
    });

    const isHost = !!user && !!event && event.hostId === user.id;

    React.useEffect(() => {
      if (!event || !isHost) return;
      if (!event.publishedAt) {
        setIsEditing(true);
      }
    }, [event, isHost]);

    if (!user) return null;

    const onClose = () => returnToOrigin();

    if (isLoading) {
      return <EventLoadingScreen />;
    }

    if (!event) {
      return (
        <EventNotFoundScreen
          message="This event may have been removed or is unavailable."
          primaryLabel="Back to events"
          onPrimary={onClose}
          onBack={onClose}
        />
      );
    }

    if (isEditing && isHost) {
      const wasDraft = !event.publishedAt;
      return (
        <EventEditor
          mode="update"
          currentUser={user}
          initialEvent={event}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onCancel={() => setIsEditing(false)}
          onSuccess={updated => {
            setEvent(updated);
            setIsEditing(false);
            if (wasDraft && updated.publishedAt) {
              setAutoInviteEventId(updated.id);
            }
          }}
        />
      );
    }

    return (
      <EventDetail
        event={event}
        currentUser={user}
        onClose={onClose}
        onUpdateEvent={onUpdateEvent}
        onPostComment={handlePostComment}
        onToggleCommentReaction={handleToggleCommentReaction}
        onJoin={handleJoinEvent}
        onLeave={handleLeaveEvent}
        onEditRequested={isHost ? () => setIsEditing(true) : undefined}
        autoOpenSendInvites={autoInviteEventId === event.id}
        onAutoOpenSendInvitesHandled={() => setAutoInviteEventId(null)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    );
  },
});
