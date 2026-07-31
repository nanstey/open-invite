interface NotificationBadgeProps {
  count: number;
  /** Extra positioning classes from the caller (e.g. absolute placement). */
  className?: string;
}

/**
 * Small unread-count pill. Renders nothing when there is nothing unread.
 * Caps the displayed number at 99+ so the badge stays compact.
 *
 * Purely decorative (`aria-hidden`): the count is conveyed to assistive tech via
 * the enclosing control's accessible name (e.g. "Alerts, 3 unread"). This avoids
 * duplicate live-region announcements from the badge rendering in both the desktop
 * sidebar and the mobile header at once.
 */
export function NotificationBadge({ count, className = '' }: NotificationBadgeProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold leading-none ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

/** Accessible label for an Alerts control, folding in the unread count when present. */
export function alertsAriaLabel(count: number): string {
  return count > 0 ? `Alerts, ${count} unread` : 'Alerts';
}
