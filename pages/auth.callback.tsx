import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackRoute,
})

function sanitizeRedirect(value: string | null): string | null {
  if (!value) return null
  try {
    const decoded = decodeURIComponent(value)
    // Only allow same-origin paths (prevents open-redirect).
    if (!decoded.startsWith('/')) return null
    if (decoded.startsWith('//')) return null
    if (decoded.includes('://')) return null
    return decoded
  } catch {
    return null
  }
}

function getAuthErrorFromUrl(url: URL): string | null {
  // Supabase can return OAuth errors in the hash fragment.
  const hash = url.hash?.replace(/^#/, '') ?? ''
  if (!hash) return null
  const params = new URLSearchParams(hash)
  return params.get('error_description') || params.get('error')
}

function AuthCallbackRoute() {
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false

    async function run() {
      const url = new URL(window.location.href)

      const redirect =
        sanitizeRedirect(url.searchParams.get('redirect')) ??
        // Default landing for successful auth.
        '/events?view=list'

      const oauthErr = getAuthErrorFromUrl(url)
      if (oauthErr) {
        if (!cancelled) setError(oauthErr)
        return
      }

      // Support both PKCE (code) and implicit (hash) flows.
      const code = url.searchParams.get('code')
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          if (!cancelled) setError(exchangeError.message)
          return
        }
      }

      const started = Date.now()
      while (Date.now() - started < 6000) {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          window.location.replace(redirect)
          return
        }
        await new Promise((r) => setTimeout(r, 200))
      }

      if (!cancelled) {
        setError('Timed out establishing session')
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Sign-in failed</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
      </div>
    )
  }

  return <div style={{ padding: 24 }}>Finishing sign-in…</div>
}

