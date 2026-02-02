export type FriendsTab = 'friends'

export function parseFriendsTab(value: unknown): FriendsTab {
  const tab = typeof value === 'string' ? value.toLowerCase() : 'friends'
  return tab === 'friends' ? 'friends' : 'friends'
}

export function coerceFriendsTab(value: unknown): FriendsTab {
  const v = typeof value === 'string' ? value.toLowerCase() : 'friends'
  return v === 'friends' ? 'friends' : 'friends'
}
