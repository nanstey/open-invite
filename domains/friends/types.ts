export type FriendsTab = 'friends' | 'groups'

export function parseFriendsTab(value: unknown): FriendsTab {
  const tab = typeof value === 'string' ? value.toLowerCase() : 'friends'
  return tab === 'groups' ? 'groups' : 'friends'
}

export function coerceFriendsTab(value: unknown): FriendsTab {
  const v = typeof value === 'string' ? value.toLowerCase() : 'friends'
  return v === 'groups' || v === 'friends' ? v : 'friends'
}

