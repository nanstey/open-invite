// Shared constants for the file-upload foundation.
// Keep these in sync with the bucket policy in
// supabase/migrations/*_add_event_banner_storage.sql.

/** Storage bucket that holds uploaded event banner images (public read). */
export const EVENT_BANNER_BUCKET = 'event-banners';

/** Raster image MIME types we accept for upload. SVG/HTML are deliberately excluded. */
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Hard cap on the raw (pre-normalization) upload size. Mirrors the bucket policy. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

/** Longest edge (px) a normalized banner is downscaled to before upload. */
export const BANNER_MAX_EDGE_PX = 1600;

/** WebP quality used when re-encoding normalized banners. */
export const BANNER_WEBP_QUALITY = 0.82;
