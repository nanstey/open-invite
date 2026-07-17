import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UploadError } from '../lib/uploads/errors';

const { uploadMock, removeMock, getPublicUrlMock, fromMock, normalizeImageMock } = vi.hoisted(
  () => {
    const uploadMock = vi.fn();
    const removeMock = vi.fn();
    const getPublicUrlMock = vi.fn();
    const fromMock = vi.fn(() => ({
      upload: uploadMock,
      remove: removeMock,
      getPublicUrl: getPublicUrlMock,
    }));
    const normalizeImageMock = vi.fn();
    return { uploadMock, removeMock, getPublicUrlMock, fromMock, normalizeImageMock };
  }
);

vi.mock('../lib/supabase', () => ({
  supabase: { storage: { from: fromMock } },
}));

vi.mock('../lib/uploads/normalizeImage', () => ({
  normalizeImage: normalizeImageMock,
}));

import {
  buildEventBannerPath,
  removeObject,
  storagePathFromPublicUrl,
  uploadImage,
} from './storageService';

function makeFile(type: string, size: number): File {
  const file = new File(['x'], 'photo', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

const NORMALIZED = new File(['y'], 'banner.webp', { type: 'image/webp' });

describe('storageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    normalizeImageMock.mockResolvedValue(NORMALIZED);
    uploadMock.mockResolvedValue({ error: null });
    removeMock.mockResolvedValue({ error: null });
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'https://cdn/event-banners/e/f.webp' } });
  });

  describe('uploadImage', () => {
    it('validates, normalizes, uploads, and returns the public URL', async () => {
      const result = await uploadImage('event-banners', 'e/f.webp', makeFile('image/png', 2048));

      expect(normalizeImageMock).toHaveBeenCalledOnce();
      expect(uploadMock).toHaveBeenCalledWith('e/f.webp', NORMALIZED, {
        contentType: 'image/webp',
        upsert: false,
      });
      expect(result).toEqual({
        path: 'e/f.webp',
        publicUrl: 'https://cdn/event-banners/e/f.webp',
      });
    });

    it('rejects an invalid file before uploading', async () => {
      await expect(
        uploadImage('event-banners', 'e/f.webp', makeFile('image/svg+xml', 2048))
      ).rejects.toBeInstanceOf(UploadError);
      expect(normalizeImageMock).not.toHaveBeenCalled();
      expect(uploadMock).not.toHaveBeenCalled();
    });

    it('maps a storage upload error to an UploadError', async () => {
      uploadMock.mockResolvedValue({ error: { message: 'boom' } });
      await expect(
        uploadImage('event-banners', 'e/f.webp', makeFile('image/png', 2048))
      ).rejects.toMatchObject({ code: 'upload-failed', message: 'boom' });
      expect(getPublicUrlMock).not.toHaveBeenCalled();
    });
  });

  describe('removeObject', () => {
    it('removes the object', async () => {
      await removeObject('event-banners', 'e/f.webp');
      expect(removeMock).toHaveBeenCalledWith(['e/f.webp']);
    });

    it('throws on error', async () => {
      removeMock.mockResolvedValue({ error: { message: 'nope' } });
      await expect(removeObject('event-banners', 'e/f.webp')).rejects.toBeInstanceOf(UploadError);
    });
  });

  describe('buildEventBannerPath', () => {
    it('namespaces by event id and ends in .webp', () => {
      const path = buildEventBannerPath('event-123');
      expect(path).toMatch(/^event-123\/[0-9a-f-]{36}\.webp$/);
    });
  });

  describe('storagePathFromPublicUrl', () => {
    it('extracts the path for an object in the bucket', () => {
      expect(
        storagePathFromPublicUrl(
          'event-banners',
          'https://x.supabase.co/storage/v1/object/public/event-banners/e/f.webp'
        )
      ).toBe('e/f.webp');
    });

    it('returns null for external URLs', () => {
      expect(
        storagePathFromPublicUrl('event-banners', 'https://images.pexels.com/p/1.jpg')
      ).toBeNull();
      expect(storagePathFromPublicUrl('event-banners', '')).toBeNull();
    });
  });
});
