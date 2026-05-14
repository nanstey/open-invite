import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';

import type { User } from '../../../../lib/types';
import type { SocialEvent } from '../../types';
import { EventCard } from '../list/EventCard';

type ExploreRailVariant = 'featured' | 'standard';

type ExploreRailProps = {
  title: string;
  events: SocialEvent[];
  currentUser: User;
  onEventClick: (event: SocialEvent) => void;
  variant?: ExploreRailVariant;
};

function chunkEvents(events: SocialEvent[], size: number) {
  const pages: SocialEvent[][] = [];
  for (let idx = 0; idx < events.length; idx += size) {
    pages.push(events.slice(idx, idx + size));
  }
  return pages;
}

function getItemsPerPage(width: number, variant: ExploreRailVariant) {
  if (variant === 'featured') {
    return width >= 1200 ? 2 : 1;
  }

  if (width >= 1536) return 4;
  if (width >= 1180) return 3;
  if (width >= 768) return 2;
  return 1;
}

function getGridClassName(itemsPerPage: number) {
  if (itemsPerPage >= 4) return 'grid-cols-4';
  if (itemsPerPage === 3) return 'grid-cols-3';
  if (itemsPerPage === 2) return 'grid-cols-2';
  return 'grid-cols-1';
}

export function ExploreRail({
  title,
  events,
  currentUser,
  onEventClick,
  variant = 'standard',
}: ExploreRailProps) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [viewportWidth, setViewportWidth] = React.useState(0);
  const [itemsPerPage, setItemsPerPage] = React.useState(() =>
    typeof window === 'undefined' ? 1 : getItemsPerPage(window.innerWidth, variant)
  );

  React.useEffect(() => {
    const updateMetrics = () => {
      const nextWidth = viewportRef.current?.clientWidth ?? window.innerWidth;
      setViewportWidth(nextWidth);
      setItemsPerPage(getItemsPerPage(window.innerWidth, variant));
    };

    updateMetrics();

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            updateMetrics();
          })
        : null;

    if (viewportRef.current && observer) {
      observer.observe(viewportRef.current);
    }

    window.addEventListener('resize', updateMetrics);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateMetrics);
    };
  }, [variant]);

  const pages = React.useMemo(() => chunkEvents(events, itemsPerPage), [events, itemsPerPage]);
  const pageCount = pages.length;

  React.useEffect(() => {
    setPageIndex(current => Math.min(current, Math.max(pageCount - 1, 0)));
  }, [pageCount]);

  const canGoBack = pageIndex > 0;
  const canGoForward = pageIndex < pageCount - 1;
  const gridClassName = getGridClassName(itemsPerPage);
  const showControls = pageCount > 1;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
        {showControls ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={`${title} previous page`}
              disabled={!canGoBack}
              onClick={() => setPageIndex(current => Math.max(current - 1, 0))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-slate-200 transition-colors hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label={`${title} next page`}
              disabled={!canGoForward}
              onClick={() => setPageIndex(current => Math.min(current + 1, pageCount - 1))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-slate-200 transition-colors hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>

      <div ref={viewportRef} className="overflow-hidden" data-page-count={pageCount}>
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${pageIndex * viewportWidth}px)` }}
          data-page-index={pageIndex}
        >
          {pages.map((page, idx) => (
            <div
              key={`${title}-page-${idx}`}
              className="shrink-0"
              style={{ width: viewportWidth || undefined }}
            >
              <div className={`grid gap-5 ${gridClassName}`}>
                {page.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    currentUser={currentUser}
                    onClick={() => onEventClick(event)}
                    size={variant === 'featured' ? 'featured' : 'default'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
