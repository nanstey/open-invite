import { Calendar, CheckCircle2, ChevronRight, Crown, MapPin, Users } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

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

const HOVER_REVEAL_MEDIA_QUERY = '(min-width: 768px) and (hover: hover) and (pointer: fine)';
const WIDE_METADATA_LAYOUT_MIN_WIDTH_REM = 28;

const canUseMatchMedia = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

const getWideMetadataLayoutMinWidthPx = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return WIDE_METADATA_LAYOUT_MIN_WIDTH_REM * 16;
  }

  const rootFontSize = Number.parseFloat(
    window.getComputedStyle(document.documentElement).fontSize
  );

  return WIDE_METADATA_LAYOUT_MIN_WIDTH_REM * (Number.isFinite(rootFontSize) ? rootFontSize : 16);
};

interface EventCardProps {
  event: SocialEvent;
  onClick: () => void;
  currentUser: User;
  size?: 'default' | 'featured';
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onClick,
  currentUser,
  size = 'default',
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [host, setHost] = useState<User | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);
  const [supportsHoverReveal, setSupportsHoverReveal] = useState(() =>
    canUseMatchMedia() ? window.matchMedia(HOVER_REVEAL_MEDIA_QUERY).matches : false
  );
  const isFeatured = size === 'featured';

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

  useEffect(() => {
    if (!canUseMatchMedia()) {
      return;
    }

    const mediaQuery = window.matchMedia(HOVER_REVEAL_MEDIA_QUERY);
    const updateSupportsHoverReveal = () => setSupportsHoverReveal(mediaQuery.matches);

    updateSupportsHoverReveal();
    mediaQuery.addEventListener('change', updateSupportsHoverReveal);

    return () => {
      mediaQuery.removeEventListener('change', updateSupportsHoverReveal);
    };
  }, []);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !cardRef.current) {
      return;
    }

    const element = cardRef.current;
    const updateCardWidth = (nextWidth: number) => {
      setCardWidth(currentWidth => (currentWidth === nextWidth ? currentWidth : nextWidth));
    };

    updateCardWidth(element.getBoundingClientRect().width || element.clientWidth || 0);

    const observer = new ResizeObserver(entries => {
      const observedWidth =
        entries[0]?.contentRect.width ||
        element.getBoundingClientRect().width ||
        element.clientWidth ||
        0;
      updateCardWidth(observedWidth);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const date = new Date(event.startTime);
  const timeString = event.isAllDay ? 'All day' : formatEventTimeLabel(date, event.isFlexibleStart);
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
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800/90';
  const titleClassName = isFeatured
    ? 'text-[1.9rem] font-bold leading-tight'
    : 'text-2xl font-bold leading-tight';
  const titleWidthClassName = isFeatured ? 'max-w-[16ch]' : 'max-w-[18ch]';
  const heroAspectClassName = isFeatured ? 'aspect-[3/2]' : 'aspect-[5/4]';
  const panelCollapsedHeight = isFeatured ? '5.1rem' : '4.9rem';
  const hasWideMetadataLayout = cardWidth >= getWideMetadataLayoutMinWidthPx();
  const isRevealExpanded = !supportsHoverReveal || isHovered;
  const titleStyle = { color: isHovered ? theme.hex : undefined };
  const panelStyle = supportsHoverReveal
    ? {
        transform: isRevealExpanded
          ? 'translateY(0)'
          : `translateY(calc(100% - ${panelCollapsedHeight}))`,
      }
    : undefined;
  const panelToneClassName = isHovered ? 'bg-black/70' : 'bg-slate-950/88';

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

  const renderWideHostedByColumn = () => {
    if (host) {
      return (
        <div className="row-span-2 flex min-w-0 items-center justify-end gap-4 text-right">
          <img
            src={host.avatar}
            alt={host.name}
            className="h-14 w-14 shrink-0 rounded-full border border-slate-600 object-cover"
          />
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
              Hosted by
            </div>
            <div className="mt-2 truncate text-base font-semibold leading-tight text-slate-100">
              {host.name}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="row-span-2 flex items-center justify-end gap-4">
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-full border border-slate-700 bg-slate-800" />
        <div className="text-right">
          <div className="ml-auto h-3 w-20 animate-pulse rounded bg-slate-800" />
          <div className="mt-2 ml-auto h-4 w-28 animate-pulse rounded bg-slate-800" />
        </div>
      </div>
    );
  };

  const renderMetadataRows = () => (
    <div
      data-testid="event-card-metadata"
      data-layout="narrow"
      className={`space-y-3 text-sm text-slate-300 transition-all duration-500 ease-out ${
        isRevealExpanded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
      aria-hidden={!isRevealExpanded}
    >
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

  const renderWideMetadataRows = () => (
    <div
      data-testid="event-card-metadata"
      data-layout="wide"
      className={`grid grid-cols-[minmax(0,1fr)_minmax(12rem,13.5rem)] gap-x-5 gap-y-3 text-sm text-slate-300 transition-all duration-500 ease-out ${
        isRevealExpanded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
      aria-hidden={!isRevealExpanded}
    >
      <div className={metaRowClassName}>
        <div className={metaIconClassName}>
          <Calendar className="h-4 w-4 text-slate-300" />
        </div>
        <div className="min-w-0 text-base">
          <span>
            {dateString} •{' '}
            <span className={event.isFlexibleStart ? 'italic text-slate-400' : 'text-slate-200'}>
              {timeString}
            </span>
          </span>
        </div>
      </div>

      {renderWideHostedByColumn()}

      <div className={metaRowClassName}>
        <div className={metaIconClassName}>
          <MapPin className="h-4 w-4 text-slate-300" />
        </div>
        <div className="min-w-0 truncate text-base text-slate-300">{event.location}</div>
      </div>
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

  const renderHeroCard = () => {
    return (
      <div className={`relative overflow-hidden ${heroAspectClassName}`}>
        <img
          data-testid="event-card-cover"
          src={headerImageSrc}
          alt={`${event.title} cover`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          style={{ objectPosition: `center ${headerImagePositionY}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-end gap-3 p-4">
          {renderStatusBadge()}
        </div>

        <div
          data-testid="event-card-reveal-panel"
          data-expanded={isRevealExpanded}
          className={`absolute inset-x-0 bottom-0 flex flex-col gap-4 px-4 pb-4 pt-4 backdrop-blur-sm transition-[transform,background-color] duration-500 ease-out md:px-5 md:pb-5 md:pt-5 ${panelToneClassName}`}
          style={panelStyle}
        >
          <h3
            className={`${titleWidthClassName} text-white drop-shadow-[0_10px_30px_rgba(2,6,23,0.75)] transition-colors duration-300 ${titleClassName}`}
            style={titleStyle}
          >
            {event.title}
          </h3>

          {hasWideMetadataLayout ? renderWideMetadataRows() : renderMetadataRows()}
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    const seatsCopy =
      spotsLeft === null
        ? `${attendeeCount} going`
        : spotsLeft === 0
          ? 'Full'
          : `${spotsLeft} spots left`;

    return (
      <div className="flex items-center justify-between gap-3 border-t border-slate-800/80 px-4 pb-4 pt-4 text-sm text-slate-300 md:px-5 md:pb-5">
        <div className="flex min-w-0 items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" />
          <span className="truncate">{seatsCopy}</span>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-slate-400 transition-colors duration-300 group-hover:text-slate-100">
          View
          <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      className={`${containerBase} focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/80`}
      style={{ borderColor: isHovered ? accentBorderColor : defaultBorderColor }}
    >
      {renderHeroCard()}
      {renderFooter()}
    </Card>
  );
};
