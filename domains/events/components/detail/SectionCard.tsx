import { ChevronDown, Plus } from 'lucide-react';
import type * as React from 'react';
import { Card } from '../../../../lib/ui/9ui/card';
import { cn } from '../../../../lib/ui/9ui/utils';

export function SectionCard(props: {
  title: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  collapsedActionStyle?: 'plus' | 'chevron';
  headerActions?: React.ReactNode;
  isEmptyState?: boolean;
  surface?: 'edit' | 'read';
  titleLevel?: 'primary' | 'secondary';
  titleIcon?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const {
    title,
    children,
    collapsible = false,
    expanded = true,
    onToggleExpanded,
    collapsedActionStyle = 'chevron',
    headerActions,
    isEmptyState = false,
    surface = 'edit',
    titleLevel = 'primary',
    titleIcon,
    className,
    contentClassName,
  } = props;

  const contentVisible = !collapsible || expanded;
  const HeaderIcon = collapsedActionStyle === 'plus' && !expanded ? Plus : ChevronDown;
  const titleClassName =
    titleLevel === 'secondary' ? 'text-lg font-bold text-white' : 'text-2xl font-bold text-white';
  const cardClassName =
    surface === 'edit'
      ? isEmptyState
        ? 'rounded-2xl border border-dashed border-slate-600 bg-surface/60 p-5'
        : 'rounded-2xl border border-slate-700 bg-surface p-5'
      : 'rounded-2xl border border-transparent bg-background p-5';

  const titleContent = (
    <span className={cn('min-w-0', titleClassName, titleIcon ? 'flex items-center gap-2' : '')}>
      {titleIcon ? <span className="shrink-0 text-slate-400">{titleIcon}</span> : null}
      <span className="min-w-0 truncate">{title}</span>
    </span>
  );

  return (
    <Card className={cn(cardClassName, className)}>
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3',
          contentVisible ? (titleLevel === 'secondary' ? 'mb-4' : 'mb-3') : ''
        )}
      >
        {collapsible ? (
          <button
            type="button"
            onClick={onToggleExpanded}
            className={cn(
              'flex min-w-0 items-center justify-between gap-3 text-left',
              headerActions ? 'flex-1' : 'w-full'
            )}
            aria-expanded={expanded}
          >
            {titleContent}
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
              <HeaderIcon
                className={cn(
                  'h-4 w-4',
                  collapsedActionStyle === 'plus' && !expanded ? '' : 'transition-transform',
                  expanded ? 'rotate-180' : ''
                )}
              />
            </span>
          </button>
        ) : (
          titleContent
        )}
        {headerActions ? (
          <div className="shrink-0 flex flex-wrap items-center gap-2">{headerActions}</div>
        ) : null}
      </div>
      {contentVisible ? <div className={contentClassName}>{children}</div> : null}
    </Card>
  );
}
