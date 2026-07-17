import * as React from 'react';

import { UploadError } from '../../../lib/uploads/errors';
import {
  buildEventBannerPath,
  EVENT_BANNER_BUCKET,
  uploadImage,
} from '../../../services/storageService';

export function useHeaderImageUpload(args: {
  eventId: string;
  onUploaded: (publicUrl: string) => void;
}) {
  const { eventId, onUploaded } = args;
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const uploadFile = React.useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);
      try {
        const path = buildEventBannerPath(eventId);
        const { publicUrl } = await uploadImage(EVENT_BANNER_BUCKET, path, file);
        onUploaded(publicUrl);
      } catch (e) {
        setError(e instanceof UploadError ? e.message : 'Upload failed. Try again.');
      } finally {
        setIsUploading(false);
      }
    },
    [eventId, onUploaded]
  );

  return { isUploading, error, uploadFile };
}
