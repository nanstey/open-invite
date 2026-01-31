-- Create project status enum with all stages for kanban
CREATE TYPE feedback_project_status AS ENUM ('backlog', 'on_deck', 'in_progress', 'review', 'completed', 'archived');

-- Create feedback_projects table
CREATE TABLE public.feedback_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status feedback_project_status NOT NULL DEFAULT 'on_deck',
  github_repo TEXT,
  github_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_feedback_projects_status ON public.feedback_projects(status);
CREATE INDEX idx_feedback_projects_created_at ON public.feedback_projects(created_at);

-- Add updated_at trigger
CREATE TRIGGER set_updated_at_feedback_projects
  BEFORE UPDATE ON public.feedback_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create simplified feedback_project_items table (links feedback to projects)
-- Projects move across status columns, feedback items are just linked to projects
CREATE TABLE public.feedback_project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.feedback_projects(id) ON DELETE CASCADE,
  feedback_id UUID NOT NULL REFERENCES public.user_feedback(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- A feedback item can only be in one project once
  UNIQUE(project_id, feedback_id)
);

-- Create indexes
CREATE INDEX idx_feedback_project_items_project_id ON public.feedback_project_items(project_id);
CREATE INDEX idx_feedback_project_items_feedback_id ON public.feedback_project_items(feedback_id);

-- Enable RLS on all tables
ALTER TABLE public.feedback_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_project_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin-only access for all project tables

-- feedback_projects policies
CREATE POLICY "Admins can view all projects"
  ON public.feedback_projects FOR SELECT
  USING (public.is_current_user_admin());

CREATE POLICY "Admins can insert projects"
  ON public.feedback_projects FOR INSERT
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update projects"
  ON public.feedback_projects FOR UPDATE
  USING (public.is_current_user_admin());

CREATE POLICY "Admins can delete projects"
  ON public.feedback_projects FOR DELETE
  USING (public.is_current_user_admin());

-- feedback_project_items policies
CREATE POLICY "Admins can view all project items"
  ON public.feedback_project_items FOR SELECT
  USING (public.is_current_user_admin());

CREATE POLICY "Admins can insert project items"
  ON public.feedback_project_items FOR INSERT
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can delete project items"
  ON public.feedback_project_items FOR DELETE
  USING (public.is_current_user_admin());

-- Auto-assign admin privileges to specific email addresses on user profile creation

-- Create a function that sets is_admin = true for specific emails
CREATE OR REPLACE FUNCTION public.set_admin_for_allowed_emails()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  admin_emails TEXT[] := ARRAY[
    'anstey.method@gmail.com',
    'rachel.goodwin09@gmail.com',
    'ansteyng@gmail.com'
  ];
BEGIN
  -- Get the user's email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;
  
  -- If the email is in our admin list, set is_admin to true
  IF user_email = ANY(admin_emails) THEN
    NEW.is_admin := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires before insert on user_profiles
DROP TRIGGER IF EXISTS set_admin_on_profile_create ON public.user_profiles;
CREATE TRIGGER set_admin_on_profile_create
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_admin_for_allowed_emails();

-- Also update any existing users with these emails to be admins
UPDATE public.user_profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'anstey.method@gmail.com',
    'rachel.goodwin09@gmail.com',
    'ansteyng@gmail.com'
  )
);
