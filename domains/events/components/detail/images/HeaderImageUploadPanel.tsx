import { ImageUp, Loader2 } from 'lucide-react';
import * as React from 'react';

import { ALLOWED_IMAGE_MIME } from '../../../../../lib/uploads/constants';
import { useHeaderImageUpload } from '../../../hooks/useHeaderImageUpload';

const ACCEPT = ALLOWED_IMAGE_MIME.join(',');

type HeaderImageUploadPanelProps = {
  eventId: string;
  selectedUrl: string;
  onUploaded: (publicUrl: string) => void;
};

export function HeaderImageUploadPanel(props: HeaderImageUploadPanelProps) {
  const { eventId, selectedUrl, onUploaded } = props;
  const { isUploading, error, uploadFile } = useHeaderImageUpload({ eventId, onUploaded });
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so selecting the same file again re-triggers change.
    e.target.value = '';
    if (file) {
      uploadFile(file);
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/60 p-8 text-center transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <ImageUp className="h-8 w-8 text-slate-400" />
        )}
        <span className="text-sm font-semibold text-white">
          {isUploading ? 'Uploading…' : 'Upload from device'}
        </span>
        <span className="text-xs text-slate-400">JPG, PNG or WebP · up to 5MB</span>
      </button>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {selectedUrl && !isUploading ? (
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-400">Preview</div>
          <div className="overflow-hidden rounded-xl border border-slate-700">
            <img
              src={selectedUrl}
              alt="Selected banner preview"
              className="aspect-[5/2] w-full object-cover"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
