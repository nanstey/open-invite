import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Dumbbell,
  Music2,
  PartyPopper,
  Plane,
  ShoppingBag,
  Sparkles,
  Utensils,
} from 'lucide-react';
import * as React from 'react';

import { CATEGORY_THEMES, EVENT_CATEGORY_ORDER } from '../../../../lib/constants';

const CATEGORY_ICONS = {
  Entertainment: Clapperboard,
  Errand: ShoppingBag,
  Food: Utensils,
  Music: Music2,
  Social: PartyPopper,
  Sport: Dumbbell,
  Travel: Plane,
  Work: Briefcase,
} as const;

type CategoryBadgeStyle = React.CSSProperties & {
  '--category-color': string;
};

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function CategoryBadgePicker(props: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  layout?: 'scroll' | 'wrap';
}) {
  const layout = props.layout ?? 'scroll';
  const isScrollable = layout === 'scroll';
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<{
    category: string | null;
    moved: boolean;
    pointerId: number | null;
    scrollLeft: number;
    startX: number;
  }>({ category: null, moved: false, pointerId: null, scrollLeft: 0, startX: 0 });
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const updateScrollHints = React.useCallback(() => {
    if (!isScrollable) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const element = scrollRef.current;
    if (!element) return;

    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    setCanScrollLeft(element.scrollLeft > 1);
    setCanScrollRight(element.scrollLeft < maxScrollLeft - 1);
  }, [isScrollable]);

  React.useEffect(() => {
    if (!isScrollable) {
      return;
    }

    updateScrollHints();
    const element = scrollRef.current;
    if (!element) return;

    element.addEventListener('scroll', updateScrollHints, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollHints);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener('scroll', updateScrollHints);
      resizeObserver.disconnect();
    };
  }, [isScrollable, updateScrollHints]);

  const scrollByPage = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: direction * 180, behavior: 'smooth' });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrollable) return;
    const element = scrollRef.current;
    if (!element) return;
    const target = event.target instanceof Element ? event.target : null;
    const category = target?.closest<HTMLElement>('[data-category]')?.dataset.category ?? null;

    dragRef.current = {
      category,
      moved: false,
      pointerId: event.pointerId,
      scrollLeft: element.scrollLeft,
      startX: event.clientX,
    };
    element.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrollable) return;
    const element = scrollRef.current;
    const drag = dragRef.current;
    if (!element || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    if (Math.abs(deltaX) > 8) {
      drag.moved = true;
    }
    element.scrollLeft = drag.scrollLeft - deltaX;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrollable) return;
    const element = scrollRef.current;
    const drag = dragRef.current;
    if (element?.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    if (drag.pointerId === event.pointerId && drag.category && !drag.moved) {
      props.onChange(drag.category);
    }
    dragRef.current = {
      category: null,
      moved: false,
      pointerId: null,
      scrollLeft: 0,
      startX: 0,
    };
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!isScrollable) return;
    const element = scrollRef.current;
    if (!element) return;

    const scrollDelta =
      Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (scrollDelta === 0) return;

    element.scrollLeft += scrollDelta;
    event.preventDefault();
  };

  return (
    <div className="space-y-2">
      {props.label ? (
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {props.label}
        </div>
      ) : null}
      <div className="relative">
        {isScrollable && canScrollLeft ? (
          <button
            type="button"
            aria-label="Scroll categories left"
            onClick={() => scrollByPage(-1)}
            className="absolute left-0 top-[calc(50%-0.25rem)] z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-slate-200 shadow-lg hover:border-primary hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}
        {isScrollable && canScrollRight ? (
          <button
            type="button"
            aria-label="Scroll categories right"
            onClick={() => scrollByPage(1)}
            className="absolute right-0 top-[calc(50%-0.25rem)] z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-slate-200 shadow-lg hover:border-primary hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : null}
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-7 bg-surface transition-opacity duration-300 ease-out ${
            isScrollable && canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-7 bg-surface transition-opacity duration-300 ease-out ${
            isScrollable && canScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          ref={scrollRef}
          className={
            isScrollable
              ? 'flex cursor-grab gap-2 overflow-x-auto pb-2 active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
              : 'flex flex-wrap gap-2'
          }
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          role="radiogroup"
          aria-label={props.label ?? 'Category'}
        >
          {EVENT_CATEGORY_ORDER.map(category => {
            const theme = CATEGORY_THEMES[category];
            const selected = props.value === category;
            const Icon = CATEGORY_ICONS[category] ?? Sparkles;
            const style: CategoryBadgeStyle = {
              '--category-color': theme.hex,
              backgroundColor: selected ? hexToRgba(theme.hex, 0.25) : undefined,
              borderColor: selected ? theme.hex : undefined,
            };
            return (
              <button
                key={category}
                type="button"
                data-category={category}
                aria-pressed={selected}
                style={style}
                onClick={event => {
                  if (isScrollable && dragRef.current.moved) {
                    event.preventDefault();
                    event.stopPropagation();
                    dragRef.current.moved = false;
                    return;
                  }
                  props.onChange(category);
                }}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition-all ${
                  isScrollable ? 'shrink-0' : ''
                } ${
                  selected
                    ? 'text-white shadow-lg shadow-black/20'
                    : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-[var(--category-color)] hover:bg-slate-800'
                }`}
              >
                <Icon className={`h-4 w-4 ${selected ? 'text-white' : theme.text}`} />
                {category}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
