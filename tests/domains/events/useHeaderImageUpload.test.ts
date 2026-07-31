import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UploadError } from '../../../lib/uploads/errors';

const { uploadImageMock, buildEventBannerPathMock } = vi.hoisted(() => ({
  uploadImageMock: vi.fn(),
  buildEventBannerPathMock: vi.fn(() => 'event-1/generated.webp'),
}));

vi.mock('../../../services/storageService', () => ({
  uploadImage: uploadImageMock,
  buildEventBannerPath: buildEventBannerPathMock,
  EVENT_BANNER_BUCKET: 'event-banners',
}));

import { useHeaderImageUpload } from '../../../domains/events/hooks/useHeaderImageUpload';

function makeFile() {
  return new File(['x'], 'photo.png', { type: 'image/png' });
}

describe('useHeaderImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads to an event-namespaced path and reports the public URL', async () => {
    uploadImageMock.mockResolvedValue({
      path: 'event-1/generated.webp',
      publicUrl: 'https://cdn/x.webp',
    });
    const onUploaded = vi.fn();
    const file = makeFile();

    const { result } = renderHook(() => useHeaderImageUpload({ eventId: 'event-1', onUploaded }));

    await act(async () => {
      await result.current.uploadFile(file);
    });

    expect(buildEventBannerPathMock).toHaveBeenCalledWith('event-1');
    expect(uploadImageMock).toHaveBeenCalledWith('event-banners', 'event-1/generated.webp', file);
    expect(onUploaded).toHaveBeenCalledWith('https://cdn/x.webp');
    expect(result.current.error).toBeNull();
    expect(result.current.isUploading).toBe(false);
  });

  it('surfaces the error message and does not call onUploaded on failure', async () => {
    uploadImageMock.mockRejectedValue(new UploadError('too-large', 'Image is too large.'));
    const onUploaded = vi.fn();

    const { result } = renderHook(() => useHeaderImageUpload({ eventId: 'event-1', onUploaded }));

    await act(async () => {
      await result.current.uploadFile(makeFile());
    });

    expect(onUploaded).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Image is too large.');
    expect(result.current.isUploading).toBe(false);
  });

  it('maps an unexpected (non-UploadError) failure to a generic message', async () => {
    uploadImageMock.mockRejectedValue(new Error('network blip'));
    const onUploaded = vi.fn();

    const { result } = renderHook(() => useHeaderImageUpload({ eventId: 'event-1', onUploaded }));

    await act(async () => {
      await result.current.uploadFile(makeFile());
    });

    expect(onUploaded).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Upload failed. Try again.');
  });
});
