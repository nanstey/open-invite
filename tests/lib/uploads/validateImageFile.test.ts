import { describe, expect, it } from 'vitest';

import { UploadError } from '../../../lib/uploads/errors';
import { validateImageFile } from '../../../lib/uploads/validateImageFile';

function makeFile(type: string, size: number, name = 'photo'): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('validateImageFile', () => {
  it('accepts an allowed image under the size cap', () => {
    expect(() => validateImageFile(makeFile('image/jpeg', 1024))).not.toThrow();
    expect(() => validateImageFile(makeFile('image/png', 1024))).not.toThrow();
    expect(() => validateImageFile(makeFile('image/webp', 1024))).not.toThrow();
  });

  it('rejects an empty file', () => {
    try {
      validateImageFile(makeFile('image/jpeg', 0));
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(UploadError);
      expect((e as UploadError).code).toBe('empty');
    }
  });

  it('rejects a disallowed MIME type (incl. SVG)', () => {
    for (const type of ['image/svg+xml', 'image/gif', 'text/html', 'application/pdf']) {
      try {
        validateImageFile(makeFile(type, 1024));
        expect.unreachable(`should have thrown for ${type}`);
      } catch (e) {
        expect(e).toBeInstanceOf(UploadError);
        expect((e as UploadError).code).toBe('invalid-type');
      }
    }
  });

  it('rejects a file over the size cap', () => {
    try {
      validateImageFile(makeFile('image/jpeg', 6 * 1024 * 1024));
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(UploadError);
      expect((e as UploadError).code).toBe('too-large');
    }
  });

  it('honors custom mime and size limits', () => {
    expect(() => validateImageFile(makeFile('image/png', 1024), { mime: ['image/webp'] })).toThrow(
      UploadError
    );
    expect(() => validateImageFile(makeFile('image/jpeg', 2048), { maxBytes: 1024 })).toThrow(
      UploadError
    );
  });
});
