import type * as React from 'react';
import { Drawer as BaseDrawer } from 'vaul-base';

import { cn } from './utils';

type DrawerOverlayProps = Omit<React.ComponentProps<typeof BaseDrawer.Overlay>, 'className'> & {
  className?: string;
};

type DrawerContentProps = Omit<React.ComponentProps<typeof BaseDrawer.Content>, 'className'> & {
  className?: string;
};

type DrawerTitleProps = Omit<React.ComponentProps<typeof BaseDrawer.Title>, 'className'> & {
  className?: string;
};

type DrawerDescriptionProps = Omit<
  React.ComponentProps<typeof BaseDrawer.Description>,
  'className'
> & {
  className?: string;
};

export function Drawer({ ...props }: React.ComponentProps<typeof BaseDrawer.Root>) {
  return <BaseDrawer.Root data-slot="drawer" {...props} />;
}

export function DrawerTrigger({ ...props }: React.ComponentProps<typeof BaseDrawer.Trigger>) {
  return <BaseDrawer.Trigger data-slot="drawer-trigger" {...props} />;
}

export function DrawerPortal({ ...props }: React.ComponentProps<typeof BaseDrawer.Portal>) {
  return <BaseDrawer.Portal data-slot="drawer-portal" {...props} />;
}

export function DrawerClose({ ...props }: React.ComponentProps<typeof BaseDrawer.Close>) {
  return <BaseDrawer.Close data-slot="drawer-close" {...props} />;
}

export function DrawerOverlay({ className, ...props }: DrawerOverlayProps) {
  return (
    <BaseDrawer.Overlay
      data-slot="drawer-overlay"
      className={cn(
        'fixed inset-0 z-[1000] bg-black/70 transition-all duration-200 [&[data-ending-style]]:opacity-0 [&[data-starting-style]]:opacity-0',
        className
      )}
      {...props}
    />
  );
}

export function DrawerContent({ className, children, ...props }: DrawerContentProps) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <BaseDrawer.Content
        data-slot="drawer-content"
        className={cn(
          'group/drawer-content fixed z-[1001] flex h-auto flex-col border-slate-700 bg-surface text-white shadow-2xl outline-none',
          'data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-2xl data-[vaul-drawer-direction=top]:border-b',
          'data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-4 data-[vaul-drawer-direction=bottom]:max-h-[calc(100vh-1rem)] data-[vaul-drawer-direction=bottom]:rounded-t-3xl data-[vaul-drawer-direction=bottom]:border-t',
          'data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:rounded-l-2xl data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm',
          'data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:rounded-r-2xl data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm',
          className
        )}
        {...props}
      >
        <div className="mx-auto mt-3 hidden h-1.5 w-12 shrink-0 rounded-full bg-slate-600 group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </BaseDrawer.Content>
    </DrawerPortal>
  );
}

export function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn('flex flex-col gap-1.5 px-5 py-4', className)}
      {...props}
    />
  );
}

export function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn('mt-auto flex flex-col gap-2 border-t border-slate-800 p-4', className)}
      {...props}
    />
  );
}

export function DrawerTitle({ className, ...props }: DrawerTitleProps) {
  return (
    <BaseDrawer.Title
      data-slot="drawer-title"
      className={cn('text-lg font-semibold text-white', className)}
      {...props}
    />
  );
}

export function DrawerDescription({ className, ...props }: DrawerDescriptionProps) {
  return (
    <BaseDrawer.Description
      data-slot="drawer-description"
      className={cn('text-sm text-slate-400', className)}
      {...props}
    />
  );
}
