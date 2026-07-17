-- Feature flag gating the device-upload source in the event header-image
-- picker. Ships dark (disabled) so it can be enabled per environment.
INSERT INTO public.feature_flags (key, enabled, description)
VALUES (
  'eventBannerUpload',
  false,
  'Controls the upload-from-device source in the event header image picker.'
)
ON CONFLICT (key) DO NOTHING;
