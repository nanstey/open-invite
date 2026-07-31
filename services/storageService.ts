import { supabase } from '../lib/supabase';
import { EVENT_BANNER_BUCKET } from '../lib/uploads/constants';
import { UploadError } from '../lib/uploads/errors';
import { type NormalizeImageOptions, normalizeImage } from '../lib/uploads/normalizeImage';
import { type ValidateImageOptions, validateImageFile } from '../lib/uploads/validateImageFile';

export type UploadImageOptions = ValidateImageOptions & NormalizeImageOptions;

export type UploadImageResult = {
  path: string;
  publicUrl: string;
};

/**
 * Validate, normalize, and upload an image to a public Storage bucket.
 *
 * This is the single choke point over `supabase.storage` for image uploads:
 * every surface (event banners today, avatars/groups later) goes through here
 * so validation, EXIF stripping, and error mapping stay centralized. Returns
 * the object's path and its public URL. Throws an UploadError on any failure.
 */
export async function uploadImage(
  bucket: string,
  path: string,
  file: File,
  opts?: UploadImageOptions
): Promise<UploadImageResult> {
  validateImageFile(file, opts);
  const normalized = await normalizeImage(file, opts);

  const { error } = await supabase.storage.from(bucket).upload(path, normalized, {
    contentType: normalized.type,
    upsert: false,
  });
  if (error) {
    throw new UploadError('upload-failed', error.message || 'Upload failed. Try again.');
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** Remove an object from a bucket. Throws an UploadError on failure. */
export async function removeObject(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw new UploadError('upload-failed', error.message || 'Could not remove the file.');
  }
}

/** Build the deterministic storage path for an event's banner object. */
export function buildEventBannerPath(eventId: string): string {
  return `${eventId}/${crypto.randomUUID()}.webp`;
}

/**
 * If `publicUrl` points at an object in the given bucket, return its storage
 * path; otherwise return null (e.g. external Pexels/picsum URLs). Used to tell
 * uploaded banners apart from external ones for replace/cleanup.
 */
export function storagePathFromPublicUrl(bucket: string, publicUrl: string): string | null {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  const path = publicUrl.slice(index + marker.length);
  return path ? decodeURIComponent(path) : null;
}

export { EVENT_BANNER_BUCKET };
