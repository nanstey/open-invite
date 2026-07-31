# PRD — Email Delivery System

- **Doc ID:** OI-PRD-20260717-email-delivery
- **Status:** Draft (for review)
- **Author:** ansteyng@gmail.com
- **Created:** 2026-07-17
- **Updated:** 2026-07-31 — revised to a **generic** delivery service (notifications
  are now the first *producer*, not the whole system).
- **Change type prefix:** `feat`
- **Reserved branch:** `claude/generic-email-delivery-apv3jh`
- **Related:** `OI-PRD-20260717-harden-notifications` (already landed) is a precondition
  for the **notification producer** specifically — see §5.1 FR-0 — not for the delivery
  core itself.

---

## 1. Summary

Open Invite has **no outbound email**. Time-sensitive activity — a new invite, an
event reminder, a comment on your event — is only visible when a user opens the app.
Beyond that near-term gap, the product will eventually want other kinds of email:
account/security mail, marketing and re-engagement, receipts, operational alerts.

Rather than build a one-off "email the notifications" feature, this PRD proposes a
**generic email delivery service**: a reusable outbox + worker that any *producer* can
enqueue into, with a provider adapter, per-topic preferences, marketing consent,
idempotent delivery, retries, suppression, and compliance handling built once and
shared. **In-app notifications are the first producer** wired to it; **marketing and
other email are explicit future producers** the design must not preclude.

The guiding constraint for this revision: **don't over-fit to notifications.** Every
place the original design hard-coded a `notification_type`, a per-notification-category
preference, or an `auth.users`-only recipient, we generalize just enough that a second
producer needs *no schema redesign* — while avoiding speculative machinery we have no
use for yet.

## 2. Goals & Non-Goals

### Goals
- A **producer-agnostic** delivery core: outbox, worker, provider adapter, delivery log,
  suppression, unsubscribe, and template rendering that know nothing about notifications.
- A single **enqueue interface** (`internal.enqueue_email(...)`) that every producer
  calls; uniform idempotency, preference/consent checks, and observability for all email.
- A **message-class** model (`transactional` / `marketing` / `account`) that carries the
  right compliance behavior per class, so adding marketing later is configuration, not
  rework.
- **Recipient flexibility**: address users *and* non-users (invite-by-email, external
  lists), not only rows in `auth.users`.
- **Topic-based preferences** (data-driven), so new email kinds don't each add a column.
- Wire **notifications as the first producer** (invite / reminder / comment / digest),
  reliably and at-most-once, respecting preferences and suppression.
- Durable delivery: retries with backoff, dead-lettering, delivery-status observability.
- Compliance: one-click unsubscribe, `List-Unsubscribe`, scoped suppression on hard
  bounce/complaint, marketing opt-in.
- Staged rollout behind the existing feature-flag system.

### Non-Goals
- Building the marketing/broadcast **producer** itself (campaign authoring, audience
  segmentation, send scheduling UI). We design the *core* so it can host one; we don't
  ship it here.
- Non-email channels (web-push, SMS). The schema leaves room (`channel`) but we build
  only `email`.
- Rich user-authored HTML email or per-user template editing.
- Replacing in-app notifications; email is additive.

## 3. Background / Current State

| Area | Current implementation |
| --- | --- |
| Data | `public.notifications` (`type`, `title`, `message`, `related_event_id`, `actor_id`, `is_read`, `timestamp`) with RLS scoping rows to the owning user. |
| Types | `notification_type` enum: `INVITE`, `COMMENT`, `REACTION`, `REMINDER`, `SYSTEM`. |
| Notification write path | Server-side only. `internal.create_notification` (SECURITY DEFINER) called from `AFTER INSERT` triggers (`internal.notify_on_invite/comment/reaction`, reminder job). Direct client inserts are denied by RLS (`20260717000000_harden_notifications_core.sql`). |
| Read path | `AlertsView` + `fetchNotifications` (realtime-backed). |
| Backend runtime | Supabase (Postgres + Auth + Realtime + RLS). No Edge Functions yet (`supabase/functions/` absent). |
| Hosting | Netlify (static SPA + edge functions for OG images). Build in GitHub Actions; a scheduled Action already exists (`supabase-keepalive.yml`). |
| Config | Feature flags table (`20260523000000_add_feature_flags.sql`); `VITE_APP_ENV` = local/staging/prod. |
| Private schema | An `internal` schema already exists for SECURITY DEFINER helpers — the natural home for `internal.enqueue_email`. |
| User email | Lives in `auth.users.email` (Supabase Auth). `user_profiles` has no email column. |

**What changed since the first draft:** the notification-hardening work has **landed**.
Notifications are now created server-side via SECURITY DEFINER helpers and clients can
no longer insert them. That removes the original "email anyone, as anyone" blocker for
the notification producer and, more importantly, frees the delivery *core* to be built
and tested independently of notifications entirely.

## 4. User Stories

1. As an invited guest, when someone invites me, I receive an email with the event
   title, time, location, and a link to respond — even if the app is closed.
2. As an event host, when a guest comments, I receive an email (or a batched digest).
3. As an attendee, I receive a reminder a configurable interval before an event.
4. As any user, I control which topics email me from a Settings page, and I can
   unsubscribe from all non-essential email with one click from any message.
5. As an operator, I can see delivery status, retry failures, and confirm we suppress
   sending to bounced/complained addresses.
6. **(Forward-looking) As the product team,** I can stand up a *new* kind of email
   (e.g. an account-security alert, a win-back campaign) by adding a producer + template
   + topic — reusing the same outbox, worker, provider, suppression, and unsubscribe —
   **without altering the delivery schema.**

Stories 1–5 ship now (notification producer). Story 6 is the acceptance test for
"generic": if it would require a migration to the core tables, the design has failed.

## 5. Requirements

### 5.1 Functional — Delivery core (producer-agnostic)
- **FR-1 Enqueue interface.** A single `internal.enqueue_email(...)` (SECURITY DEFINER)
  is the only way rows enter `email_outbox`. It takes a producer id, message class,
  topic, recipient (user id **and/or** literal email), template id, payload, and an
  idempotency key; upserts `ON CONFLICT (idempotency_key) DO NOTHING`. Producers never
  touch the outbox table directly.
- **FR-2 Message classes.** Every message carries a `message_class`:
  - `transactional` — user-relationship/activity triggered (invites, reminders,
    comments, receipts). Suppressed only by the matching **topic** opt-out or an
    `all`-scope suppression.
  - `marketing` — promotional/broadcast. **Requires positive opt-in** and is suppressed
    by topic opt-out, a `marketing`-scope suppression, **or** an `all`-scope suppression.
  - `account` — critical account/security mail (e.g. password reset, security alert).
    Bypasses topic preferences; suppressed only by an `all`-scope suppression (hard
    bounce). No such mail is in current scope, but the class exists so future producers
    slot in.
- **FR-3 Recipient resolution.** The outbox stores an optional `user_id` **and** an
  optional `recipient_email`. The worker resolves the address at send time from
  `recipient_email` if present, else from `auth.users.email` for `user_id`. This lets us
  email people who are not (yet) users.
- **FR-4 Provider send via adapter.** A scheduled/triggered Edge Function worker claims
  pending outbox rows, renders a template, and sends through a **provider adapter**
  interface (default impl: Resend). Swapping providers is an adapter change, not a
  schema change.
- **FR-5 Idempotency.** Each outbox row has a stable idempotency key; a provider send is
  attempted at-most-once per row (status transitions guard re-sends), and the key is also
  passed to the provider to dedupe on our behalf.
- **FR-6 Retries + DLQ.** Transient failures retry with exponential backoff up to
  `MAX_ATTEMPTS`, then move to `dead` for inspection.
- **FR-7 Preferences & consent.** Preferences are **topic-based**, not one column per
  notification category:
  - `email_subscriptions (user_id, topic, subscribed)` — sparse; a missing row means
    "use the topic's default". Transactional topics default **subscribed**; marketing
    topics default **unsubscribed** (opt-in).
  - The worker resolves send/skip from `(message_class, topic, subscription, suppression)`
    uniformly for every producer.
- **FR-8 Unsubscribe.** Every non-`account` email includes a signed one-click
  unsubscribe link plus `List-Unsubscribe` / `List-Unsubscribe-Post` headers. The
  endpoint (no login) can unsubscribe from a **specific topic** or set an **`all`- or
  `marketing`-scope** preference, driven by the signed token's scope.
- **FR-9 Bounce/complaint webhooks.** Provider webhooks update delivery status and add
  hard-bounced/complained addresses to `email_suppressions` with the appropriate
  **scope** (`all` for hard bounce/complaint; `marketing` for list-unsubscribe on a
  marketing message).
- **FR-10 Feature flag.** Sending is gated per-flag. A **core** flag (`email_delivery`)
  arms the worker; per-producer flags (e.g. `email_notifications`, later
  `email_marketing`) gate each producer independently, so producers roll out one at a
  time.
- **FR-11 Observability.** `email_delivery_log` + queryable outbox status, tagged by
  `producer`, `message_class`, and `topic`, so metrics can be sliced per producer.

### 5.1.1 Functional — Notification producer (first consumer of the core)
- **FR-0 Trusted source (precondition, now satisfied).** A producer may only enqueue on
  behalf of a user when its inserts are trustworthy. For notifications this was the
  `WITH CHECK (true)` hole; it is **closed** — creation is server-side and direct client
  inserts are denied (`20260717000000_harden_notifications_core.sql`). Each **future**
  producer must clear the same bar before its per-producer flag is enabled.
- **FR-N1 Enqueue on notification create.** The existing notification trigger path
  (`internal.create_notification` / `internal.notify_on_*`) calls
  `internal.enqueue_email(...)` for email-eligible topics, in the same transaction. No
  client involvement; no new trigger on a client-writable table.
- **FR-N2 Notification topics.** Map `notification_type` → topic
  (`notif.invite`, `notif.comment`, `notif.reaction`, `notif.reminder`, `notif.system`),
  all `message_class = transactional`. The mapping lives in the producer, not the core.
- **FR-N3 Digest & reminders.** Reaction (and optionally comment) topics batch into a
  periodic digest; a scheduled reminder scanner enqueues reminder email at the configured
  lead time, deduped per event/attendee via the idempotency key.

### 5.2 Non-Functional
- **Reliability:** at-most-once delivery per outbox row; no duplicate sends under worker
  retries or concurrent runners (row-level claim via `FOR UPDATE SKIP LOCKED` + lease).
- **Latency:** transactional email delivered p95 < 2 min of enqueue.
- **Throughput:** design for ≥ 5k emails/day initially; horizontally batchable. Marketing
  sends can be bursty — the outbox + batched worker must absorb a large enqueue without
  starving transactional mail (see §6.9).
- **Security/Privacy:** addresses read server-side only (service role); outbox/prefs
  under RLS; unsubscribe tokens HMAC-signed.
- **Deliverability:** SPF, DKIM, DMARC on a dedicated sending subdomain
  (e.g. `mail.openinvite.app`); consider a separate subdomain or IP pool for marketing so
  campaign complaints don't harm transactional reputation.
- **Observability:** structured logs + queryable delivery status, sliceable per producer;
  alert on DLQ growth and provider error-rate.
- **Cost:** provider free/low tier sufficient at launch.

## 6. Proposed Design

### 6.1 Architecture (generic outbox + worker)

```
  producer: notifications        producer: reminders        producer: <future, e.g. marketing>
        │                              │                              │
        │  internal.enqueue_email(user/email, class, topic, template, payload, key)
        └──────────────┬───────────────┴──────────────┬───────────────┘
                       ▼                               ▼
                 email_outbox (status=pending)  ◄── every producer enqueues the same way
                       │
                       │  claim batch (FOR UPDATE SKIP LOCKED, lease)
                       ▼
             Edge Function: email-worker ──render(template,payload)──►  provider adapter (Resend)
                       │                                                     │
                       │  resolve recipient + prefs + suppression            │ delivery/bounce/complaint
                       │  update status (sent/failed/dead/skipped)           ▼
                       ▼                                          Edge Function: email-webhook
                 email_delivery_log  ◄──────────────────────────────────┘
                       │
                       ▼
                 email_suppressions (scoped: all | marketing)
```

The dashed box (core) is producer-agnostic. Producers contribute only: (a) a call to
`internal.enqueue_email`, (b) a template, (c) a topic registration.

Why outbox rather than sending inline in a trigger (unchanged, still true):
- Postgres triggers must stay fast and side-effect-free; calling an external HTTP API
  from a trigger couples product writes to provider latency/availability.
- The outbox gives durability, retries, idempotency, and an audit trail for free — for
  *every* producer, not just notifications.

### 6.2 Data model (new migration, append-only)

```sql
-- ── Generic classification ───────────────────────────────────────────────────
CREATE TYPE email_message_class AS ENUM ('transactional', 'marketing', 'account');
CREATE TYPE email_status        AS ENUM ('pending','sending','sent','failed','dead','skipped');
CREATE TYPE suppression_scope   AS ENUM ('all','marketing');  -- 'all' = every class

-- Topic registry: topics are DATA, so a new email kind is an INSERT, not a migration.
CREATE TABLE public.email_topics (
  topic          TEXT PRIMARY KEY,             -- 'notif.invite', 'marketing.winback', ...
  message_class  email_message_class NOT NULL,
  description     TEXT,
  default_subscribed BOOLEAN NOT NULL,         -- transactional: true; marketing: false
  digestible     BOOLEAN NOT NULL DEFAULT false
);

-- Sparse per-user, per-topic preference. Missing row => topic default.
CREATE TABLE public.email_subscriptions (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic       TEXT NOT NULL REFERENCES public.email_topics(topic),
  subscribed  BOOLEAN NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, topic)
);

CREATE TABLE public.email_outbox (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer            TEXT NOT NULL,             -- 'notifications' | 'reminders' | 'marketing' | ...
  channel             TEXT NOT NULL DEFAULT 'email',  -- room for future channels; only 'email' now
  message_class       email_message_class NOT NULL,
  topic               TEXT NOT NULL REFERENCES public.email_topics(topic),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,   -- nullable
  recipient_email     TEXT,                      -- nullable; used for non-users / explicit address
  idempotency_key     TEXT NOT NULL UNIQUE,      -- 'notif:<id>', 'reminder:<event>:<user>', 'mkt:<campaign>:<user>'
  template            TEXT NOT NULL,             -- template id, e.g. 'invite_v1'
  payload             JSONB NOT NULL,            -- rendering context (title, event, actor, links, ...)
  status              email_status NOT NULL DEFAULT 'pending',
  attempts            INT NOT NULL DEFAULT 0,
  next_attempt_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at          TIMESTAMPTZ,
  lock_until          TIMESTAMPTZ,               -- claim lease expiry; past => reclaimable
  last_error          TEXT,
  provider_message_id TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- must be able to reach a recipient one way or another
  CONSTRAINT recipient_present CHECK (user_id IS NOT NULL OR recipient_email IS NOT NULL)
);
CREATE INDEX idx_email_outbox_claim ON public.email_outbox (status, next_attempt_at, lock_until);
CREATE INDEX idx_email_outbox_slice ON public.email_outbox (producer, message_class, topic);

CREATE TABLE public.email_delivery_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id         UUID REFERENCES public.email_outbox(id) ON DELETE CASCADE,
  event             TEXT NOT NULL,               -- 'sent'|'delivered'|'bounced'|'complained'|'opened'
  provider_payload  JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.email_suppressions (
  email       TEXT NOT NULL,
  scope       suppression_scope NOT NULL DEFAULT 'all',
  reason      TEXT NOT NULL,                     -- 'hard_bounce'|'complaint'|'unsubscribe'|'manual'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (email, scope)
);
```

Notes on the genericization:
- **`email_topics` + `email_subscriptions`** replace the original fixed
  `invite_enabled / comment_enabled / …` columns. Adding "win-back marketing" is
  `INSERT INTO email_topics ('marketing.winback','marketing',…, default_subscribed=false)`
  — no ALTER TABLE, no new preference column, and the Settings UI can render topics
  dynamically.
- **`message_class` + scoped `email_suppressions`** encode compliance generically: a
  marketing unsubscribe writes `scope='marketing'` and never blocks a transactional
  invite; a hard bounce writes `scope='all'`.
- **Nullable `user_id` + `recipient_email`** remove the `auth.users`-only assumption.
- **`producer` / `channel`** columns make the outbox self-describing for metrics and
  leave the door open for other channels without pretending to build them now.

RLS:
- `email_topics`: world-readable (so the Settings UI can list topics); no client writes.
- `email_subscriptions`: owner may `SELECT`/`UPSERT` their own rows (`auth.uid()` check).
- `email_outbox`, `email_delivery_log`, `email_suppressions`: **no client access**;
  service-role only (worker/webhook). Follows the existing service-role precedent.

### 6.3 Enqueue interface (the seam every producer uses)

```sql
CREATE OR REPLACE FUNCTION internal.enqueue_email(
  p_producer        TEXT,
  p_message_class   email_message_class,
  p_topic           TEXT,
  p_template        TEXT,
  p_payload         JSONB,
  p_idempotency_key TEXT,
  p_user_id         UUID DEFAULT NULL,
  p_recipient_email TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.email_outbox
    (producer, message_class, topic, template, payload, idempotency_key, user_id, recipient_email)
  VALUES
    (p_producer, p_message_class, p_topic, p_template, p_payload, p_idempotency_key, p_user_id, p_recipient_email)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;  -- NULL when the key already existed (dedupe)
END; $$;
```

The **notification producer** simply calls it from the existing server-side path:

```sql
-- inside internal.create_notification(...), after the notifications INSERT:
IF NEW.type IN ('INVITE','COMMENT','REMINDER','SYSTEM') THEN
  PERFORM internal.enqueue_email(
    p_producer        => 'notifications',
    p_message_class   => 'transactional',
    p_topic           => 'notif.' || lower(NEW.type::text),
    p_template        => lower(NEW.type::text) || '_v1',
    p_payload         => jsonb_build_object('title', NEW.title, 'message', NEW.message,
                           'related_event_id', NEW.related_event_id, 'actor_id', NEW.actor_id),
    p_idempotency_key => 'notif:' || NEW.id,
    p_user_id         => NEW.user_id
  );
END IF;
```

Preference/suppression/recipient resolution happens in the **worker** (it needs
`auth.users.email` and subscription lookups), so the enqueue stays trivial and uniform.
A future marketing producer calls the *same* function with `p_message_class=>'marketing'`,
`p_topic=>'marketing.winback'`, and either `p_user_id` or `p_recipient_email`.

### 6.4 Worker (Supabase Edge Function, Deno)

`supabase/functions/email-worker/index.ts` — provider-agnostic:
1. **Claim a batch with a lease.** Select up to `BATCH_SIZE` rows that are fresh or
   reclaimable, `FOR UPDATE SKIP LOCKED`, stamp a lease, bump `attempts`. A row is
   claimable when `status='pending' AND next_attempt_at <= now()` **or**
   `status='sending' AND lock_until < now()` (stale claim whose worker died mid-flight).
   On claim: `status='sending'`, `claimed_at=now()`, `lock_until=now()+LEASE` (≈5 min,
   > function timeout), `attempts=attempts+1`.

   ```sql
   WITH claimable AS (
     SELECT id FROM public.email_outbox
     WHERE (status='pending'  AND next_attempt_at <= now())
        OR (status='sending' AND lock_until < now())     -- reclaim stale rows
     ORDER BY next_attempt_at
     FOR UPDATE SKIP LOCKED
     LIMIT :batch_size
   )
   UPDATE public.email_outbox o
     SET status='sending', claimed_at=now(),
         lock_until=now()+interval '5 minutes', attempts=attempts+1
   FROM claimable c WHERE o.id=c.id
   RETURNING o.*;
   ```
2. **Resolve recipient:** `recipient_email` if present, else `auth.users.email` for
   `user_id`. No address → `skipped`.
3. **Policy check (uniform for all producers), by `message_class`:**
   - Look up the effective subscription: `email_subscriptions(user_id, topic)` if a row
     exists, else `email_topics.default_subscribed`. (Anonymous/`recipient_email`-only
     recipients have no subscription row → topic default.)
   - `transactional`: send unless topic-unsubscribed or an `all`-scope suppression exists.
   - `marketing`: send only if effectively subscribed **and** no `marketing`/`all`
     suppression.
   - `account`: send unless an `all`-scope suppression exists (bypasses topic prefs).
   - Blocked → `status='skipped'`, clear `lock_until`.
4. **Render** template (subject + HTML/text) from `template` + `payload`, injecting the
   deep link and a signed unsubscribe URL (scope derived from `message_class`/`topic`).
5. **Send** via the provider adapter with the idempotency key. Success → `status='sent'`,
   `lock_until=NULL`, store `provider_message_id`, log `sent`. Transient failure →
   `next_attempt_at=now()+backoff(attempts)`, `status='pending'`, `lock_until=NULL`;
   `attempts>=MAX_ATTEMPTS` → `status='dead'`.

**Crash safety** (unchanged): the lease + claim-time `attempts` bump means a worker that
dies mid-send leaves the row in `sending` only until `lock_until` passes; the next run
reclaims it, and the provider idempotency key prevents a double-send if the dead worker
had already reached the provider. A monitor alerts if `attempts` climbs without a terminal
status.

Invocation: `pg_cron` / Supabase scheduled function every ~1 min, plus an optional
`pg_net` nudge from `enqueue_email` for low-latency transactional mail. GitHub Actions
cron is the fallback (already used — `supabase-keepalive.yml`).

### 6.5 Provider adapter
- An interface — `send({to, subject, html, text, headers, idempotencyKey}) → {providerMessageId}`
  — with a default **Resend** implementation. The worker depends on the interface, so a
  provider swap (Postmark, SES) or a per-class provider (transactional vs marketing) is an
  adapter change, not a core change.
- Secrets (`EMAIL_PROVIDER_API_KEY`, `EMAIL_WEBHOOK_SECRET`, `UNSUBSCRIBE_SIGNING_KEY`)
  stored as Supabase Function secrets — never in the client bundle (no `VITE_` prefix).
- Sending domain: dedicated subdomain with SPF/DKIM/DMARC; consider isolating marketing
  reputation on its own subdomain/pool.

### 6.6 Templates
- A template registry keyed by id; each template is `(subject, html, text)` rendered from
  `payload`. Templates belong to producers, not to the core. First set (notifications):
  `invite_v1`, `comment_v1`, `reminder_v1`, `system_v1`, `digest_v1`.
- Every non-`account` template renders: preheader, context, primary CTA (deep link),
  footer with unsubscribe + manage-preferences links + physical sender identity.

### 6.7 Notification producer specifics
- **Enqueue:** from the server-side `internal.create_notification` path (§6.3).
- **Reminder scanner** (scheduled, every ~15 min): find events starting within the lead
  window whose attendees lack a `reminder:<event>:<user>` outbox row; enqueue via
  `internal.enqueue_email(p_producer=>'reminders', …)`. Idempotency key dedupes.
- **Digest builder** (scheduled per user digest cadence): aggregate un-emailed
  `notif.reaction` / `notif.comment` activity into a single `digest_v1` email.

### 6.8 Frontend
- **Settings → Email preferences** panel (new `domains/profile` view) wired to
  `services/emailPreferenceService.ts`. It reads `email_topics` and the user's
  `email_subscriptions` and renders a **toggle per topic**, grouped by class
  (transactional vs marketing), plus digest cadence. Because it's topic-driven, new email
  kinds appear automatically once their topic is registered.
- A standalone unsubscribe route (no auth) that consumes the signed token and applies the
  token's scope (topic / marketing / all).

### 6.9 Fairness (transactional vs bursty marketing)
Because one outbox now serves multiple producers, a large marketing enqueue must not
starve time-sensitive invites/reminders. Mitigations, cheapest first: order the claim by
`message_class` priority then `next_attempt_at`; or run the worker with a small reserved
share for `transactional`; or (only if needed) partition claims per class. Not built now,
but the `message_class` column makes any of these a query change, not a redesign.

## 7. Rollout Plan
1. **Core + topic registry + preferences UI** behind flags off. Seed `email_topics` with
   the notification topics. Backfill nothing (subscriptions are sparse/default-driven).
2. **Dark launch:** enqueue + worker in log-only/`skipped` mode (core flag on for internal
   users) to validate rendering, recipient resolution, and provider config without sending
   broadly.
3. **Staging send:** enable real sends to a small allowlist; verify DKIM/DMARC,
   unsubscribe (all three scopes), and webhook handling.
4. **Gradual prod (notifications):** enable `email_notifications` for a cohort, monitor
   DLQ + bounce/complaint, then 100%.
5. **Reminders/digest** enabled last, after the transactional path is proven.
6. **(Future) Marketing/other producers:** each clears FR-0 (trusted source), registers
   topics + templates, and rolls out behind its own per-producer flag — reusing the core
   unchanged.

## 8. Observability & Ops
- Metrics sliced by `producer` / `message_class` / `topic`: enqueued, sent, failed, dead,
  skipped; provider latency; bounce/complaint rate; DLQ depth.
- Alerts: DLQ depth > threshold, complaint rate > 0.1% (per class), worker error spike.
- Runbook: replay `dead` rows after fixing root cause; manage suppressions; rotate keys.

## 9. Security, Privacy, Compliance
- PII (email) accessed only via service role in Edge Functions; never exposed to the
  browser or placed in `payload` beyond what a template needs.
- HMAC-signed, scoped unsubscribe tokens; endpoint rate-limited and idempotent.
- CAN-SPAM/CASL: identify sender + physical address, one-click unsubscribe,
  `List-Unsubscribe` headers, honor opt-outs promptly. **Marketing requires opt-in**
  (`default_subscribed=false`) and honors `marketing`-scope suppression independently of
  transactional mail.
- GDPR: preferences + suppression honored; delivery logs retained with a TTL.

## 10. Test Plan
- **Unit:** `internal.enqueue_email` upsert + `ON CONFLICT` dedupe; notification path
  enqueues exactly one row per eligible notification with the right class/topic; backoff
  math; policy resolution across the class × subscription × suppression matrix;
  unsubscribe token sign/verify per scope.
- **Service:** `emailPreferenceService` get/update under RLS (topic-driven).
- **Integration (local Supabase):** create notification → outbox row appears with
  `producer='notifications'`; worker (provider mocked) transitions status; a
  `recipient_email`-only row (no `user_id`) sends; webhook updates delivery log +
  writes correctly-scoped suppression.
- **Genericity regression:** a *synthetic* second producer (`test.*` topic, `account`
  class, `recipient_email` recipient) flows end-to-end **with no change to core tables** —
  this is the executable version of User Story 6.
- **E2E (staging):** real send to a seeded inbox; open, click deep link, unsubscribe at
  each scope, confirm suppression blocks the right classes.
- **Regression:** existing `notificationService.test.ts` unaffected; RLS denies client
  reads of `email_outbox`.

## 11. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Over-fitting to notifications forces a redesign for the 2nd producer | Generic core: `enqueue_email` seam, `message_class`, topic registry, nullable-user recipient. User Story 6 + the genericity regression test enforce it. |
| Untrusted producer emails arbitrary users | FR-0: every producer must have server-side, trustworthy enqueue before its flag is enabled. Notifications already satisfy this. |
| Marketing unsubscribe accidentally kills transactional mail | Scoped suppression (`marketing` vs `all`) + per-class policy in the worker. |
| Bursty marketing starves transactional invites | Shared outbox with `message_class`-aware claim ordering / reserved share (§6.9). |
| Duplicate sends under concurrent workers | `FOR UPDATE SKIP LOCKED` + lease + unique idempotency key + provider dedupe. |
| No Edge Functions / `pg_cron` yet | Add `supabase/functions/`; GitHub Actions cron fallback (already used). |
| Provider outage | Outbox retries with backoff; DLQ; no product write blocked. |
| Deliverability / marketing reputation harming transactional | Dedicated subdomain; consider separate marketing subdomain/pool; SPF/DKIM/DMARC; complaint monitoring per class. |
| Email absent from `user_profiles` | Resolve `auth.users.email` server-side; or use `recipient_email`; don't duplicate PII into profiles. |
| Notification fatigue | Digest for high-frequency topics; per-topic prefs; sensible defaults. |

## 12. Open Questions
1. Provider — Resend (recommended) vs Postmark vs SES? Do we want a **separate provider or
   subdomain for marketing** from day one, or share initially?
2. Sending domain/subdomain and DNS ownership?
3. Reminder lead time(s) — single default (e.g. 24h) or user-configurable?
4. Should `notif.comment` be immediate or digest by default?
5. Timezone-aware / quiet-hours send windows at launch (matters most for marketing)?
6. Do we register a `channel` dimension now (email only) or add it when a second channel
   is real? (Leaning: keep the column, build only email.)

## 13. Milestones (indicative)
- **M1:** Migration (topics, subscriptions, outbox, log, suppressions), `enqueue_email`,
  preferences UI, seeded notification topics (flags off).
- **M2:** Edge Function worker + provider adapter + notification templates (dark launch).
- **M3:** Unsubscribe endpoint (scoped) + webhook handler + scoped suppression list.
- **M4:** Reminder scanner + digest builder.
- **M5:** Staged prod rollout + observability/alerts.
- **M6 (future):** Second producer (marketing or account) proving the core is reused
  unchanged.

## 14. Appendix — Notification topic defaults

| notification_type | Topic | Class | Email default | Delivery mode |
| --- | --- | --- | --- | --- |
| INVITE | `notif.invite` | transactional | On | Immediate |
| REMINDER | `notif.reminder` | transactional | On | Scheduled |
| COMMENT | `notif.comment` | transactional | On | Immediate or digest (configurable) |
| REACTION | `notif.reaction` | transactional | Off | Digest only |
| SYSTEM | `notif.system` | transactional | On | Immediate |

*(Marketing/account topics are intentionally absent — they are added by their producers
later, as `email_topics` rows, with no change to this core.)*
