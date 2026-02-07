CREATE TABLE public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_comment_reactions_comment_id ON public.comment_reactions(comment_id);
CREATE INDEX idx_comment_reactions_user_id ON public.comment_reactions(user_id);

ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions on visible comments"
  ON public.comment_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.comments
      INNER JOIN public.events ON events.id = comments.event_id
      WHERE comments.id = comment_reactions.comment_id
        AND (
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

CREATE POLICY "Users can create comment reactions"
  ON public.comment_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1
      FROM public.comments
      INNER JOIN public.events ON events.id = comments.event_id
      WHERE comments.id = comment_reactions.comment_id
        AND (
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

CREATE POLICY "Users can delete their own comment reactions"
  ON public.comment_reactions FOR DELETE
  USING (auth.uid() = user_id);
