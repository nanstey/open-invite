# PRD — Email Delivery System for Notifications

- **Doc ID:** OI-PRD-20260717-email-delivery
- **Status:** Draft (for review)
- **Author:** ansteyng@gmail.com
- **Created:** 2026-07-17
- **Change type prefix:** `feat`
- **Reserved branch:** `claude/email-delivery-notifications-um8uju`

---

## 1. Summary

Open Invite currently produces **in-app notifications** (the `notifications` table,
surfaced in `AlertsView`) for invites, comments, reactions, reminders, and system
events. These are only visible when a user opens the app. There is **no outbound
email delivery**, so time-sensitive activity (a new invite, an event reminder, a
comment on your event) is easily missed.

This PRD proposes an **email delivery system** that mirrors the existing
notification stream to email, driven off the same `notifications` table via an
**outbox + worker** pattern running on Supabase Edge Functions, with a third-party
email provider (Resend), per-user preferences, idempotent delivery, retries, and
bounce/compliance handling. Rollout is gated behind the existing feature-flag
system.

## 2. Goals & Non-Goals

### Goals
- Deliver email for a defined subset of notification types (invites, reminders,
  comments, and digest of reactions) reliably and at-most-once per notification.
- Respect per-user email preferences (per-category opt-in/out + global unsubscribe).
- Be **transactional-safe**: enqueue in the same flow that creates a notification,
  never block product writes on the email provider.
- Provide durable delivery: retries with backoff, dead-lettering, and observability
  into delivery status.
- Comply with anti-spam/legal requirements: one-click unsubscribe, List-Unsubscribe
  headers, suppression on hard bounces/complaints.
- Ship behind a feature flag for staged rollout (`email_notifications`).

### Non-Goals
- Marketing/broadcast campaigns and newsletters (out of scope).
- Push (mobile/web-push) and SMS delivery — designed for later reuse, not built here.
- Rich user-authored HTML email or per-user template customization.
- Replacing in-app notifications; email is additive.

## 3. Background / Current State

| Area | Current implementation |
| --- | --- |
| Data | `public.notifications` (`type`, `title`, `message`, `related_event_id`, `actor_id`, `is_read`, `timestamp`) with RLS scoping rows to the owning user. |
| Types | `notification_type` enum: `INVITE`, `COMMENT`, `REACTION`, `REMINDER`, `SYSTEM`. |
| Write path | `services/notificationService.ts#createNotification` (client-side insert). |
| Read path | `AlertsView` + `fetchNotifications` (realtime-backed). |
| Backend runtime | Supabase (Postgres + Auth + Realtime + RLS). No Edge Functions exist yet (`supabase/functions/` absent). |
| Hosting | Netlify (static SPA + edge functions for OG images). Build runs in GitHub Actions. |
| Config | Feature flags table (`20260523000000_add_feature_flags.sql`); `VITE_APP_ENV` = local/staging/prod. |
| User email | Lives in `auth.users.email` (Supabase Auth). `user_profiles` has no email column. |

**Key constraint:** notifications are currently created **client-side**. For reliable
email we must not depend on the client staying online, so enqueue must happen
server-side (DB trigger) rather than in the browser.

## 4. User Stories

1. As an invited guest, when someone invites me to an event, I receive an email with
   the event title, time, location, and a link to respond — even if the app is closed.
2. As an event host, when a guest comments on my event, I receive an email (or a
   batched digest) so I can reply.
3. As an attendee, I receive a reminder email a configurable interval before an event.
4. As any user, I can control which categories email me from a Settings page, and I
   can unsubscribe from all non-essential email with one click from any message.
5. As an operator, I can see delivery status, retry failures, and confirm we suppress
   sending to bounced/complained addresses.

## 5. Requirements

### 5.1 Functional
- **FR-1 Enqueue on notification create.** A row inserted into `notifications` whose
  type is email-eligible enqueues an `email_outbox` row in the same transaction (DB
  trigger). No client involvement.
- **FR-2 Preferences.** New `email_preferences` per user with per-category booleans
  and a `global_unsubscribed` flag. Worker skips categories the user disabled and
  never sends transactional categories to globally-unsubscribed users except
  account/security email (none in current scope, so global unsubscribe blocks all
  notification email).
- **FR-3 Provider send.** A scheduled/triggered Edge Function worker claims pending
  outbox rows, renders a template, and calls the email provider (Resend) API.
- **FR-4 Idempotency.** Each outbox row has a stable idempotency key; a provider send
  is attempted at-most-once per row (status transitions guard re-sends).
- **FR-5 Retries + DLQ.** Transient failures retry with exponential backoff up to N
  attempts, then move to `dead` status for inspection.
- **FR-6 Digest (reactions/comments).** High-frequency, low-urgency categories
  (reactions, optionally comments) batch into a periodic digest instead of one email
  per event.
- **FR-7 Reminders.** A scheduled job scans upcoming events and enqueues reminder
  emails to attendees at the configured lead time, deduped so each attendee is
  reminded once per event.
- **FR-8 Unsubscribe.** Every email includes a signed one-click unsubscribe link and
  `List-Unsubscribe` / `List-Unsubscribe-Post` headers; the endpoint updates
  `email_preferences` without requiring login.
- **FR-9 Bounce/complaint webhooks.** Provider webhooks update delivery status and add
  hard-bounced/complained addresses to a suppression list.
- **FR-10 Feature flag.** All sending is gated by the `email_notifications` flag;
  off = enqueue-only (or no-op) so we can dark-launch.

### 5.2 Non-Functional
- **Reliability:** at-most-once delivery per notification; no duplicate sends under
  worker retries or concurrent runners (row-level claim via `FOR UPDATE SKIP LOCKED`).
- **Latency:** transactional email (invite/reminder) delivered p95 < 2 min of enqueue.
- **Throughput:** design for ≥ 5k emails/day initially; horizontally batchable.
- **Security/Privacy:** email addresses read server-side only (service role);
  outbox/preferences protected by RLS; unsubscribe tokens are HMAC-signed and
  expiring-optional.
- **Deliverability:** SPF, DKIM, DMARC on the sending domain; dedicated subdomain
  (e.g. `mail.openinvite.app`).
- **Observability:** structured logs + a queryable delivery status; alert on DLQ growth
  and provider error-rate.
- **Cost:** provider free/low tier sufficient at launch; no per-send fan-out beyond
  actual recipients.

## 6. Proposed Design

### 6.1 Architecture (outbox + worker)

```
 notification INSERT
        │  (AFTER INSERT trigger, same txn)
        ▼
  email_outbox (status=pending)   ◄── reminder scanner (scheduled) enqueues too
        │
        │  claim batch (FOR UPDATE SKIP LOCKED)
        ▼
  Edge Function: email-worker  ──render──►  provider (Resend) API
        │                                        │
        │  update status (sent/failed/dead)      │ delivery/bounce/complaint
        ▼                                        ▼
  email_delivery_log            ◄──  Edge Function: email-webhook (provider callbacks)
                                          │
                                          ▼
                                   email_suppressions
```

Why outbox rather than sending inline in a trigger:
- Postgres triggers must stay fast and side-effect-free; calling an external HTTP API
  from a trigger couples product writes to provider latency/availability.
- The outbox gives durability, retries, idempotency, and an audit trail for free.

### 6.2 Data model (new migration, append-only)

```sql
-- Categories map from notification_type; kept separate so preferences are stable
-- even if notification_type evolves.
CREATE TYPE email_category AS ENUM ('INVITE', 'COMMENT', 'REACTION', 'REMINDER', 'SYSTEM');
CREATE TYPE email_status   AS ENUM ('pending', 'sending', 'sent', 'failed', 'dead', 'skipped');

CREATE TABLE public.email_preferences (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_enabled      BOOLEAN NOT NULL DEFAULT true,
  comment_enabled     BOOLEAN NOT NULL DEFAULT true,
  reaction_enabled    BOOLEAN NOT NULL DEFAULT false, -- digest-only by default
  reminder_enabled    BOOLEAN NOT NULL DEFAULT true,
  system_enabled      BOOLEAN NOT NULL DEFAULT true,
  digest_frequency    TEXT NOT NULL DEFAULT 'daily',  -- 'off' | 'daily' | 'weekly'
  global_unsubscribed BOOLEAN NOT NULL DEFAULT false,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.email_outbox (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id   UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
  category          email_category NOT NULL,
  idempotency_key   TEXT NOT NULL UNIQUE,   -- e.g. 'notif:<id>' or 'reminder:<event>:<user>'
  template          TEXT NOT NULL,          -- template id, e.g. 'invite_v1'
  payload           JSONB NOT NULL,         -- rendering context (title, event, actor, links)
  status            email_status NOT NULL DEFAULT 'pending',
  attempts          INT NOT NULL DEFAULT 0,
  next_attempt_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error        TEXT,
  provider_message_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_email_outbox_claim ON public.email_outbox (status, next_attempt_at);

CREATE TABLE public.email_delivery_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id         UUID REFERENCES public.email_outbox(id) ON DELETE CASCADE,
  event             TEXT NOT NULL,          -- 'sent'|'delivered'|'bounced'|'complained'|'opened'
  provider_payload  JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.email_suppressions (
  email       TEXT PRIMARY KEY,
  reason      TEXT NOT NULL,                -- 'hard_bounce'|'complaint'|'manual'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

RLS:
- `email_preferences`: owner may `SELECT`/`UPDATE` their own row; inserts via trigger
  or upsert with `auth.uid()` check.
- `email_outbox`, `email_delivery_log`, `email_suppressions`: **no client access**;
  service-role only (worker/webhook use the service key). Follows the existing
  "System can create notifications" precedent.

### 6.3 Enqueue trigger

```sql
CREATE OR REPLACE FUNCTION public.enqueue_notification_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only email-eligible categories; REACTION handled by digest job, not here.
  IF NEW.type IN ('INVITE', 'COMMENT', 'REMINDER', 'SYSTEM') THEN
    INSERT INTO public.email_outbox (user_id, notification_id, category, idempotency_key, template, payload)
    VALUES (
      NEW.user_id, NEW.id, NEW.type::text::email_category,
      'notif:' || NEW.id,
      lower(NEW.type::text) || '_v1',
      jsonb_build_object('title', NEW.title, 'message', NEW.message,
                         'related_event_id', NEW.related_event_id, 'actor_id', NEW.actor_id)
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_enqueue_notification_email
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.enqueue_notification_email();
```

Preference/suppression filtering happens in the **worker** (needs `auth.users.email`
and preference lookups) so the trigger stays trivial. Enqueue is cheap; the worker
resolves to `skipped` when a preference/suppression blocks the send.

### 6.4 Worker (Supabase Edge Function, Deno)

`supabase/functions/email-worker/index.ts`:
1. Claim up to `BATCH_SIZE` rows: `status='pending' AND next_attempt_at <= now()`
   using `FOR UPDATE SKIP LOCKED`, set `status='sending'`.
2. For each row: resolve recipient email (`auth.users`), check `email_preferences`
   (category enabled + not globally unsubscribed) and `email_suppressions`. If blocked
   → `status='skipped'`.
3. Render template (subject + HTML/text) from `template` + `payload`, injecting
   deep-link (`/events/:slug`) and signed unsubscribe URL.
4. POST to Resend with an idempotency key. On success → `status='sent'`, store
   `provider_message_id`, log `sent`. On transient failure → `attempts++`,
   `next_attempt_at = now() + backoff(attempts)`, `status='pending'`; when
   `attempts >= MAX_ATTEMPTS` → `status='dead'`.

Invocation: Postgres `pg_cron` (or Supabase scheduled function) every 1 min, plus an
optional `pg_net` nudge from the trigger for low-latency transactional email. A
GitHub Actions cron is the fallback if `pg_cron`/scheduled functions are unavailable
(the repo already uses scheduled Actions — see `supabase-keepalive.yml`).

### 6.5 Reminder & digest jobs
- **Reminder scanner** (scheduled, every 15 min): find events starting within the
  configured lead window whose attendees have no `reminder:<event>:<user>` outbox row;
  enqueue them. Idempotency key prevents duplicates.
- **Digest builder** (scheduled per `digest_frequency`): aggregate un-emailed
  `REACTION`/`COMMENT` activity per user into a single `digest_vN` email; mark items
  included.

### 6.6 Provider
- **Recommended: Resend** — simple REST API, native React/HTML templates, Deno-friendly,
  built-in DKIM setup, webhooks for delivery/bounce/complaint. Alternatives: Postmark
  (strong transactional deliverability), AWS SES (cheapest at scale, more setup).
- Secrets (`RESEND_API_KEY`, `EMAIL_WEBHOOK_SECRET`, `UNSUBSCRIBE_SIGNING_KEY`) stored
  as Supabase Function secrets — never in the client bundle (no `VITE_` prefix).
- Sending domain: dedicated subdomain with SPF/DKIM/DMARC.

### 6.7 Templates
- Minimal, brand-consistent HTML + plain-text fallback per category (`invite_v1`,
  `comment_v1`, `reminder_v1`, `system_v1`, `digest_v1`).
- Every template renders: preheader, event context, primary CTA (deep link),
  footer with unsubscribe + manage-preferences links + physical sender identity.

### 6.8 Frontend
- **Settings → Email preferences** panel (new `domains/profile` view) wired to a
  `services/emailPreferenceService.ts` (`get`/`update`, RLS-scoped). Toggles per
  category, digest frequency, global unsubscribe.
- A standalone unsubscribe route (no auth) that consumes the signed token.

## 7. Rollout Plan

1. **Migration + preferences UI** behind flag off. Backfill `email_preferences`
   defaults for existing users (trigger on new user; batch upsert for existing).
2. **Dark launch:** enqueue + worker in `skipped/log-only` mode (flag on for internal
   users) to validate rendering and provider config without sending broadly.
3. **Staging send:** enable real sends to a small allowlist; verify DKIM/DMARC,
   unsubscribe, and webhook handling.
4. **Gradual prod:** enable `email_notifications` for a percentage cohort, monitor DLQ
   and bounce/complaint rates, then 100%.
5. **Reminders/digest** enabled last, after transactional path is proven.

## 8. Observability & Ops
- Metrics: enqueued, sent, failed, dead, skipped; provider latency; bounce/complaint
  rate; DLQ depth.
- Alerts: DLQ depth > threshold, complaint rate > 0.1%, worker error spike.
- Runbook: replay `dead` rows after fixing root cause; manual suppression management;
  rotate provider key.

## 9. Security, Privacy, Compliance
- PII (email) accessed only via service role in Edge Functions; never exposed to the
  browser or in `payload` beyond what a template needs.
- HMAC-signed unsubscribe tokens; endpoint is rate-limited and idempotent.
- CAN-SPAM/CASL: identify sender, physical address, honor opt-outs promptly, one-click
  unsubscribe, `List-Unsubscribe` headers.
- GDPR: preferences and suppression honored; delivery logs retained with a TTL.

## 10. Test Plan
- **Unit:** trigger enqueues exactly one row per eligible notification; idempotency
  `ON CONFLICT` blocks duplicates; backoff math; preference/suppression filtering;
  unsubscribe token sign/verify.
- **Service:** `emailPreferenceService` get/update under RLS (`.test.ts` alongside).
- **Integration (local Supabase):** insert notification → outbox row appears; worker
  (provider mocked) transitions status; webhook updates delivery log + suppression.
- **E2E (staging):** real send to seeded inbox; open, click deep link, unsubscribe,
  confirm suppression blocks resend.
- **Regression:** existing `notificationService.test.ts` unaffected; RLS denies client
  reads of `email_outbox`.

## 11. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Client-side notification creation misses server enqueue | Trigger fires on the DB insert regardless of client; move sensitive creates server-side over time. |
| Duplicate sends under concurrent workers | `FOR UPDATE SKIP LOCKED` claim + unique idempotency key + status guard. |
| No Edge Functions/`pg_cron` in current stack | Add `supabase/functions/`; fall back to GitHub Actions cron (already used) to invoke the worker. |
| Provider outage | Outbox retries with backoff; DLQ; no product write blocked. |
| Deliverability/spam folder | Dedicated subdomain, SPF/DKIM/DMARC, warm-up, low complaint rate monitoring. |
| Email absent from `user_profiles` | Read `auth.users.email` server-side in worker; don't duplicate PII into profiles. |
| Notification spam / fatigue | Digest for high-frequency categories; per-category prefs; sensible defaults. |

## 12. Open Questions
1. Provider choice — Resend (recommended) vs Postmark vs SES?
2. Sending domain/subdomain and who owns DNS records?
3. Reminder lead time(s) — single default (e.g. 24h) or user-configurable?
4. Should `COMMENT` be per-event immediate or rolled into the digest by default?
5. Do we need localization/timezone-aware send windows at launch?

## 13. Milestones (indicative)
- **M1:** Migration, `email_preferences`, preferences UI, enqueue trigger (flag off).
- **M2:** Edge Function worker + provider integration + templates (dark launch).
- **M3:** Unsubscribe endpoint + webhook handler + suppression list.
- **M4:** Reminder scanner + digest builder.
- **M5:** Staged prod rollout + observability/alerts.

## 14. Appendix — Category → channel defaults

| Notification type | Email default | Delivery mode |
| --- | --- | --- |
| INVITE | On | Immediate (transactional) |
| REMINDER | On | Scheduled (transactional) |
| COMMENT | On | Immediate or digest (configurable) |
| REACTION | Off | Digest only |
| SYSTEM | On | Immediate |
