import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { Route } from './events.new'

let mockSearch = { view: 'list' as const }
const mockNavigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: any) => ({
    component: options.component,
    useSearch: () => mockSearch,
  }),
  useNavigate: () => mockNavigate,
  redirect: (options: any) => options,
}))

vi.mock('../domains/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, loading: false }),
}))

vi.mock('../domains/events/components/detail/EventEditor', () => ({
  EventEditor: ({ onSuccess }: { onSuccess: (event: { slug: string }) => void }) => {
    React.useEffect(() => {
      onSuccess({ slug: 'event-1' })
    }, [onSuccess])
    return <div data-testid="event-editor" />
  },
}))

const renderRoute = async () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const Component = (Route as any).component
  await act(async () => {
    root.render(<Component />)
  })
  return { container, root }
}

describe('Create event page', () => {
  it('navigates to event detail on successful creation', async () => {
    const { root } = await renderRoute()

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/events/$slug',
      params: { slug: 'event-1' },
      search: { view: undefined, tab: undefined },
      replace: true,
      state: { fromEventsView: 'list' },
    })

    await act(async () => root.unmount())
  })
})
