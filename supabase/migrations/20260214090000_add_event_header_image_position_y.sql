-- Add optional vertical object-position for event header image.
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS header_image_position_y INTEGER;
