import { BANNER_MAX_EDGE_PX, BANNER_WEBP_QUALITY } from './constants';
import { UploadError } from './errors';

export type NormalizeImageOptions = {
  /** Longest edge (px) the output is downscaled to. Defaults to the banner max. */
  maxEdgePx?: number;
  /** WebP encode quality (0..1). Defaults to the banner quality. */
  quality?: number;
  /** Output filename (extension is forced to .webp). */
  fileName?: string;
};

/**
 * Downscale an image to a bounded long-edge and re-encode it as WebP.
 *
 * Re-drawing through a canvas is deliberate: besides shrinking the file, it
 * discards all EXIF metadata (including GPS), which is a privacy requirement
 * for user-uploaded banners. EXIF orientation is honored during decode so the
 * result is not rotated once the orientation tag is dropped.
 *
 * Throws an UploadError if the file cannot be decoded or encoded.
 */
export async function normalizeImage(file: File, opts?: NormalizeImageOptions): Promise<File> {
  const maxEdge = opts?.maxEdgePx ?? BANNER_MAX_EDGE_PX;
  const quality = opts?.quality ?? BANNER_WEBP_QUALITY;
  const fileName = opts?.fileName ?? 'banner.webp';

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new UploadError('decode-failed', 'Could not read that image. Try a different file.');
  }

  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new UploadError('encode-failed', 'Could not process that image.');
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, 'image/webp', quality);
    });
    if (!blob) {
      throw new UploadError('encode-failed', 'Could not process that image.');
    }

    return new File([blob], fileName, { type: 'image/webp' });
  } finally {
    bitmap.close?.();
  }
}
