export type ActiveSection = 'EVENTS' | 'FRIENDS' | 'ALERTS' | 'PROFILE' | 'FEEDBACK' | 'PUBLIC'

export function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/friends')) return 'Friends'
  if (pathname.startsWith('/alerts')) return 'Alerts'
  if (pathname.startsWith('/profile')) return 'Profile'
  if (pathname.startsWith('/feedback')) return 'User Feedback'
  return 'Events'
}

export function getActiveSection(pathname: string): ActiveSection {
  if (pathname.startsWith('/friends')) return 'FRIENDS'
  if (pathname.startsWith('/alerts')) return 'ALERTS'
  if (pathname.startsWith('/profile')) return 'PROFILE'
  if (pathname.startsWith('/feedback')) return 'FEEDBACK'
  if (pathname.startsWith('/events')) return 'EVENTS'
  return 'PUBLIC'
}

