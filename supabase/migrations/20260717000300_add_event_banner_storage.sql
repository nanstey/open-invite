-- Event banner uploads: a public-read storage bucket plus least-privilege
-- write policies. Reads are public (events are publicly viewable when
-- published); writes/replaces/deletes are restricted to the event host.
--
-- Path convention: event-banners/{event_id}/{uuid}.webp
-- The first path segment is the event id, which the write policy checks.

-- 1) Bucket: public read, raster-only, 5 MB hard cap on the raw upload.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-banners',
  'event-banners',
  true,
  5 * 1024 * 1024,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2) Read: anyone (incl. anon) may read objects in this bucket.
DROP POLICY IF EXISTS "event banners are publicly readable" ON storage.objects;
CREATE POLICY "event banners are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-banners');

-- 3) Write/replace/delete: only the host of the event named in the first
-- path segment. Applies to INSERT/UPDATE/DELETE via USING + WITH CHECK.
DROP POLICY IF EXISTS "hosts manage their event banner objects" ON storage.objects;
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
