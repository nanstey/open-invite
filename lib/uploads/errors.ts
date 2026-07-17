export type UploadErrorCode =
  | 'empty'
  | 'invalid-type'
  | 'too-large'
  | 'decode-failed'
  | 'encode-failed'
  | 'upload-failed';

/**
 * Typed error for the upload pipeline so callers can map a failure to a
 * user-facing message without string-matching. All upload/validation/
 * normalization failures surface as an UploadError.
 */
export class UploadError extends Error {
  readonly code: UploadErrorCode;

  constructor(code: UploadErrorCode, message: string) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
  }
}
