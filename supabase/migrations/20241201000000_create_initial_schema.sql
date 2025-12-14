-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;

-- Create enum types matching TypeScript enums
CREATE TYPE event_visibility_type AS ENUM ('ALL_FRIENDS', 'GROUPS', 'INVITE_ONLY');
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  visibility_type event_visibility_type NOT NULL DEFAULT 'ALL_FRIENDS',
  max_seats INTEGER,
  no_phones BOOLEAN NOT NULL DEFAULT false,
  allow_friend_invites BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event attendees (many-to-many relationship)
CREATE TABLE public.event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reactions table (for emoji reactions on events)
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id, emoji)
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Groups table (user-created groups with per-user uniqueness)
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_open BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(created_by, name)
);

-- User groups table (for group memberships) - OLD VERSION (will be replaced)
CREATE TABLE public.user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_type event_group NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, group_type)
);

-- Event groups table (many-to-many relationship for GROUPS visibility) - OLD VERSION (will be replaced)
CREATE TABLE public.event_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  group_type event_group NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, group_type)
);

-- Event invites table (for INVITE_ONLY visibility)
CREATE TABLE public.event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create indexes for common queries
CREATE INDEX idx_events_host_id ON public.events(host_id);
CREATE INDEX idx_events_start_time ON public.events(start_time);
CREATE INDEX idx_events_visibility_type ON public.events(visibility_type);
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
CREATE INDEX idx_groups_created_by ON public.groups(created_by);
CREATE INDEX idx_groups_name ON public.groups(name);
CREATE INDEX idx_groups_deleted_at ON public.groups(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_groups_user_id ON public.user_groups(user_id);
CREATE INDEX idx_event_groups_event_id ON public.event_groups(event_id);
CREATE INDEX idx_event_groups_group_type ON public.event_groups(group_type);
CREATE INDEX idx_event_invites_event_id ON public.event_invites(event_id);
CREATE INDEX idx_event_invites_user_id ON public.event_invites(user_id);

-- Migration: Convert enum-based groups to table-based groups
-- Step 1: Create groups from existing user_groups data
-- For each unique (user_id, group_type) combination, create a group for that user
INSERT INTO public.groups (name, created_by, is_open)
SELECT DISTINCT 
  ug.group_type::TEXT as name,
  ug.user_id as created_by,
  false as is_open
FROM public.user_groups ug
WHERE ug.group_type != 'ALL_FRIENDS'  -- Skip ALL_FRIENDS as it's not a real group
  AND NOT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.name = ug.group_type::TEXT AND g.created_by = ug.user_id
  )
ON CONFLICT (created_by, name) DO NOTHING;

-- Step 2: Create new user_groups table with group_id reference
CREATE TABLE public.user_groups_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, group_id),
  CHECK (role IN ('MEMBER', 'ADMIN'))
);

-- Step 3: Migrate user_groups data to new table
INSERT INTO public.user_groups_new (user_id, group_id, role, joined_at, created_at)
SELECT 
  ug.user_id,
  g.id as group_id,
  CASE WHEN g.created_by = ug.user_id THEN 'ADMIN' ELSE 'MEMBER' END as role,
  ug.created_at as joined_at,
  ug.created_at
FROM public.user_groups ug
INNER JOIN public.groups g ON g.name = ug.group_type::TEXT AND g.created_by = ug.user_id
WHERE ug.group_type != 'ALL_FRIENDS'
ON CONFLICT (user_id, group_id) DO NOTHING;

-- Step 4: Create new event_groups table with group_id reference
CREATE TABLE public.event_groups_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, group_id)
);

-- Step 5: Migrate event_groups data to new table
-- Link events to groups created by the event host
INSERT INTO public.event_groups_new (event_id, group_id, created_at)
SELECT 
  eg.event_id,
  g.id as group_id,
  eg.created_at
FROM public.event_groups eg
INNER JOIN public.events e ON e.id = eg.event_id
INNER JOIN public.groups g ON g.name = eg.group_type::TEXT AND g.created_by = e.host_id
WHERE eg.group_type != 'ALL_FRIENDS'
ON CONFLICT (event_id, group_id) DO NOTHING;

-- Step 6: Swap tables (drop old, rename new)
DROP TABLE IF EXISTS public.user_groups;
DROP TABLE IF EXISTS public.event_groups;
ALTER TABLE public.user_groups_new RENAME TO user_groups;
ALTER TABLE public.event_groups_new RENAME TO event_groups;

-- Step 7: Create indexes on new tables
CREATE INDEX idx_user_groups_user_id_new ON public.user_groups(user_id);
CREATE INDEX idx_user_groups_group_id ON public.user_groups(group_id);
CREATE INDEX idx_user_groups_role ON public.user_groups(group_id, role);
CREATE INDEX idx_event_groups_event_id_new ON public.event_groups(event_id);
CREATE INDEX idx_event_groups_group_id ON public.event_groups(group_id);

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

CREATE TRIGGER set_updated_at_groups
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create SECURITY DEFINER function to check if user can view an event
-- This avoids recursion by bypassing RLS when querying event_groups
-- Function is owned by postgres (default) which bypasses RLS
CREATE OR REPLACE FUNCTION public.can_view_event(event_id_param UUID, event_host_id_param UUID, event_visibility_param event_visibility_type, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Host can always view
  IF event_host_id_param = user_id_param THEN
    RETURN true;
  END IF;
  
  -- Check visibility based on type
  IF event_visibility_param = 'ALL_FRIENDS' THEN
    -- Check if users are friends
    RETURN EXISTS (
      SELECT 1 FROM public.user_friends
      WHERE (user_id = user_id_param AND friend_id = event_host_id_param)
         OR (user_id = event_host_id_param AND friend_id = user_id_param)
    );
  ELSIF event_visibility_param = 'GROUPS' THEN
    -- For GROUPS visibility, check if user is in any group for this event
    -- Query event_groups directly - SECURITY DEFINER should bypass RLS
    -- If RLS is still triggered, can_view_event_group will handle it without recursion
    RETURN EXISTS (
      SELECT 1 FROM public.event_groups eg
      INNER JOIN public.user_groups ug ON ug.group_id = eg.group_id
      INNER JOIN public.groups g ON g.id = eg.group_id
      WHERE eg.event_id = event_id_param
        AND ug.user_id = user_id_param
        AND g.deleted_at IS NULL
    );
  ELSIF event_visibility_param = 'INVITE_ONLY' THEN
    -- Check if user is invited
    RETURN EXISTS (
      SELECT 1 FROM public.event_invites
      WHERE event_id = event_id_param AND user_id = user_id_param
    );
  END IF;
  
  RETURN false;
END;
$$;

-- Grant necessary permissions to the function owner to ensure RLS bypass works
-- The function owner (postgres) should already have these, but we make it explicit
GRANT SELECT ON public.events TO postgres;
GRANT SELECT ON public.event_groups TO postgres;
GRANT SELECT ON public.user_groups TO postgres;
GRANT SELECT ON public.groups TO postgres;
GRANT SELECT ON public.user_friends TO postgres;
GRANT SELECT ON public.event_invites TO postgres;

-- Create SECURITY DEFINER function to check if user can view an event_groups row
-- This avoids recursion by not querying events at all - just check group membership
-- Host checks are handled at the events policy level, so we don't need to check here
CREATE OR REPLACE FUNCTION public.can_view_event_group(event_id_param UUID, group_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For event_groups, user can view if they are in the group
  -- We don't query events to avoid any potential recursion
  -- The events policy already handles host checks and other visibility checks
  RETURN EXISTS (
    SELECT 1 FROM public.user_groups ug
    INNER JOIN public.groups g ON g.id = ug.group_id
    WHERE ug.group_id = group_id_param
      AND ug.user_id = user_id_param
      AND g.deleted_at IS NULL
  );
END;
$$;

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

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
-- Use SECURITY DEFINER function to avoid infinite recursion with event_groups
CREATE POLICY "Users can view events based on visibility"
  ON public.events FOR SELECT
  USING (public.can_view_event(id, host_id, visibility_type, auth.uid()));

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
        events.host_id = auth.uid() OR
        (
          events.visibility_type = 'ALL_FRIENDS' AND
          EXISTS (
            SELECT 1 FROM public.user_friends
            WHERE (user_id = auth.uid() AND friend_id = events.host_id)
               OR (user_id = events.host_id AND friend_id = auth.uid())
          )
        ) OR
        (
          events.visibility_type = 'GROUPS' AND
          EXISTS (
            SELECT 1 FROM public.event_groups eg
            INNER JOIN public.user_groups ug ON ug.group_id = eg.group_id
            INNER JOIN public.groups g ON g.id = eg.group_id
            WHERE eg.event_id = events.id 
              AND ug.user_id = auth.uid()
              AND g.deleted_at IS NULL
          )
        ) OR
        (
          events.visibility_type = 'INVITE_ONLY' AND
          EXISTS (
            SELECT 1 FROM public.event_invites
            WHERE event_id = events.id AND user_id = auth.uid()
          )
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
      WHERE events.id = event_attendees.event_id AND (
        events.visibility_type = 'ALL_FRIENDS' OR
        events.visibility_type = 'GROUPS' OR
        EXISTS (
          SELECT 1 FROM public.event_invites
          WHERE event_id = events.id AND user_id = auth.uid()
        )
      )
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
        events.host_id = auth.uid() OR
        (
          events.visibility_type = 'ALL_FRIENDS' AND
          EXISTS (
            SELECT 1 FROM public.user_friends
            WHERE (user_id = auth.uid() AND friend_id = events.host_id)
               OR (user_id = events.host_id AND friend_id = auth.uid())
          )
        ) OR
        (
          events.visibility_type = 'GROUPS' AND
          EXISTS (
            SELECT 1 FROM public.event_groups eg
            INNER JOIN public.user_groups ug ON ug.group_id = eg.group_id
            INNER JOIN public.groups g ON g.id = eg.group_id
            WHERE eg.event_id = events.id 
              AND ug.user_id = auth.uid()
              AND g.deleted_at IS NULL
          )
        ) OR
        (
          events.visibility_type = 'INVITE_ONLY' AND
          EXISTS (
            SELECT 1 FROM public.event_invites
            WHERE event_id = events.id AND user_id = auth.uid()
          )
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
        events.host_id = auth.uid() OR
        (
          events.visibility_type = 'ALL_FRIENDS' AND
          EXISTS (
            SELECT 1 FROM public.user_friends
            WHERE (user_id = auth.uid() AND friend_id = events.host_id)
               OR (user_id = events.host_id AND friend_id = auth.uid())
          )
        ) OR
        (
          events.visibility_type = 'GROUPS' AND
          EXISTS (
            SELECT 1 FROM public.event_groups eg
            INNER JOIN public.user_groups ug ON ug.group_id = eg.group_id
            INNER JOIN public.groups g ON g.id = eg.group_id
            WHERE eg.event_id = events.id 
              AND ug.user_id = auth.uid()
              AND g.deleted_at IS NULL
          )
        ) OR
        (
          events.visibility_type = 'INVITE_ONLY' AND
          EXISTS (
            SELECT 1 FROM public.event_invites
            WHERE event_id = events.id AND user_id = auth.uid()
          )
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
        events.host_id = auth.uid() OR
        (
          events.visibility_type = 'ALL_FRIENDS' AND
          EXISTS (
            SELECT 1 FROM public.user_friends
            WHERE (user_id = auth.uid() AND friend_id = events.host_id)
               OR (user_id = events.host_id AND friend_id = auth.uid())
          )
        ) OR
        (
          events.visibility_type = 'GROUPS' AND
          EXISTS (
            SELECT 1 FROM public.event_groups eg
            INNER JOIN public.user_groups ug ON ug.group_id = eg.group_id
            INNER JOIN public.groups g ON g.id = eg.group_id
            WHERE eg.event_id = events.id 
              AND ug.user_id = auth.uid()
              AND g.deleted_at IS NULL
          )
        ) OR
        (
          events.visibility_type = 'INVITE_ONLY' AND
          EXISTS (
            SELECT 1 FROM public.event_invites
            WHERE event_id = events.id AND user_id = auth.uid()
          )
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
        events.host_id = auth.uid() OR
        (
          events.visibility_type = 'ALL_FRIENDS' AND
          EXISTS (
            SELECT 1 FROM public.user_friends
            WHERE (user_id = auth.uid() AND friend_id = events.host_id)
               OR (user_id = events.host_id AND friend_id = auth.uid())
          )
        ) OR
        (
          events.visibility_type = 'GROUPS' AND
          EXISTS (
            SELECT 1 FROM public.event_groups eg
            INNER JOIN public.user_groups ug ON ug.group_id = eg.group_id
            INNER JOIN public.groups g ON g.id = eg.group_id
            WHERE eg.event_id = events.id 
              AND ug.user_id = auth.uid()
              AND g.deleted_at IS NULL
          )
        ) OR
        (
          events.visibility_type = 'INVITE_ONLY' AND
          EXISTS (
            SELECT 1 FROM public.event_invites
            WHERE event_id = events.id AND user_id = auth.uid()
          )
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

-- Groups policies
CREATE POLICY "Users can view accessible groups"
  ON public.groups FOR SELECT
  USING (
    deleted_at IS NULL AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.user_groups
        WHERE group_id = groups.id AND user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update groups"
  ON public.groups FOR UPDATE
  USING (
    deleted_at IS NULL AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.user_groups
        WHERE group_id = groups.id AND user_id = auth.uid() AND role = 'ADMIN'
      )
    )
  );

-- User groups policies
CREATE POLICY "Users can view accessible group memberships"
  ON public.user_groups FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = user_groups.group_id 
        AND groups.deleted_at IS NULL AND (
        groups.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.user_groups ug
          WHERE ug.group_id = groups.id AND ug.user_id = auth.uid() AND ug.role = 'ADMIN'
        )
      )
    )
  );

CREATE POLICY "Users can join groups"
  ON public.user_groups FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = user_groups.group_id 
        AND groups.deleted_at IS NULL AND (
        groups.created_by = auth.uid() OR
        groups.is_open = true OR
        EXISTS (
          SELECT 1 FROM public.user_groups ug
          WHERE ug.group_id = groups.id AND ug.user_id = auth.uid() AND ug.role = 'ADMIN'
        )
      )
    )
  );

CREATE POLICY "Users can manage group memberships"
  ON public.user_groups FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = user_groups.group_id 
        AND groups.deleted_at IS NULL AND (
        groups.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.user_groups ug
          WHERE ug.group_id = groups.id AND ug.user_id = auth.uid() AND ug.role = 'ADMIN'
        )
      )
    )
  );

CREATE POLICY "Admins can update roles"
  ON public.user_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = user_groups.group_id 
        AND groups.deleted_at IS NULL AND (
        groups.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.user_groups ug
          WHERE ug.group_id = groups.id AND ug.user_id = auth.uid() AND ug.role = 'ADMIN'
        )
      )
    )
  );

-- Event groups policies
-- Use SECURITY DEFINER function to avoid infinite recursion
CREATE POLICY "Users can view event groups for visible events"
  ON public.event_groups FOR SELECT
  USING (public.can_view_event_group(event_id, group_id, auth.uid()));

CREATE POLICY "Hosts can manage event groups"
  ON public.event_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_groups.event_id AND events.host_id = auth.uid()
    )
  );

-- Event invites policies
CREATE POLICY "Users can view their own invitations"
  ON public.event_invites FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Hosts can view invitations for their events"
  ON public.event_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_invites.event_id AND events.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts and attending friends can create invitations"
  ON public.event_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_invites.event_id AND (
        events.host_id = auth.uid() OR
        (
          events.allow_friend_invites = true AND
          EXISTS (
            SELECT 1 FROM public.event_attendees
            WHERE event_id = events.id AND user_id = auth.uid()
          ) AND
          event_invites.invited_by = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete their own invitations"
  ON public.event_invites FOR DELETE
  USING (user_id = auth.uid());

