-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types matching TypeScript enums
CREATE TYPE event_privacy AS ENUM ('OPEN', 'INVITE_ONLY');
CREATE TYPE event_group AS ENUM ('ALL_FRIENDS', 'CLIMBERS', 'FAMILY', 'WORK');
CREATE TYPE notification_type AS ENUM ('INVITE', 'COMMENT', 'REACTION', 'REMINDER', 'SYSTEM');

-- User profiles table (extends auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  location TEXT NOT NULL,
  coordinates JSONB NOT NULL DEFAULT '{"lat": 0, "lng": 0}'::jsonb,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  is_flexible_start BOOLEAN NOT NULL DEFAULT false,
  is_flexible_end BOOLEAN NOT NULL DEFAULT false,
  privacy event_privacy NOT NULL DEFAULT 'OPEN',
  target_group event_group NOT NULL DEFAULT 'ALL_FRIENDS',
  max_seats INTEGER,
  no_phones BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event attendees (many-to-many relationship)
CREATE TABLE public.event_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reactions table (for emoji reactions on events)
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id, emoji)
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  related_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User friends table (many-to-many relationship)
CREATE TABLE public.user_friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- User groups table (for group memberships)
CREATE TABLE public.user_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_type event_group NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, group_type)
);

-- Create indexes for common queries
CREATE INDEX idx_events_host_id ON public.events(host_id);
CREATE INDEX idx_events_start_time ON public.events(start_time);
CREATE INDEX idx_events_privacy ON public.events(privacy);
CREATE INDEX idx_events_target_group ON public.events(target_group);
CREATE INDEX idx_event_attendees_event_id ON public.event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON public.event_attendees(user_id);
CREATE INDEX idx_comments_event_id ON public.comments(event_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_reactions_event_id ON public.reactions(event_id);
CREATE INDEX idx_reactions_user_id ON public.reactions(user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_timestamp ON public.notifications(timestamp);
CREATE INDEX idx_user_friends_user_id ON public.user_friends(user_id);
CREATE INDEX idx_user_friends_friend_id ON public.user_friends(friend_id);
CREATE INDEX idx_user_groups_user_id ON public.user_groups(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER set_updated_at_user_profiles
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_events
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Events policies
CREATE POLICY "Users can view events based on privacy"
  ON public.events FOR SELECT
  USING (
    privacy = 'OPEN'::event_privacy OR
    host_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.event_attendees
      WHERE event_id = events.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Users can update their own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Users can delete their own events"
  ON public.events FOR DELETE
  USING (auth.uid() = host_id);

-- Event attendees policies
CREATE POLICY "Users can view attendees of visible events"
  ON public.event_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_attendees.event_id AND (
        events.privacy = 'OPEN'::event_privacy OR
        events.host_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.event_attendees ea
          WHERE ea.event_id = events.id AND ea.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can join events"
  ON public.event_attendees FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_attendees.event_id AND
      events.privacy = 'OPEN'::event_privacy
    )
  );

CREATE POLICY "Users can leave events"
  ON public.event_attendees FOR DELETE
  USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Users can view comments on visible events"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = comments.event_id AND (
        events.privacy = 'OPEN'::event_privacy OR
        events.host_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.event_attendees
          WHERE event_id = events.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = comments.event_id AND (
        events.privacy = 'OPEN'::event_privacy OR
        EXISTS (
          SELECT 1 FROM public.event_attendees
          WHERE event_id = events.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- Reactions policies
CREATE POLICY "Users can view reactions on visible events"
  ON public.reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = reactions.event_id AND (
        events.privacy = 'OPEN'::event_privacy OR
        events.host_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.event_attendees
          WHERE event_id = events.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create reactions"
  ON public.reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = reactions.event_id AND (
        events.privacy = 'OPEN'::event_privacy OR
        EXISTS (
          SELECT 1 FROM public.event_attendees
          WHERE event_id = events.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete their own reactions"
  ON public.reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- User friends policies
CREATE POLICY "Users can view their own friendships"
  ON public.user_friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
  ON public.user_friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own friendships"
  ON public.user_friends FOR DELETE
  USING (auth.uid() = user_id);

-- User groups policies
CREATE POLICY "Users can view all group memberships"
  ON public.user_groups FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own group memberships"
  ON public.user_groups FOR ALL
  USING (auth.uid() = user_id);

