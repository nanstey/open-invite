import { describe, expect, it } from 'vitest';
import { backoffSeconds, DEFAULT_MAX_ATTEMPTS, isExhausted } from './backoff';

describe('backoffSeconds', () => {
  it('doubles per attempt starting at the base', () => {
    expect(backoffSeconds(1, 60)).toBe(60);
    expect(backoffSeconds(2, 60)).toBe(120);
    expect(backoffSeconds(3, 60)).toBe(240);
    expect(backoffSeconds(4, 60)).toBe(480);
  });

  it('caps the delay', () => {
    expect(backoffSeconds(20, 60, 3600)).toBe(3600);
  });

  it('treats attempts < 1 as the first attempt', () => {
    expect(backoffSeconds(0, 60)).toBe(60);
  });
});

describe('isExhausted', () => {
  it('is true at or beyond the max', () => {
    expect(isExhausted(DEFAULT_MAX_ATTEMPTS)).toBe(true);
    expect(isExhausted(DEFAULT_MAX_ATTEMPTS + 1)).toBe(true);
  });

  it('is false below the max', () => {
    expect(isExhausted(DEFAULT_MAX_ATTEMPTS - 1)).toBe(false);
  });
});
