// Retry scheduling — pure, unit-testable helpers shared by the worker.

export const DEFAULT_MAX_ATTEMPTS = 6;

/**
 * Exponential backoff (in seconds) for the Nth attempt, capped.
 *
 * `attempts` is the attempt count already recorded on the row (claim-time bumped),
 * so the first failure (attempts === 1) waits `base`, then doubles each time.
 */
export function backoffSeconds(attempts: number, base = 60, cap = 3600): number {
  const n = Math.max(1, Math.floor(attempts));
  const raw = base * 2 ** (n - 1);
  return Math.min(raw, cap);
}

/** Whether a row has exhausted its retries and should be dead-lettered. */
export function isExhausted(attempts: number, maxAttempts = DEFAULT_MAX_ATTEMPTS): boolean {
  return attempts >= maxAttempts;
}
