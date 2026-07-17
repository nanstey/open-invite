# PRD — Harden the Notification System

- **Doc ID:** OI-PRD-20260717-harden-notifications
- **Status:** Draft (for review)
- **Author:** ansteyng@gmail.com
- **Created:** 2026-07-17
- **Change type prefix:** `fix` / `feat`
- **Reserved branch:** `claude/harden-notification-system`
- **Related:** Blocks `OI-PRD-20260717-email-delivery` (email delivery for notifications)

---

## 1. Summary

The in-app notification system (`public.notifications`, `services/notificationService.ts`,
`domains/alerts/AlertsView.tsx`) is the intended source of truth for user activity
alerts. Two problems make it unsafe to build on:

1. **Notifications are not actually being generated.** `createNotification` is exported
   and unit-tested but has **zero production callers**, and there are **no database
   triggers** that write notifications. The stream is effectively empty in practice.
2. **The insert policy is wide open.** The RLS policy is
   `CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT
   WITH CHECK (true)` — meaning **any authenticated client can insert any notification
   for any user**, including forging the `actor_id` and targeting arbitrary recipients.

This PRD hardens notifications so they are **created server-side, authenticated,
deduplicated, and RLS-locked** — turning the table into a trustworthy event source.

This work is a **prerequisite for email delivery**: the proposed email pipeline fires
on `notifications` inserts, so an open insert policy would become an
"email anyone, as anyone" spam/spoofing vector the moment email ships.

## 2. Goals & Non-Goals

### Goals
- Notifications are created by the **server** (DB triggers / `SECURITY DEFINER` RPCs),
  not by unauthenticated client inserts.
- Close the RLS hole: clients can no longer forge notifications for other users or spoof
  `actor_id`.
- **Wire up real events** so the intended flows (invites, comments, reminders) actually
  produce notifications.
- Add integrity guarantees the email layer depends on: **idempotency/dedup**,
  `actor_id` validation, and **self-notification suppression**.
- Preserve the existing read path and `AlertsView` UX; no client-visible regression.

### Non-Goals
- Email/push/SMS delivery (covered by `OI-PRD-20260717-email-delivery`).
- Redesigning the notification UI or adding new notification types beyond wiring
  existing ones.
- User-facing notification preferences UI (email preferences live in the email PRD; an
  in-app mute setting can follow later).

## 3. Current State

| Aspect | Today | Problem |
| --- | --- | --- |
| Creation | `notificationService.createNotification` (client insert), **no callers** | Nothing generates notifications; stream is empty. |
| Server generation | None (no triggers/RPCs write `notifications`) | No reliable, tamper-proof creation path. |
| Insert RLS | `WITH CHECK (true)` | Any client can insert for any user; `actor_id` spoofable. |
| Read RLS | `USING (auth.uid() = user_id)` | Correct — keep. |
| Update RLS | owner may mark read | Correct — keep. |
| Dedup | None | Duplicate/spam rows possible; email would amplify. |
| Types | `INVITE`, `COMMENT`, `REACTION`, `REMINDER`, `SYSTEM` | Enum fine; just not emitted. |

## 4. Threat / Failure Model
- **Spoofing:** authenticated user inserts a notification claiming to be from someone
  else (`actor_id`) or targeting another user (`user_id`). Currently possible.
- **Spam:** user floods another user with notifications. Currently possible; becomes
  inbox spam once email fires on inserts.
- **Missed events:** because creation is client-only and uncalled, legitimate activity
  (an invite, a comment) produces no notification at all.
- **Duplication:** retried client writes or double-fires create duplicate rows.

## 5. Requirements

### 5.1 Functional
- **FR-1 Server-side creation.** Notifications are created by database triggers on the
  originating tables (or by `SECURITY DEFINER` RPCs called from services), never by
  direct client inserts.
- **FR-2 Event wiring.** Emit notifications for:
  - **INVITE** — on `event_invites` insert (notify invitee `user_id`; actor = `invited_by`).
    Use `event_invites`, **not** `event_attendees`: invite issuance writes `event_invites`
    (`services/eventInviteService.ts#sendEventInvites`), whereas `event_attendees` is
    populated on join/accept and is also used for non-invite joins — keying INVITE off
    it would miss the invite-sent moment and mislabel ordinary attendance as invites.
  - **COMMENT** — on `comments` insert (notify event host + other participants; actor = commenter).
  - **REACTION** — on `reactions` insert (notify comment/event owner; actor = reactor). *(Digest-friendly.)*
  - **REMINDER** — from a scheduled job for upcoming events (notify attendees; actor = system).
  - **SYSTEM** — reserved for platform messages via a definer RPC only.
- **FR-3 Self-suppression.** Never notify a user about their own action
  (`actor_id = user_id` is dropped).
- **FR-4 Idempotency/dedup.** A uniqueness key prevents duplicate notifications for the
  same (recipient, type, source-entity) tuple.
- **FR-5 Validated actor.** `actor_id` is derived server-side from `auth.uid()` /
  the source row, never accepted verbatim from a client.
- **FR-6 Backfill-safe.** Migration adds structures without breaking existing rows or
  the read path.

### 5.2 Non-Functional
- **Security:** clients cannot insert arbitrary notifications; least-privilege RLS.
- **Correctness:** existing `AlertsView` and `fetchNotifications` behavior unchanged.
- **Performance:** triggers are lightweight; dedup uses an indexed unique key.
- **Testability:** creation logic is covered by SQL/integration tests and service tests.

## 6. Proposed Design

### 6.1 Lock down insert RLS
Replace the permissive policy so ordinary clients cannot insert:

```sql
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- No permissive INSERT policy for the `authenticated` role.
-- Inserts happen only via SECURITY DEFINER triggers/RPCs (which run as owner and
-- bypass RLS), or via the service role. Clients get no direct INSERT path.
```

If a definer RPC is used for `SYSTEM` messages, it validates the caller (e.g. admin
flag) before inserting.

### 6.2 Server-side creation via triggers

> **Do not expose the helper as an RPC.** PostgreSQL grants `EXECUTE` on new functions
> to `PUBLIC` by default, and Supabase/PostgREST exposes callable functions **in the
> `public` schema** as REST RPCs. A `SECURITY DEFINER` helper left in `public` would
> therefore be callable by any authenticated client with arbitrary `p_user_id` /
> `p_actor_id` — recreating the exact spoofing hole we are closing once the table
> INSERT policy is removed. Mitigate with **both**: (a) put the helper in a **private,
> non-exposed schema** (not in PostgREST's `db-schemas`, e.g. `internal`), and
> (b) explicitly `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated`. Only trigger
> functions and authorized wrapper RPCs call it.

Add `AFTER INSERT` triggers on the source tables that call a shared, non-exposed helper:

```sql
-- Add a dedup key so the same logical event can't notify twice.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dedup_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_dedup
  ON public.notifications (dedup_key) WHERE dedup_key IS NOT NULL;

-- Private schema, NOT listed in PostgREST db-schemas, so it is never exposed as an RPC.
CREATE SCHEMA IF NOT EXISTS internal;

CREATE OR REPLACE FUNCTION internal.create_notification(
  p_user_id UUID, p_type notification_type, p_title TEXT, p_message TEXT,
  p_related_event_id UUID, p_actor_id UUID, p_dedup_key TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = '' AS $$   -- pin search_path to prevent function hijacking
BEGIN
  -- Self-suppression
  IF p_actor_id IS NOT NULL AND p_actor_id = p_user_id THEN
    RETURN;
  END IF;
  INSERT INTO public.notifications
    (user_id, type, title, message, related_event_id, actor_id, dedup_key)
  VALUES
    (p_user_id, p_type, p_title, p_message, p_related_event_id, p_actor_id, p_dedup_key)
  ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;
END; $$;

-- Belt and suspenders: even in a private schema, strip default EXECUTE grants.
REVOKE ALL ON FUNCTION internal.create_notification(
  UUID, notification_type, TEXT, TEXT, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
```

Example wiring (comment → notify host):

```sql
CREATE OR REPLACE FUNCTION internal.notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_host UUID;
BEGIN
  SELECT host_id INTO v_host FROM public.events WHERE id = NEW.event_id;
  PERFORM internal.create_notification(
    v_host, 'COMMENT', 'New comment', left(NEW.text, 140),
    NEW.event_id, NEW.user_id, 'comment:' || NEW.id || ':' || v_host
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_on_comment
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION internal.notify_on_comment();
```

Trigger functions are also placed in `internal` and pin `search_path`. They are invoked
only by the trigger machinery, never as RPCs.

Analogous triggers for `event_invites` (INVITE — recipient `NEW.user_id`, actor
`NEW.invited_by`) and `reactions` (REACTION). REMINDER comes from a scheduled scanner
(shared with the email PRD's reminder job, or a small `pg_cron` job that calls the
helper).

### 6.3 Service layer
- Deprecate the client-callable `createNotification` insert path; keep `fetch*` and
  `markAsRead` untouched.
- If any UI genuinely needs to create a notification (e.g. an admin SYSTEM broadcast),
  route it through a **thin, authorized** `SECURITY DEFINER` wrapper RPC
  (`rpc('create_system_notification', …)`) that (a) lives in `public` only because it
  must be callable, (b) first checks the caller is authorized (e.g. admin flag on
  `user_profiles`) and rejects otherwise, and (c) delegates to
  `internal.create_notification`. The unchecked helper itself is never exposed.

### 6.4 Interaction with the email PRD
Once creation is server-side and RLS is closed:
- The email PRD's enqueue trigger fires only on **trustworthy** inserts.
- `dedup_key` gives the email outbox a natural idempotency source.
- Self-suppression and actor validation prevent bogus emails automatically.

## 7. Migration Plan (append-only)
1. New migration: add `dedup_key` + unique index; add `create_notification` definer
   function; drop the permissive insert policy.
2. New migration(s): add per-source triggers (`comments`, `event_attendees`,
   `reactions`) and the reminder scanner hook.
3. Backfill not required (no historical guarantee); optionally seed a SYSTEM welcome.
4. Follow repo rule: fresh timestamps, do not edit prior migrations.

## 8. Rollout Plan
1. Ship RLS lockdown + definer function + triggers to staging; verify notifications now
   appear for real invite/comment/reaction flows in `AlertsView`.
2. Confirm clients can no longer insert directly (expect RLS denial).
3. Promote to prod. This unblocks the email PRD.

## 9. Test Plan
- **Unit/service:** `notificationService.test.ts` updated — direct client insert now
  denied by RLS; `fetch*`/`markAsRead` unchanged.
- **SQL/integration (local Supabase):**
  - Inserting a comment/invite/reaction creates exactly one notification for the right
    recipient with server-derived `actor_id`.
  - Self-action produces **no** notification.
  - Duplicate source events produce **one** row (dedup key).
  - A client `insert` into `notifications` is **rejected** by RLS.
- **Regression:** `AlertsView` renders unchanged; realtime updates still fire.

## 10. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Dropping the insert policy breaks a hidden client insert path | Grep confirms no production caller; add definer RPC for any legitimate need before removing. |
| Trigger fan-out (comment on a busy event) creates many rows | Notify host + participants only; dedup key; batch/digest at the email layer. |
| `SECURITY DEFINER` helper callable as an RPC (default `PUBLIC` EXECUTE + PostgREST exposure) | Helper lives in a private `internal` schema (not in PostgREST `db-schemas`) and has `EXECUTE` revoked from `PUBLIC`/`anon`/`authenticated`; only triggers and an authorized wrapper RPC call it; functions pin `search_path`. |
| INVITE keyed off the wrong table | Source INVITE from `event_invites` (invite issuance), not `event_attendees` (join/accept), so invitees are notified at send time and joins aren't mislabeled. |
| Migration ordering drift after rebase | Use fresh timestamps per AGENTS.md §6. |
| Reminder job overlap with email PRD | Share one scanner; `create_notification` is idempotent via dedup key. |

## 11. Open Questions
1. For COMMENT, notify only the host, or all thread participants? (Affects fan-out.)
2. Should REACTION create in-app notifications at all, or only feed the email digest?
3. Do we need an in-app mute/preferences setting now, or defer until after email prefs?
4. Is there an admin surface that legitimately needs to emit SYSTEM notifications?

## 12. Milestones
- **M1:** RLS lockdown + `create_notification` definer + `dedup_key` (no behavior loss).
- **M2:** Source triggers (comment, invite, reaction) wired; tests green.
- **M3:** Reminder scanner emitting REMINDER notifications.
- **M4:** Hand-off: email PRD unblocked and updated to depend on this.
