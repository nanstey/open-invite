import * as React from 'react'
import { cn } from '../9ui/utils'

export interface UserAvatarProps {
  /** Image source URL */
  src: string
  /** Alt text for the image */
  alt: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Custom class name */
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
}

/**
 * User avatar with consistent styling.
 *
 * @example
 * <UserAvatar src={user.avatar} alt={user.name} size="md" />
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  alt,
  size = 'md',
  className,
}) => (
  <img
    src={src}
    alt={alt}
    className={cn(
      'rounded-full border-2 border-slate-600',
      sizeClasses[size],
      className
    )}
  />
)

