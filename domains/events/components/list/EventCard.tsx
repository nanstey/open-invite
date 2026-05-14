import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Crown,
  MapPin,
  MessageSquare,
  PhoneOff,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';

import { getTheme } from '../../../../lib/constants';
import type { User } from '../../../../lib/types';
import { Card } from '../../../../lib/ui/9ui/card';
import { fetchUser } from '../../../../services/userService';
import type { SocialEvent } from '../../types';
import {
  formatEventDateLabel,
  formatEventTimeLabel,
  getEventHeaderImagePosition,
  getEventHeaderImageSrc,
} from '../shared/eventPresentation';

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

interface EventCardProps {
  event: SocialEvent;
  onClick: () => void;
  isCompact?: boolean;
  currentUser: User;
  appearance?: 'default' | 'explore' | 'exploreFeatured';
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onClick,
  isCompact,
  currentUser,
  appearance = 'default',
}) => {
  const [host, setHost] = useState<User | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isExploreAppearance = appearance !== 'default';
  const isExploreFeatured = appearance === 'exploreFeatured';

  useEffect(() => {
    let isMounted = true;
    setHost(null);

    const loadHost = async () => {
      const fetchedHost = await fetchUser(event.hostId, currentUser.id);
      if (isMounted && fetchedHost) {
        setHost(fetchedHost);
      }
    };

    loadHost();

    return () => {
      isMounted = false;
    };
  }, [event.hostId, currentUser.id]);

  const date = new Date(event.startTime);
  const timeString = formatEventTimeLabel(date, event.isFlexibleStart);
  const dateString = formatEventDateLabel(date);

  const attendeeCount = event.attendees.length;
  const spotsLeft = event.maxSeats ? event.maxSeats - attendeeCount : null;
  const theme = getTheme(event.activityType);
  const headerImageSrc = getEventHeaderImageSrc(event);
  const headerImagePositionY = getEventHeaderImagePosition(event.headerImagePositionY);
  const themeRgb = hexToRgb(theme.hex);
  const accentBorderColor = `rgba(${themeRgb.r}, ${themeRgb.g}, ${themeRgb.b}, 0.42)`;
  const defaultBorderColor = 'rgba(51, 65, 85, 0.95)';

  const isHost = event.hostId === currentUser.id;
  const isAttending = event.attendees.includes(currentUser.id);
  const containerBase =
    'group relative overflow-hidden rounded-[1.4rem] cursor-pointer border bg-slate-950/95 text-white transition-[box-shadow,border-color] duration-300 hover:shadow-[0_24px_50px_rgba(2,6,23,0.55)]';
  const metaRowClassName = 'flex items-center gap-3';
  const metaIconClassName =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800';
  const defaultTitleClassName = isCompact
    ? 'text-xl font-semibold'
    : 'text-2xl font-bold leading-tight';
  const exploreTitleClassName = isExploreFeatured ? 'text-[1.9rem]' : 'text-[1.45rem]';
  const titleStyle = { color: isHovered ? theme.hex : undefined };

  const renderHostedByRow = () => {
    if (host) {
      return (
        <div className={metaRowClassName}>
          <img
            src={host.avatar}
            alt={host.name}
            className="h-10 w-10 shrink-0 rounded-full border border-slate-600 object-cover"
          />
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Hosted by
            </div>
            <div className="truncate text-sm font-semibold text-slate-100">{host.name}</div>
          </div>
        </div>
      );
    }

    return (
      <div className={metaRowClassName}>
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-full border border-slate-700 bg-slate-800" />
        <div className="min-w-0 space-y-1">
          <div className="h-2.5 w-16 animate-pulse rounded bg-slate-800" />
          <div className="h-3 w-24 animate-pulse rounded bg-slate-800" />
        </div>
      </div>
    );
  };

  const renderMetadataRows = () => (
    <div className="space-y-3 text-sm text-slate-300">
      <div className={metaRowClassName}>
        <div className={metaIconClassName}>
          <Calendar className="h-4 w-4 text-slate-300" />
        </div>
        <div className="min-w-0">
          <span>
            {dateString} •{' '}
            <span className={event.isFlexibleStart ? 'italic text-slate-400' : 'text-slate-200'}>
              {timeString}
            </span>
          </span>
        </div>
      </div>

      <div className={metaRowClassName}>
        <div className={metaIconClassName}>
          <MapPin className="h-4 w-4 text-slate-300" />
        </div>
        <div className="min-w-0 truncate text-slate-300">{event.location}</div>
      </div>

      {renderHostedByRow()}
    </div>
  );

  const renderStatusBadge = () => {
    if (isHost) {
      return (
        <span
          title="Hosting"
          className="inline-flex items-center gap-1 rounded-full border border-amber-400/45 bg-slate-950/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300 backdrop-blur"
        >
          <Crown className="h-3.5 w-3.5" />
          Hosting
        </span>
      );
    }

    if (isAttending) {
      return (
        <span
          title="Going"
          className="inline-flex items-center gap-1 rounded-full border border-emerald-400/45 bg-slate-950/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300 backdrop-blur"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Going
        </span>
      );
    }

    return null;
  };

  const renderDefaultCard = () => (
    <>
      <div className="relative aspect-[13/10] overflow-hidden">
        <img
          data-testid="event-card-cover"
          src={headerImageSrc}
          alt={`${event.title} cover`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          style={{ objectPosition: `center ${headerImagePositionY}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-end gap-2 p-4">
          {renderStatusBadge()}
        </div>

        <div className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-4 md:px-5 md:pb-4 md:pt-5">
          <h3
            className={`max-w-[18ch] text-white drop-shadow-[0_10px_30px_rgba(2,6,23,0.75)] transition-colors duration-300 ${defaultTitleClassName}`}
            style={titleStyle}
          >
            {event.title}
          </h3>
        </div>
      </div>

      <div className={`p-5 pt-0 space-y-4`}>
        {renderMetadataRows()}

        {!isCompact && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-300" />
                <span>{attendeeCount} going</span>
                {spotsLeft !== null ? (
                  <span className="font-semibold text-slate-200">({spotsLeft} left)</span>
                ) : null}
              </div>
              {event.noPhones && (
                <div className="flex items-center gap-1.5 text-slate-300" title="No Phones">
                  <PhoneOff className="h-3.5 w-3.5" />
                  <span>Unplugged</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-slate-300" />
              <span>{event.comments.length}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const renderExploreCard = () => {
    const seatsCopy =
      spotsLeft === null
        ? `${attendeeCount} going`
        : spotsLeft === 0
          ? 'Full'
          : `${spotsLeft} spots left`;

    return (
      <>
        <div
          className={`relative overflow-hidden ${isExploreFeatured ? 'aspect-[3/2]' : 'aspect-[7/5]'}`}
        >
          <img
            data-testid="event-card-cover"
            src={headerImageSrc}
            alt={`${event.title} cover`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            style={{ objectPosition: `center ${headerImagePositionY}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />

          <div className="absolute inset-x-0 top-0 flex items-start justify-end gap-3 p-4">
            {renderStatusBadge()}
          </div>

          <div className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-4 md:px-5 md:pb-4 md:pt-5">
            <h3
              className={`${exploreTitleClassName} max-w-[16ch] font-semibold leading-tight text-white drop-shadow-[0_10px_30px_rgba(2,6,23,0.75)] transition-colors duration-300`}
              style={titleStyle}
            >
              {event.title}
            </h3>
          </div>
        </div>

        <div className={`px-4 pb-4 pt-0 flex flex-col gap-4`}>
          {renderMetadataRows()}

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-800/70 pt-4 text-sm text-slate-300">
            <div className="flex min-w-0 items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="truncate">{seatsCopy}</span>
            </div>

            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-slate-400">
              View
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </>
    );
  };

  return (
    <Card
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      className={containerBase}
      style={{ borderColor: isHovered ? accentBorderColor : defaultBorderColor }}
    >
      {isExploreAppearance ? renderExploreCard() : renderDefaultCard()}
    </Card>
  );
};
