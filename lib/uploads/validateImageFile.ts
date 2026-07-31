import { ALLOWED_IMAGE_MIME, MAX_UPLOAD_BYTES } from './constants';
import { UploadError } from './errors';

export type ValidateImageOptions = {
  /** Allowed MIME types. Defaults to the raster allowlist. */
  mime?: readonly string[];
  /** Maximum raw file size in bytes. Defaults to the bucket cap. */
  maxBytes?: number;
};

function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return Number.isInteger(mb) ? `${mb}MB` : `${mb.toFixed(1)}MB`;
}

/**
 * Validate a user-selected image file before upload. Throws an UploadError
 * with a user-facing message on the first failure; returns void when valid.
 *
 * This is intentionally pure (no DOM/canvas) so it runs identically in the
 * browser and under test.
 */
export function validateImageFile(file: File, opts?: ValidateImageOptions): void {
  const allowed = opts?.mime ?? ALLOWED_IMAGE_MIME;
  const maxBytes = opts?.maxBytes ?? MAX_UPLOAD_BYTES;

  if (!file || file.size === 0) {
    throw new UploadError('empty', 'Choose an image file.');
  }

  if (!allowed.includes(file.type)) {
    const labels = allowed.map(type => type.replace('image/', '').toUpperCase()).join(', ');
    throw new UploadError('invalid-type', `Unsupported image type. Use ${labels}.`);
  }

  if (file.size > maxBytes) {
    throw new UploadError(
      'too-large',
      `Image is too large. Max size is ${formatMegabytes(maxBytes)}.`
    );
  }
}
