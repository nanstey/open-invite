import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock, selectMock, inMock } = vi.hoisted(() => {
  const inMock = vi.fn();
  const selectMock = vi.fn(() => ({ in: inMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));

  return { fromMock, selectMock, inMock };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

import {
  DEFAULT_FEATURE_FLAGS,
  fetchFeatureFlags,
  resolveFeatureFlags,
} from '../../lib/featureFlags';

describe('feature flags', () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    inMock.mockReset();
  });

  it('falls back to code defaults when rows are missing', () => {
    expect(resolveFeatureFlags([])).toEqual(DEFAULT_FEATURE_FLAGS);
    expect(resolveFeatureFlags(null)).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it('applies database overrides for known flags', () => {
    expect(
      resolveFeatureFlags([
        { key: 'groups', enabled: true },
        { key: 'sendInvites', enabled: true },
      ])
    ).toEqual({ groups: true, sendInvites: true });
  });

  it('falls back to defaults when the flag query fails', async () => {
    inMock.mockResolvedValue({
      data: null,
      error: new Error('boom'),
    });

    await expect(fetchFeatureFlags()).resolves.toEqual(DEFAULT_FEATURE_FLAGS);
    expect(fromMock).toHaveBeenCalledWith('feature_flags');
  });
});
