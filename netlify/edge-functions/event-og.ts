function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll('"', '&quot;')
}

function looksLikeBot(userAgent: string): boolean {
  return /Twitterbot|facebookexternalhit|Slackbot|LinkedInBot|Discordbot|WhatsApp|TelegramBot|Applebot/i.test(userAgent)
}

export default async (request: Request, context: any) => {
  const url = new URL(request.url)
  const parts = url.pathname.split('/').filter(Boolean) // ["e"|"events", "<slug>"]
  const prefix = parts.length >= 1 ? parts[0] : ''
  const slugOrId = parts.length >= 2 ? parts[1] : ''
  const isEventRoute = prefix === 'e' || prefix === 'events'
  const canonicalPrefix = prefix === 'events' ? 'events' : 'e'

  const userAgent = request.headers.get('user-agent') ?? ''
  if (!looksLikeBot(userAgent)) {
    return await context.next()
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('VITE_SUPABASE_ANON_KEY') ?? ''

  // Fallback tags (if fetch fails)
  let title = 'Open Invite'
  let description = 'A social calendar for friends'
  let image = `${url.origin}/hero.png`
  let canonical = `${url.origin}${url.pathname}`

  if (isEventRoute && supabaseUrl && supabaseAnonKey && slugOrId) {
    const byId = isUuid(slugOrId)
    const filter = byId ? `id=eq.${encodeURIComponent(slugOrId)}` : `slug=eq.${encodeURIComponent(slugOrId)}`
    const apiUrl =
      `${supabaseUrl}/rest/v1/events` +
      `?select=id,slug,title,description,location,start_time` +
      `&${filter}` +
      `&limit=1`

    const resp = await fetch(apiUrl, {
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${supabaseAnonKey}`,
      },
    })

    if (resp.ok) {
      const rows = await resp.json()
      const event = rows?.[0]
      if (event?.title) {
        const resolvedSlug = event.slug || slugOrId
        title = `${event.title} • Open Invite`
        description = (event.description || '').slice(0, 180) || `Join me at ${event.location || 'this event'}.`
        // Cheap unique image without storing anything:
        image = `https://picsum.photos/seed/${event.id}/1200/630`
        canonical = `${url.origin}/${canonicalPrefix}/${resolvedSlug}`
      }
    }
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>

<link rel="canonical" href="${escapeAttr(canonical)}" />
<meta name="description" content="${escapeAttr(description)}" />

<meta property="og:site_name" content="Open Invite" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${escapeAttr(title)}" />
<meta property="og:description" content="${escapeAttr(description)}" />
<meta property="og:image" content="${escapeAttr(image)}" />
<meta property="og:url" content="${escapeAttr(canonical)}" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeAttr(title)}" />
<meta name="twitter:description" content="${escapeAttr(description)}" />
<meta name="twitter:image" content="${escapeAttr(image)}" />
</head>
<body>Open Invite</body>
</html>`

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Prevent Netlify from caching the bot HTML forever while event details change.
      'cache-control': 'public, max-age=60',
    },
  })
}


