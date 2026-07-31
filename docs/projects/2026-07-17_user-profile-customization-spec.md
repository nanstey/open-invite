# Spec / Proposal — User Profile Customization

- **Date:** 2026-07-17
- **Status:** Draft for review
- **Change type prefix:** `feat`
- **Reserved branch:** `claude/user-profile-customization-spec-3odw9j`

## 1) Problem

The profile experience is a shell. Users can sign in and are given a `name`
and a default `avatar`, but there is no way to make a profile their own:

- `domains/profile/ProfileView.tsx` renders an **Edit** pencil button
  (`Edit2`) that does nothing.
- The "username" under the display name is **fabricated on the fly** from the
  display name (`currentUser.name.toLowerCase().replace(/\s+/g, '_')`) — it is
  not stored, not unique, and not editable.
- The Bio / About card contains only placeholder comments:
  `{/* Bio field not yet in database - can be added later */}` and
  `{/* Location and social links not yet in database - can be added later */}`.
- The `user_profiles` table (`supabase/migrations/20241201000000_create_initial_schema.sql`)
  has exactly three user-facing columns: `name`, `avatar`, plus timestamps.
- `services/userService.updateUserProfile` only accepts `{ name?, avatar? }`,
  and `avatar` is a raw URL string — there is no image upload path (signup uses
  a `DEFAULT_AVATAR` constant in `domains/auth/LoginModal.tsx`).

The result: every profile looks the same, self-expression is impossible, and
the UI is already hinting at fields (bio, location, links, unique username)
that the data model does not support.

## 2) Goals

1. Let a user **edit** their own profile: display name, unique username, bio,
   location, pronouns, social links, and profile visibility (public/private).
2. Support **avatar upload** (not just a URL), stored in Supabase Storage, with
   sensible size/type limits and a fallback to the current default avatar.
3. Persist a **real, unique username** and use it consistently (profile header,
   future @-mentions, shareable profile URL).
4. Keep the edit surface consistent with existing UI patterns (dark theme,
   `bg-surface` cards, `lib/ui/components` primitives).
5. Enforce ownership and validation at the **database (RLS) layer**, not just
   the client.

### Non-goals (explicitly out of scope for this slice)

- Notifications, Privacy, and Appearance settings rows — leave as
  "Coming Soon" (tracked separately).
- Public profile pages for *other* users / a follow graph beyond existing
  friends.
- Profile verification badges, custom themes, or cover images.

## 3) Proposed Data Model

Add columns to `public.user_profiles` via a **new append-only migration**
(per `AGENTS.md` §6 — do not edit existing migration files):

| Column          | Type        | Notes |
|-----------------|-------------|-------|
| `username`      | `TEXT`      | Unique (case-insensitive), 3–30 chars, `^[a-z0-9_]+$`. Nullable initially for backfill, then enforced. |
| `bio`           | `TEXT`      | Max ~300 chars (enforced in app + `CHECK`). |
| `location`      | `TEXT`      | Free text, max ~100 chars. |
| `pronouns`      | `TEXT`      | Short free text, max ~40 chars. |
| `social_links`  | `JSONB`     | Whitelisted keys only (see below); validated in app layer. |
| `profile_visibility` | `TEXT` | `'public'` \| `'private'`, default `'private'`. `CHECK` constrained. Drives who can view the profile. |
| `avatar`        | *(existing)*| Continue to store a URL; uploaded files resolve to a Storage public URL. |

**Social link whitelist ("the usual suspects"):** `instagram`, `x`,
`tiktok`, `linkedin`, `facebook`, `website`. Keys outside this set are
rejected in the service layer; values are stored as handles/URLs and
normalized on save.

**Profile visibility:** `private` means only the user (and, per existing
friend relationships, their friends) can see profile detail; `public` means
the profile is viewable by any authenticated user and eligible for a
shareable profile URL. Default is `private` so the rollout is opt-in.
Enforcement lives in RLS (see §3 RLS) so it holds regardless of client.

Constraints / indexes:

- `CREATE UNIQUE INDEX ... ON user_profiles (lower(username))` for
  case-insensitive uniqueness.
- `CHECK` constraints for length bounds, the username character pattern, and
  `profile_visibility IN ('public','private')`.
- Backfill: generate an initial `username` from `name` (slugified) with a
  numeric suffix on collision, so existing rows satisfy uniqueness before the
  column is made `NOT NULL`. Existing rows default to `profile_visibility =
  'private'`.

### RLS (visibility enforcement)

The current schema has a `"Users can view all profiles"` policy and a
`"Users can update their own profile"` policy (owner-only writes). Since the
app today only renders the **current user's own** profile (`ProfileView`
receives the authenticated user), `profile_visibility` is stored and toggled
now, and write ownership is already enforced by the existing RLS policy.

**Deferred (lands with public profile URLs / other-user profiles):**
column-level read gating of detail fields (bio, location, pronouns,
social_links) so they return only when `profile_visibility = 'public'`, the
viewer is the owner, or the viewer is an accepted friend. Because Postgres RLS
is row-level, this requires a `SECURITY DEFINER` accessor function or a gated
view rather than a plain policy — intentionally out of scope until there is a
consumer that displays another user's profile.

### Storage

- New Supabase Storage bucket `avatars` (public read).
- Path convention: `avatars/{user_id}/{timestamp}.{ext}`.
- Storage RLS: a user may only write/delete objects under their own
  `{user_id}/` prefix; read is public.
- Client-side guardrails: accept `image/png|jpeg|webp`, cap ~2 MB, downscale
  to a max dimension before upload.

## 4) Proposed Changes

### Backend / data
1. New migration `2026XXXX_add_user_profile_fields.sql`:
   - Add columns above, constraints, unique index, backfill, RLS update.
2. New migration `2026XXXX_create_avatars_bucket.sql` (or `supabase/config`):
   - Create `avatars` bucket + storage policies.

### Services (`services/userService.ts`)
3. Extend `updateUserProfile` to accept the new fields and map them through.
4. Add `isUsernameAvailable(username)` and `uploadAvatar(file, userId)` helpers.
5. Update `fetchUser` / `fetchUsers` `select` and the returned shape.

### Types (`lib/types.ts`)
6. Extend `User` with optional `username`, `bio`, `location`, `pronouns`,
   `socialLinks`. Keep existing fields backward-compatible.

### UI (`domains/profile/`)
7. Wire the existing **Edit** button to open a new `EditProfileModal`
   (mirroring the structure/patterns of `FeedbackModal` /
   `domains/auth/LoginModal.tsx`).
8. Form fields: avatar upload, display name, username (with live availability
   check), pronouns, bio (char counter), location, social links (the whitelist
   set), and a visibility toggle (public/private).
9. Replace the derived-username line with the real stored `username`.
10. Populate the Bio / About card from real data (bio, location, links),
    removing the placeholder comments.

## 5) Technical Triage

### Likely files to update
- `supabase/migrations/` (two new migration files)
- `services/userService.ts` (+ `services/userService.test.ts`)
- `lib/types.ts`
- `lib/database.types.ts` (regenerate)
- `domains/profile/ProfileView.tsx`
- `domains/profile/EditProfileModal.tsx` *(new)*
- Possibly `domains/auth/LoginModal.tsx` (offer username at signup — optional)

### New services/APIs
- Avatar upload via Supabase Storage (`avatars` bucket).
- Username-availability lookup.

## 6) Test Plan
- `services/userService.test.ts`: update mapping for new fields; username
  availability (taken / free / invalid); avatar upload success + rejection of
  bad type/size.
- Migration sanity: backfill produces unique, valid usernames; constraints
  reject invalid input.
- Component tests for `EditProfileModal`: validation, char counters, save flow,
  optimistic update + cache invalidation.
- Manual QA: edit → save → reflected in header, About card, and after reload.

## 7) Validation Gates (per `AGENTS.md`)
`pnpm run lint` · `pnpm run types` · `pnpm test -- --run` · `pnpm run build`
(or the full chain `pnpm run ai-workflow:validate-local`).

## 8) Risks & Mitigations
- **Username uniqueness races** → enforce at DB via unique index; treat the
  DB error as the source of truth, not just the pre-check.
- **Backfill collisions** on existing duplicate names → deterministic numeric
  suffixing during backfill.
- **Storage abuse / large files** → bucket policies + client size/type caps.
- **`avatar` semantics** stay a URL, so existing consumers
  (`feedbackService`, `friendService`, event lists) need no change.
- **RLS gaps** → reuse the existing "update their own profile" policy shape;
  add matching storage policies.

## 9) Execution Slicing
- **Slice 1:** Migration + types + `database.types.ts` regen (data model).
- **Slice 2:** `userService` extensions + tests (username check, upload, update).
- **Slice 3:** `EditProfileModal` + wire the Edit button.
- **Slice 4:** Render real username + populate About card; QA evidence.

## 10) Impact Estimate
- Scope: `medium`
- LOC: ~250–400 across migrations, service, types, and UI.

## 11) Resolved Decisions
1. **Username collection:** Not at signup — username is set/changed later via
   the edit flow. Backfill seeds an initial value; users can rename it once.
2. **Social link whitelist:** The usual suspects — `instagram`, `x`, `tiktok`,
   `linkedin`, `facebook`, `website`.
3. **Visibility:** Add an explicit `profile_visibility` setting
   (`public` / `private`), defaulting to `private`. Public profiles become
   viewable by any authenticated user (and gain a shareable URL); private
   profiles restrict detail fields to the owner and accepted friends. Enforced
   in RLS.
