import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'

const supabase = vi.hoisted(() => ({
  auth: {
    exchangeCodeForSession: vi.fn(),
    getSession: vi.fn(),
  },
}))

vi.mock('../lib/supabase', () => ({ supabase }))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: any) => ({
    component: options.component,
  }),
}))

import { Route } from './auth.callback'

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

describe('Auth callback route', () => {
  it('redirects based on auth token and redirect param', async () => {
    supabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null })
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })

    const originalLocation = window.location
    const replaceSpy = vi.fn()
    vi.stubGlobal('location', {
      ...originalLocation,
      href: 'http://localhost/auth/callback?code=123&redirect=%2Fevents',
      search: '?code=123&redirect=%2Fevents',
      hash: '',
      replace: replaceSpy,
    } as Location)
    window.history.pushState({}, '', '/auth/callback?code=123&redirect=%2Fevents')
    const { root } = await renderRoute()

    await act(async () => {
      await Promise.resolve()
    })

    expect(replaceSpy).toHaveBeenCalledWith('/events')
    vi.stubGlobal('location', originalLocation)
    replaceSpy.mockRestore()
    await act(async () => root.unmount())
  })
})
