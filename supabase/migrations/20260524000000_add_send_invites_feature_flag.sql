INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('sendInvites', false, 'Controls visibility of the send invites flow.')
ON CONFLICT (key) DO NOTHING;
