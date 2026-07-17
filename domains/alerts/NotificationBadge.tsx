interface NotificationBadgeProps {
  count: number;
  /** Extra positioning classes from the caller (e.g. absolute placement). */
  className?: string;
}

/**
 * Small unread-count pill. Renders nothing when there is nothing unread.
 * Caps the displayed number at 99+ so the badge stays compact.
 */
export function NotificationBadge({ count, className = '' }: NotificationBadgeProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <output
      aria-label={`${count} unread notifications`}
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold leading-none ${className}`}
    >
      {count > 99 ? '99+' : count}
    </output>
  );
}
