import * as React from 'react';
import { cn } from './utils';

type PopoverContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  rootRef: React.RefObject<HTMLDivElement | null>;
};

const PopoverContext = React.createContext<PopoverContextValue | undefined>(undefined);

function usePopoverContext() {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) {
    throw new Error('Popover components must be used within <Popover>');
  }
  return ctx;
}

export type PopoverProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children: React.ReactNode;
};

export function Popover({
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const isControlled = typeof open === 'boolean';
  const currentOpen = isControlled ? open : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  React.useEffect(() => {
    if (!currentOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentOpen, setOpen]);

  return (
    <PopoverContext.Provider value={{ open: currentOpen, setOpen, rootRef }}>
      <div ref={rootRef} className={cn('relative inline-flex', className)}>
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = usePopoverContext();
  return (
    <button
      type="button"
      className={className}
      aria-expanded={open}
      onClick={event => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          setOpen(!open);
        }
      }}
      {...props}
    />
  );
}

export function PopoverContent({
  className,
  align = 'center',
  side,
  sideOffset = 8,
  staticPosition = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'auto';
  sideOffset?: number;
  staticPosition?: boolean;
}) {
  const { open, rootRef } = usePopoverContext();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [resolvedSide, setResolvedSide] = React.useState<'top' | 'bottom'>(
    side === 'top' ? 'top' : 'bottom'
  );

  React.useLayoutEffect(() => {
    if (!open || side !== 'auto') return;

    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content) return;

    const rootRect = root.getBoundingClientRect();
    const contentHeight = content.offsetHeight;
    const spaceBelow = window.innerHeight - rootRect.bottom;
    const spaceAbove = rootRect.top;

    setResolvedSide(
      spaceBelow < contentHeight + sideOffset && spaceAbove > spaceBelow ? 'top' : 'bottom'
    );
  }, [open, rootRef, side, sideOffset]);

  if (!open) {
    return null;
  }

  if (staticPosition) {
    return (
      <div
        ref={contentRef}
        className={cn(
          'z-50 w-64 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-white shadow-xl',
          className
        )}
        {...props}
      />
    );
  }

  const alignment = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  const sideClass =
    side === undefined ? 'mt-2' : resolvedSide === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute z-50 w-64 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-white shadow-xl',
        alignment[align],
        sideClass,
        className
      )}
      {...props}
    />
  );
}
