-- Add user profile customization fields: username, bio, location, pronouns,
-- social links, and profile visibility.
-- Append-only migration (see AGENTS.md §6).

ALTER TABLE public.user_profiles
  ADD COLUMN username TEXT,
  ADD COLUMN bio TEXT,
  ADD COLUMN location TEXT,
  ADD COLUMN pronouns TEXT,
  ADD COLUMN social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN profile_visibility TEXT NOT NULL DEFAULT 'private';

-- Backfill a unique username for every existing profile.
-- 1. Slugify the display name into the allowed [a-z0-9_] alphabet.
-- 2. Trim stray underscores and cap the base length.
-- 3. Guarantee a minimum length, then de-duplicate with a numeric suffix.
WITH slugged AS (
  SELECT
    id,
    COALESCE(
      NULLIF(
        regexp_replace(
          regexp_replace(lower(name), '[^a-z0-9_]+', '_', 'g'),
          '^_+|_+$', '', 'g'
        ),
        ''
      ),
      'user'
    ) AS base
  FROM public.user_profiles
),
capped AS (
  SELECT
    id,
    CASE
      WHEN char_length(base) < 3 THEN base || '_user'
      ELSE substring(base FROM 1 FOR 24)
    END AS base
  FROM slugged
),
numbered AS (
  SELECT
    id,
    base,
    row_number() OVER (PARTITION BY lower(base) ORDER BY id) AS rn
  FROM capped
)
UPDATE public.user_profiles p
SET username = CASE
  WHEN n.rn = 1 THEN n.base
  ELSE n.base || '_' || n.rn
END
FROM numbered n
WHERE p.id = n.id;

-- Enforce constraints now that the column is populated.
ALTER TABLE public.user_profiles
  ALTER COLUMN username SET NOT NULL,
  ADD CONSTRAINT user_profiles_username_format
    CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  ADD CONSTRAINT user_profiles_bio_len
    CHECK (bio IS NULL OR char_length(bio) <= 300),
  ADD CONSTRAINT user_profiles_location_len
    CHECK (location IS NULL OR char_length(location) <= 100),
  ADD CONSTRAINT user_profiles_pronouns_len
    CHECK (pronouns IS NULL OR char_length(pronouns) <= 40),
  ADD CONSTRAINT user_profiles_visibility
    CHECK (profile_visibility IN ('public', 'private'));

-- Case-insensitive uniqueness for usernames.
CREATE UNIQUE INDEX user_profiles_username_lower_idx
  ON public.user_profiles (lower(username));
