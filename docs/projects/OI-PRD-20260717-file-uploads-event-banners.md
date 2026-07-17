# PRD — File Uploads (foundation) & Event Banner Image Uploads

- **Doc ID:** OI-PRD-20260717-file-uploads-event-banners
- **Status:** Draft (for review)
- **Author:** ansteyng@gmail.com
- **Created:** 2026-07-17
- **Change type prefix:** `feat`
- **Reserved branch:** `claude/file-uploads-event-banners-zv0pfb`
- **Related:** Extends the existing header-image picker (`domains/events/components/detail/images/*`,
  `services/pexelsService.ts`, `services/openverseService.ts`). First consumer of a reusable
  upload foundation intended to later serve avatars, group images, and comment attachments.

---

## 1. Summary

Open Invite has **no file-upload capability today**. Supabase Storage is enabled in
`supabase/config.toml` (`[storage] enabled = true`, `file_size_limit = "50MiB"`), but there
are **no storage buckets**, **no `storage.objects` RLS policies**, and **zero callers of
`supabase.storage`** anywhere in `domains/`, `services/`, or `lib/`. Every image in the app
is an **external URL**: event banners come from Pexels/Openverse search
(`HeaderImageModal` → `header_image_url`) with a `picsum.photos` fallback
(`HeroHeader.tsx:30`).

This PRD does two things:

1. **Establishes a reusable file-upload foundation** — one Supabase Storage bucket
   convention, a `services/storageService.ts` abstraction, shared client-side validation
   + image normalization, and least-privilege `storage.objects` RLS. This is the piece we
   want to get right once so every future upload surface reuses it.
2. **Ships the first concrete consumer: event banner uploads.** Hosts can upload their own
   banner image from their device as a third source inside the existing header-image modal,
   alongside Pexels and Openverse search. The uploaded image's public URL is stored in the
   existing `events.header_image_url` column, so **rendering, reposition
   (`header_image_position_y`), and the fallback chain are unchanged**.

The design keeps the blast radius small: no new column on `events`, no change to
`HeroHeader` rendering, and the upload path is additive to a modal that already abstracts
"pick an image URL."

## 2. Goals & Non-Goals

### Goals
- A **reusable upload primitive** (bucket + service + validation) that future surfaces
  (avatars, groups, chat attachments) adopt without re-solving storage, RLS, or validation.
- Event hosts can **upload a banner from their device** and have it applied to the event.
- Uploads are **security-locked**: only the event host can write an event's banner object;
  reads are public (events are publicly viewable when published).
- Uploads are **safe by construction**: MIME allowlist (raster images only, **no SVG**),
  enforced size cap, and **EXIF/GPS metadata stripped** before upload.
- **No regression** to the existing search-based picker, reposition, or fallback rendering.
- **Orphaned objects are cleaned up** (upload that never gets saved, or replaced banners).

### Non-Goals
- Automated **content moderation / NSFW detection** (note it as a follow-up; out of scope).
- **Per-user storage quotas / billing controls** (add later; MVP relies on size caps).
- Multi-image galleries or attachments on comments/itineraries (foundation enables them; not built here).
- A full DAM/asset-library UI or cross-event image reuse.
- Migrating existing external-URL banners to storage (they keep working untouched).

## 3. Current State

| Aspect | Today | Implication |
| --- | --- | --- |
| Storage buckets | **None** | Greenfield; we define the first bucket + conventions. |
| `storage.objects` RLS | **None** | Must be authored from scratch; no precedent to match. |
| Upload code | **No `supabase.storage` callers** | New `storageService.ts`; no existing pattern to break. |
| Banner source | External URL only (Pexels/Openverse search) via `HeaderImageModal` | Add "Upload" as a third source in the same modal. |
| Banner storage | `events.header_image_url TEXT` (full URL); `header_image_position_y` for framing | Reuse the column; store the uploaded object's **public URL**. |
| Banner render | `<img src={headerImageUrl \|\| picsum-fallback}>` in `HeroHeader.tsx:30` | Unchanged — a Storage public URL is just another URL. |
| Update path | `eventService.updateEvent` maps `headerImageUrl → header_image_url` | Unchanged; upload resolves to a URL, then goes through the same save. |
| Modal seam | `useHeaderImageSelection({ onUpdate(imageUrl) })` | Upload confirms by calling the same `onUpdate(url)` callback. |
| Global size cap | `file_size_limit = "50MiB"` (config.toml) | Too permissive for banners; bucket + client enforce a tighter cap. |

## 4. Threat / Failure Model

- **Unauthorized write.** A non-host authenticated user uploads/overwrites another event's
  banner object. Mitigation: path is namespaced by `event_id` and `storage.objects` RLS
  checks host ownership of that event.
- **Malicious file / stored XSS.** An SVG (or HTML polyglot) served from the app origin can
  execute script. Mitigation: **raster-only MIME allowlist (no SVG/HTML)**, correct
  `content-type` on upload, and Supabase serves storage from a **separate origin** from the app.
- **Privacy leak via metadata.** Phone photos embed **GPS/EXIF**; publishing them leaks the
  host's location. Mitigation: client re-encodes through a canvas, which **drops EXIF** before upload.
- **Storage/cost abuse (DoS).** Large or many uploads inflate storage and bandwidth.
  Mitigation: **size cap enforced client-side and at the bucket**, dimension downscale before
  upload, orphan cleanup, per-user quota as a future control.
- **Orphaned objects.** User uploads, then cancels or navigates away → object with no
  referencing event. Also: replacing a banner leaves the old object dangling. Mitigation:
  deterministic per-event paths + a cleanup job (§6.6).
- **Broken/slow render.** A failed upload or deleted object yields a dead `src`. Mitigation:
  existing fallback chain (`picsum` seed) already covers missing/blank URLs; save the URL
  only **after** a verified successful upload.

## 5. Requirements

### 5.1 Functional
- **FR-1 Reusable service.** A `services/storageService.ts` exposes
  `uploadImage(bucket, path, file, opts)` returning `{ path, publicUrl }`, plus `removeObject`.
  It centralizes validation, normalization, and error mapping so no component talks to
  `supabase.storage` directly.
- **FR-2 Validation (shared).** Reject files that are not in the MIME allowlist
  (`image/jpeg`, `image/png`, `image/webp`; **not** `image/svg+xml`) or exceed the size cap,
  **before** upload, with a user-visible message.
- **FR-3 Normalization (shared).** Before upload, downscale to a max long-edge
  (e.g. 2400px), re-encode to WebP/JPEG at a quality target, and thereby strip EXIF.
- **FR-4 Banner upload UX.** The header-image modal gains an **Upload** source (tab/segment)
  with device file selection, a preview, and progress/error states. On success it calls the
  existing `onUpdate(publicUrl)` seam — the same one search results use.
- **FR-5 Persist as URL.** The uploaded object's **public URL** is written to
  `events.header_image_url` via the existing `updateEvent` path. No new column.
- **FR-6 Host-only write, public read.** Only the event's host may upload/replace/delete its
  banner object; anyone (incl. anon) may read it, consistent with published-event visibility.
- **FR-7 Replace & cleanup.** Replacing a banner removes the prior uploaded object (when it
  was a storage object we own); cancelled/orphaned uploads are reclaimable (§6.6).
- **FR-8 Non-regression.** Pexels/Openverse search, reposition, and fallback behavior are
  unchanged when Upload is not used.

### 5.2 Non-Functional
- **Security:** least-privilege `storage.objects` RLS; no SVG/HTML execution surface;
  metadata stripped.
- **Performance:** client normalization keeps typical banners well under ~1–2 MB; uploads
  show progress; render path unchanged.
- **Reliability:** URL persisted only after a confirmed upload; failures never blank an
  existing banner.
- **Testability:** validation/normalization are pure-ish units; service has service-level
  tests mirroring `services/*.test.ts`; RLS covered by local Supabase SQL/integration checks.
- **Consistency:** follows AGENTS.md — append-only migrations, service-layer wrapping,
  Biome-clean, tests for behavior changes.

## 6. Proposed Design

### 6.1 Storage bucket + RLS (foundation)

Create one **public-read** bucket for event banners via migration (buckets and their policies
are created in SQL, the Supabase-standard approach):

```sql
-- New bucket. Public read; writes gated by storage.objects RLS below.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-banners', 'event-banners', true,
  5 * 1024 * 1024,                                   -- 5 MB hard cap at the bucket
  ARRAY['image/jpeg','image/png','image/webp']       -- raster only; no SVG
)
ON CONFLICT (id) DO NOTHING;
```

**Path convention (namespaced by owner entity):**
`event-banners/{event_id}/{uuid}.{ext}`. The `event_id` prefix is what RLS checks, and the
random `uuid` filename makes each upload a fresh object (no cache-busting headaches, and
replace-then-delete is unambiguous).

**RLS on `storage.objects`** — write restricted to the event host, read public:

```sql
-- Read: public (bucket is public; explicit SELECT policy for clarity/anon).
CREATE POLICY "event banners are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-banners');

-- Write/replace/delete: only the host of the event named in the first path segment.
CREATE POLICY "hosts manage their event banner objects"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'event-banners'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ((storage.foldername(name))[1])::uuid
        AND e.host_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'event-banners'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ((storage.foldername(name))[1])::uuid
        AND e.host_id = auth.uid()
    )
  );
```

> Confirm the ownership column name against the events schema before writing the migration
> (`host_id` is used by the publication-state RPC; the codebase also refers to a host in a
> few spots). The policy must key off whatever column `updateEvent`/RLS already treat as
> owner so upload authz matches event-edit authz exactly.

**Generalization note.** When the next surface needs uploads (avatars, group images), it
adds its **own bucket** (e.g. `avatars`, public; or a private `attachments` bucket with
signed-URL reads) with an analogous ownership predicate. The service and validation layer
below are shared; only the bucket + RLS predicate are per-surface. We deliberately avoid one
mega-bucket so each surface's authz predicate stays simple and auditable.

### 6.2 Reusable storage service

`services/storageService.ts` — the single choke point over `supabase.storage`:

```ts
export type UploadImageOptions = {
  maxBytes?: number;            // default from bucket policy (5 MB)
  maxEdgePx?: number;           // default 2400
  mime?: readonly string[];     // default ['image/jpeg','image/png','image/webp']
  onProgress?: (fraction: number) => void;
};

export async function uploadImage(
  bucket: string,
  path: string,
  file: File,
  opts?: UploadImageOptions,
): Promise<{ path: string; publicUrl: string }> {
  validateImageFile(file, opts);              // FR-2: throws typed error on reject
  const normalized = await normalizeImage(file, opts); // FR-3: downscale + re-encode, strips EXIF
  const { error } = await supabase.storage.from(bucket).upload(path, normalized, {
    contentType: normalized.type,
    upsert: false,
  });
  if (error) throw mapStorageError(error);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function removeObject(bucket: string, path: string): Promise<void> { /* ... */ }
```

Validation (`lib/uploads/validateImageFile.ts`) and normalization
(`lib/uploads/normalizeImage.ts`) live in `lib/` because they're framework-agnostic and
reused by every surface. Normalization draws the file onto a `<canvas>` at the capped
dimensions and exports via `canvas.toBlob(type, quality)` — this both compresses and
**discards EXIF/GPS**.

### 6.3 Event banner integration (specific)

The header-image modal already abstracts "produce an image URL and hand it back":
`HeaderImageModal` → `useHeaderImageSelection({ onUpdate(imageUrl) })`
(`useHeaderImageSelection.ts:12`). Upload plugs into that seam.

- Add a **source switcher** to `HeaderImageModal` — `Search` (existing Pexels/Openverse) and
  `Upload` (new). Keep the search components untouched; render an `UploadPanel` when the
  Upload source is active.
- `UploadPanel`: device file input (`accept="image/png,image/jpeg,image/webp"`), local
  preview, validation errors, and progress. A new hook
  `useHeaderImageUpload({ eventId, onUploaded })`:
  1. builds path `${eventId}/${crypto.randomUUID()}.webp`,
  2. calls `storageService.uploadImage('event-banners', path, file, …)`,
  3. on success calls `onUpdate(publicUrl)` — the **same confirm path** search uses — so the
     value flows through `updateEvent` → `header_image_url` with zero new persistence code.
- **Reposition unchanged.** `header_image_position_y` framing in `HeroHeader` works
  identically for uploaded images.
- **Fallback unchanged.** If the URL is ever blank/dead, `HeroHeader.tsx:30` still falls back
  to the `picsum` seed.

Gate the Upload source behind the existing **feature-flag** mechanism
(`supabase/migrations/*_add_feature_flags.sql`) so it can ship dark and enable per environment.

### 6.4 Optional uploads tracking table (foundation, phase 2)

For MVP, per-event deterministic paths make objects discoverable without a table. To support
future surfaces and robust cleanup, a later phase may add:

```sql
CREATE TABLE public.uploads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket       text NOT NULL,
  path         text NOT NULL UNIQUE,
  owner_id     uuid NOT NULL REFERENCES auth.users(id),
  entity_type  text NOT NULL,            -- 'event_banner', 'avatar', ...
  entity_id    uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

This is **explicitly deferred** — called out so the MVP path convention doesn't paint us into
a corner, not built in this slice.

### 6.5 Orphan & replace cleanup

- **Replace:** when a host uploads a new banner and the previous `header_image_url` pointed at
  an object **in our bucket** (URL matches the bucket's public prefix), delete the old object
  after the new URL is saved. External URLs (Pexels/picsum) are left alone.
- **Cancelled/orphaned uploads:** because paths are `event-banners/{event_id}/…`, a scheduled
  job (Supabase scheduled function / `pg_cron`, consistent with the notification reminder
  scanner already in the tree) lists objects whose `event_id` prefix has no event, or whose
  object URL isn't referenced by that event's `header_image_url`, and removes those older than
  a grace window (e.g. 24h). Log counts; never delete inside the grace window.

## 7. Migration Plan (append-only)
1. **Migration A** — create the `event-banners` bucket (public, 5 MB, raster MIME allowlist).
2. **Migration B** — `storage.objects` policies: public SELECT + host-only ALL keyed on the
   `event_id` path segment (verify owner column first).
3. **Feature flag** — add an `event_banner_upload` flag (default off) reusing the existing
   feature-flag migration pattern.
4. Follow AGENTS.md §6: fresh timestamps after `20260717000200_*`, never edit prior migrations.
5. (Phase 2, separate PRD/slice) `uploads` tracking table + cleanup job — not in MVP.

## 8. Rollout Plan
1. Ship migrations + service + gated Upload panel to staging with the flag **off**.
2. Enable the flag in staging; verify a host can upload, the banner renders, reposition works,
   and a non-host is denied by RLS. Confirm search/fallback unaffected with the flag on and off.
3. Enable in production for a subset, watch storage growth and error rates, then general enable.
4. Kill switch: disabling the flag reverts hosts to search-only with no data loss (existing
   `header_image_url` values, uploaded or external, keep rendering).

## 9. Test Plan
- **Unit (`lib/uploads/`):** `validateImageFile` rejects SVG/oversized/wrong-MIME and accepts
  allowed types; `normalizeImage` caps dimensions and outputs the target type (EXIF-strip
  asserted via a fixture with known EXIF).
- **Service (`services/storageService.test.ts`):** mirrors existing `services/*.test.ts`;
  mocks `supabase.storage`; asserts path building, `upsert:false`, `getPublicUrl` usage, and
  typed error mapping.
- **Component/hook:** `useHeaderImageUpload` happy path calls `onUpdate(publicUrl)`; failed
  upload surfaces an error and does **not** call `onUpdate`; modal source-switch renders
  search vs upload without breaking the existing search flow.
- **SQL/integration (local Supabase):**
  - Host uploads to `event-banners/{ownEventId}/…` → allowed.
  - Non-host uploads to another event's prefix → **denied** by RLS.
  - Anon/any `SELECT` on an `event-banners` object → allowed (public read).
  - Bucket rejects a >5 MB file and a disallowed MIME type.
- **Regression:** header search picker, reposition (`header_image_position_y`), and
  `picsum` fallback unchanged; `updateEvent` still persists the URL.
- Full chain: `pnpm run lint && pnpm run types && pnpm test -- --run && pnpm run build`.

## 10. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| SVG/polyglot stored-XSS | Raster-only MIME allowlist at bucket **and** client; Supabase serves storage from a separate origin; no SVG/HTML accepted. |
| GPS/EXIF privacy leak from phone photos | Canvas re-encode drops metadata before upload; never upload the raw `File`. |
| Non-host overwrites a banner | `storage.objects` RLS predicate matches event-edit ownership via the `event_id` path segment. |
| Wrong owner column in RLS | Verify the events owner column (`host_id`) against schema/`updateEvent` before writing the policy; keep upload authz identical to edit authz. |
| Orphaned/abandoned objects inflate storage | Deterministic per-event paths + grace-window cleanup job; delete prior object on replace. |
| Storage cost/DoS via large or many files | 5 MB bucket cap + client size/dimension limits; per-user quota noted as a follow-up. |
| Failed upload blanks an existing banner | Persist URL only after confirmed success; existing fallback covers any dead `src`. |
| Migration ordering drift after rebase | Fresh timestamps per AGENTS.md §6; do not edit prior migrations. |
| Scope creep into a general DAM | Ship one bucket + one consumer; `uploads` table and extra surfaces are explicitly deferred. |

## 11. Open Questions
1. **Store URL or path?** MVP stores the full public URL in `header_image_url` (zero render
   change). Do we instead want to store the storage **path** and resolve URLs at read time
   (more portable if the bucket/CDN domain ever changes)? Trade-off: a render-layer change.
2. **Public bucket vs signed URLs?** Events are publicly viewable when published, so a public
   bucket is simplest. Do unpublished/private events need banner reads gated behind signed
   URLs?
3. **Size/dimension targets.** Is 5 MB / 2400px long-edge / WebP the right default, or should
   we target a tighter banner budget (e.g. 1600px)?
4. **Cleanup mechanism.** Reuse the notifications reminder scanner's scheduling approach, or a
   dedicated Supabase scheduled function? (Affects where the cleanup job lives.)
5. **Content moderation.** Do we need any moderation/report path before enabling
   user-uploaded imagery in production, even without automated detection?
6. **Do we backfill Pexels/picsum banners into storage?** Default: no — leave external URLs
   as-is; only new uploads use storage.

## 12. Milestones
- **M1 — Foundation:** `event-banners` bucket + `storage.objects` RLS + `storageService.ts` +
  `lib/uploads/` validation/normalization, with unit/service/SQL tests. No UI yet.
- **M2 — Banner upload UX:** Upload source in `HeaderImageModal`, `useHeaderImageUpload`,
  wired through the existing `onUpdate → updateEvent` seam, behind the feature flag.
- **M3 — Cleanup & replace:** delete-prior-on-replace + orphan cleanup job; storage metrics.
- **M4 — Generalize:** document the bucket-per-surface recipe; (separate slice) `uploads`
  table + second consumer (avatars) as validation that the foundation is truly reusable.
