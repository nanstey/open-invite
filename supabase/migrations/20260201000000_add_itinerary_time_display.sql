-- Add itinerary_time_display column to events table
-- This stores the user's preference for how itinerary times are displayed
-- 'START_ONLY' = show only start times, 'START_AND_END' = show start and end times

ALTER TABLE public.events
ADD COLUMN itinerary_time_display TEXT NOT NULL DEFAULT 'START_AND_END';

-- Add a check constraint for valid values
ALTER TABLE public.events
ADD CONSTRAINT events_itinerary_time_display_check
CHECK (itinerary_time_display IN ('START_ONLY', 'START_AND_END'));

