-- Add optional header/cover image URL for event hero + OG image.
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS header_image_url TEXT;


