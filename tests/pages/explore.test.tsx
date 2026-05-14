import { describe, expect, it } from 'vitest';

import { Route } from '../../pages/explore';

describe('explore route', () => {
  it('can be imported without errors', () => {
    expect(typeof Route).toBe('object');
  });
});
