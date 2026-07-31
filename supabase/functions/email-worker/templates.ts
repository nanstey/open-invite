// Template rendering — pure and producer-owned. The delivery core only knows
// "render(template, payload, ctx) -> {subject, html, text}". Producers register
// their templates here; unknown ids fall back to a generic renderer so a new
// producer can send before it has bespoke templates.

export interface RenderContext {
  /** Absolute base URL of the app, e.g. https://openinvite.app (no trailing slash). */
  appUrl: string;
  /** Signed one-click unsubscribe URL (omitted for `account`-class mail). */
  unsubscribeUrl?: string;
  /** Physical sender identity for the compliance footer. */
  senderIdentity?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export type EmailPayload = Record<string, unknown>;

function str(payload: EmailPayload, key: string, fallback = ''): string {
  const v = payload[key];
  return typeof v === 'string' ? v : fallback;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function eventUrl(ctx: RenderContext, payload: EmailPayload): string | undefined {
  const eventId = str(payload, 'related_event_id');
  return eventId ? `${ctx.appUrl}/events/${eventId}` : undefined;
}

function footer(ctx: RenderContext): { html: string; text: string } {
  const parts: string[] = [];
  const textParts: string[] = [];
  if (ctx.unsubscribeUrl) {
    parts.push(
      `<a href="${escapeHtml(ctx.unsubscribeUrl)}">Unsubscribe</a> · ` +
        `<a href="${escapeHtml(ctx.appUrl)}/profile/email">Manage email preferences</a>`
    );
    textParts.push(`Unsubscribe: ${ctx.unsubscribeUrl}`);
    textParts.push(`Manage email preferences: ${ctx.appUrl}/profile/email`);
  }
  if (ctx.senderIdentity) {
    parts.push(escapeHtml(ctx.senderIdentity));
    textParts.push(ctx.senderIdentity);
  }
  return {
    html: parts.length
      ? `<hr /><p style="color:#64748b;font-size:12px">${parts.join('<br />')}</p>`
      : '',
    text: textParts.length ? `\n\n—\n${textParts.join('\n')}` : '',
  };
}

/** Generic layout used by every notification template and the fallback. */
function layout(
  ctx: RenderContext,
  opts: { preheader: string; heading: string; body: string; ctaLabel?: string; ctaUrl?: string }
): RenderedEmail {
  const foot = footer(ctx);
  const cta =
    opts.ctaUrl && opts.ctaLabel
      ? `<p><a href="${escapeHtml(opts.ctaUrl)}" style="display:inline-block;padding:10px 16px;` +
        `background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none">${escapeHtml(
          opts.ctaLabel
        )}</a></p>`
      : '';
  const html =
    `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">` +
    `<span style="display:none">${escapeHtml(opts.preheader)}</span>` +
    `<h2>${escapeHtml(opts.heading)}</h2>` +
    `<p>${escapeHtml(opts.body)}</p>${cta}${foot.html}</div>`;
  const textCta = opts.ctaUrl ? `\n\n${opts.ctaLabel ?? 'Open'}: ${opts.ctaUrl}` : '';
  const text = `${opts.heading}\n\n${opts.body}${textCta}${foot.text}`;
  return { subject: opts.heading, html, text };
}

type Renderer = (ctx: RenderContext, payload: EmailPayload) => RenderedEmail;

const REGISTRY: Record<string, Renderer> = {
  invite_v1: (ctx, p) =>
    layout(ctx, {
      preheader: str(p, 'message', 'You have a new invite'),
      heading: str(p, 'title', 'New invite'),
      body: str(p, 'message', 'You have been invited to an event.'),
      ctaLabel: 'View invite',
      ctaUrl: eventUrl(ctx, p),
    }),
  comment_v1: (ctx, p) =>
    layout(ctx, {
      preheader: str(p, 'message', 'New comment'),
      heading: str(p, 'title', 'New comment'),
      body: str(p, 'message', 'Someone commented on your event.'),
      ctaLabel: 'View comment',
      ctaUrl: eventUrl(ctx, p),
    }),
  reminder_v1: (ctx, p) =>
    layout(ctx, {
      preheader: str(p, 'message', 'Event reminder'),
      heading: str(p, 'title', 'Event reminder'),
      body: str(p, 'message', 'An event you are attending is coming up.'),
      ctaLabel: 'View event',
      ctaUrl: eventUrl(ctx, p),
    }),
  system_v1: (ctx, p) =>
    layout(ctx, {
      preheader: str(p, 'message', 'A message from Open Invite'),
      heading: str(p, 'title', 'Open Invite'),
      body: str(p, 'message', ''),
      ctaUrl: eventUrl(ctx, p),
      ctaLabel: eventUrl(ctx, p) ? 'Open' : undefined,
    }),
};

/** Render a template by id; unknown ids use a safe generic fallback. */
export function renderTemplate(
  template: string,
  payload: EmailPayload,
  ctx: RenderContext
): RenderedEmail {
  const renderer = REGISTRY[template];
  if (renderer) {
    return renderer(ctx, payload);
  }
  return layout(ctx, {
    preheader: str(payload, 'message', str(payload, 'title', 'A message from Open Invite')),
    heading: str(payload, 'title', 'Open Invite'),
    body: str(payload, 'message', ''),
    ctaUrl: eventUrl(ctx, payload),
    ctaLabel: eventUrl(ctx, payload) ? 'Open' : undefined,
  });
}

export function hasTemplate(template: string): boolean {
  return template in REGISTRY;
}
