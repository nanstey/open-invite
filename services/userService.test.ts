import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabase = vi.hoisted(() => ({
  from: vi.fn(),
  storage: { from: vi.fn() },
}));

vi.mock('../lib/supabase', () => ({ supabase }));

// Import will be done in beforeEach after module reset
let fetchUser: typeof import('./userService').fetchUser;
let fetchUsers: typeof import('./userService').fetchUsers;
let updateUserProfile: typeof import('./userService').updateUserProfile;
let searchUsers: typeof import('./userService').searchUsers;
let isUsernameAvailable: typeof import('./userService').isUsernameAvailable;
let uploadAvatar: typeof import('./userService').uploadAvatar;
let validateUsername: typeof import('./userService').validateUsername;
let sanitizeSocialLinks: typeof import('./userService').sanitizeSocialLinks;

const mockFrom = (handlers: Record<string, () => any>) => {
  supabase.from.mockImplementation((table: string) => {
    const handler = handlers[table];
    if (!handler) {
      throw new Error(`Unhandled table ${table}`);
    }
    return handler();
  });
};

describe('userService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Re-import module to get fresh cache state
    const userService = await import('./userService');
    fetchUser = userService.fetchUser;
    fetchUsers = userService.fetchUsers;
    updateUserProfile = userService.updateUserProfile;
    searchUsers = userService.searchUsers;
    isUsernameAvailable = userService.isUsernameAvailable;
    uploadAvatar = userService.uploadAvatar;
    validateUsername = userService.validateUsername;
    sanitizeSocialLinks = userService.sanitizeSocialLinks;
  });

  describe('fetchUser', () => {
    it('fetches user profile and caches it', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'user-1', name: 'Alice', avatar: 'avatar1.jpg' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await fetchUser('user-1', 'user-1');

      expect(result).toMatchObject({
        id: 'user-1',
        name: 'Alice',
        avatar: 'avatar1.jpg',
        isCurrentUser: true,
      });
    });

    it('marks isCurrentUser as false when ids differ', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'user-1', name: 'Alice', avatar: 'avatar1.jpg' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await fetchUser('user-1', 'user-2');

      expect(result?.isCurrentUser).toBe(false);
    });

    it('returns null when user not found', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: null,
                error: { message: 'not found', code: 'PGRST116' },
              }),
            }),
          }),
        }),
      });

      const result = await fetchUser('user-999');

      expect(result).toBeNull();
    });

    it('returns null when database error occurs', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: null, // null data causes return null
                error: { message: 'connection failed' },
              }),
            }),
          }),
        }),
      });

      const result = await fetchUser('user-1');

      expect(result).toBeNull();
    });

    it('returns cached value on second call without fetching', async () => {
      const singleSpy = vi.fn(async () => ({
        data: { id: 'user-1', name: 'Alice', avatar: 'avatar1.jpg' },
        error: null,
      }));

      mockFrom({
        user_profiles: () => ({
          select: () => ({
            eq: () => ({
              single: singleSpy,
            }),
          }),
        }),
      });

      // First call should fetch
      await fetchUser('user-1');
      expect(singleSpy).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result = await fetchUser('user-1');
      expect(singleSpy).toHaveBeenCalledTimes(1); // No additional call
      expect(result).toMatchObject({ id: 'user-1', name: 'Alice' });
    });
  });

  describe('fetchUsers', () => {
    it('returns empty array when no userIds provided', async () => {
      const result = await fetchUsers([], 'user-1');

      expect(result).toEqual([]);
    });

    it('fetches multiple users by IDs', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            in: async () => ({
              data: [
                { id: 'user-1', name: 'Alice', avatar: 'avatar1.jpg' },
                { id: 'user-2', name: 'Bob', avatar: 'avatar2.jpg' },
              ],
              error: null,
            }),
          }),
        }),
      });

      const result = await fetchUsers(['user-1', 'user-2'], 'user-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 'user-1', name: 'Alice', isCurrentUser: true });
      expect(result[1]).toMatchObject({ id: 'user-2', name: 'Bob', isCurrentUser: false });
    });

    it('returns empty array when database error occurs (no cache)', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            in: async () => ({
              data: null,
              error: { message: 'db error' },
            }),
          }),
        }),
      });

      // Without cache primed, returns empty since no data available
      const result = await fetchUsers(['user-1', 'user-2'], 'user-1');

      expect(result).toEqual([]);
    });

    it('preserves input order in results', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            in: async () => ({
              data: [
                { id: 'user-2', name: 'Bob', avatar: 'avatar2.jpg' },
                { id: 'user-1', name: 'Alice', avatar: 'avatar1.jpg' },
              ],
              error: null,
            }),
          }),
        }),
      });

      // Even if database returns in different order, input order should be preserved
      const result = await fetchUsers(['user-1', 'user-2'], 'user-1');

      expect(result[0].id).toBe('user-1');
      expect(result[1].id).toBe('user-2');
    });

    it('filters out non-existent users while preserving order', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            in: async () => ({
              data: [
                { id: 'user-1', name: 'Alice', avatar: 'avatar1.jpg' },
                // user-999 doesn't exist in database
              ],
              error: null,
            }),
          }),
        }),
      });

      const result = await fetchUsers(['user-1', 'user-999'], 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('user-1');
    });

    it('works without currentUserId parameter', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            in: async () => ({
              data: [{ id: 'user-1', name: 'Alice', avatar: 'avatar1.jpg' }],
              error: null,
            }),
          }),
        }),
      });

      const result = await fetchUsers(['user-1']);

      expect(result[0].isCurrentUser).toBe(false);
    });

    it('returns one entry per input ID (may include duplicates if in input)', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            in: async () => ({
              data: [{ id: 'user-1', name: 'Alice', avatar: 'avatar1.jpg' }],
              error: null,
            }),
          }),
        }),
      });

      // Service preserves input order and includes all IDs that exist
      const result = await fetchUsers(['user-1', 'user-1', 'user-1'], 'user-1');

      // Returns 3 entries because that's what was requested (service doesn't dedupe output)
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('user-1');
      expect(result[1].id).toBe('user-1');
      expect(result[2].id).toBe('user-1');
    });
  });

  describe('updateUserProfile', () => {
    it('updates name and returns updated user', async () => {
      const updateFn = vi.fn(async () => ({ error: null }));

      mockFrom({
        user_profiles: () => ({
          update: () => ({ eq: updateFn }),
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'user-1', name: 'Alice Updated', avatar: 'avatar1.jpg' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await updateUserProfile('user-1', { name: 'Alice Updated' });

      expect(result).toMatchObject({ id: 'user-1', name: 'Alice Updated' });
      // eq is called with 'id' column and then userId value
      expect(updateFn).toHaveBeenCalledWith('id', 'user-1');
    });

    it('updates avatar and returns updated user', async () => {
      const updateFn = vi.fn(async () => ({ error: null }));

      mockFrom({
        user_profiles: () => ({
          update: () => ({ eq: updateFn }),
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'user-1', name: 'Alice', avatar: 'new-avatar.jpg' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await updateUserProfile('user-1', { avatar: 'new-avatar.jpg' });

      expect(result).toMatchObject({ id: 'user-1', avatar: 'new-avatar.jpg' });
    });

    it('updates both name and avatar', async () => {
      const updateFn = vi.fn(async () => ({ error: null }));

      mockFrom({
        user_profiles: () => ({
          update: () => ({ eq: updateFn }),
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'user-1', name: 'New Name', avatar: 'new-avatar.jpg' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await updateUserProfile('user-1', {
        name: 'New Name',
        avatar: 'new-avatar.jpg',
      });

      expect(result).toMatchObject({ id: 'user-1', name: 'New Name', avatar: 'new-avatar.jpg' });
    });

    it('returns null when update fails', async () => {
      mockFrom({
        user_profiles: () => ({
          update: () => ({
            eq: async () => ({ error: { message: 'db error' } }),
          }),
        }),
      });

      const result = await updateUserProfile('user-1', { name: 'New Name' });

      expect(result).toBeNull();
    });

    it('handles empty update object', async () => {
      const updateFn = vi.fn(async () => ({ error: null }));

      mockFrom({
        user_profiles: () => ({
          update: () => ({ eq: updateFn }),
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'user-1', name: 'Alice', avatar: 'avatar1.jpg' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await updateUserProfile('user-1', {});

      // Should still work with empty updates
      expect(result).toBeDefined();
    });
  });

  describe('searchUsers', () => {
    it('returns users matching search query', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            ilike: () => ({
              limit: async () => ({
                data: [
                  { id: 'user-1', name: 'Alice Smith', avatar: 'avatar1.jpg' },
                  { id: 'user-2', name: 'Alicia Jones', avatar: 'avatar2.jpg' },
                ],
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await searchUsers('ali');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 'user-1', name: 'Alice Smith', isCurrentUser: false });
      expect(result[1]).toMatchObject({ id: 'user-2', name: 'Alicia Jones', isCurrentUser: false });
    });

    it('uses custom limit when provided', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            ilike: () => ({
              limit: async () => ({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      // Test that custom limit doesn't throw error
      const result = await searchUsers('test', 10);

      expect(result).toEqual([]);
    });

    it('uses default limit when not provided', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            ilike: () => ({
              limit: async () => ({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      // Test that default limit works
      const result = await searchUsers('test');

      expect(result).toEqual([]);
    });

    it('returns empty array when no matches found', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            ilike: () => ({
              limit: async () => ({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await searchUsers('xyz');

      expect(result).toEqual([]);
    });

    it('returns empty array when database error occurs', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            ilike: () => ({
              limit: async () => ({
                data: null,
                error: { message: 'db error' },
              }),
            }),
          }),
        }),
      });

      const result = await searchUsers('test');

      expect(result).toEqual([]);
    });

    it('performs case-insensitive search', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            ilike: () => ({
              limit: async () => ({
                data: [{ id: 'user-1', name: 'Alice', avatar: 'avatar1.jpg' }],
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await searchUsers('ALICE');

      expect(result).toHaveLength(1);
    });

    it('handles search with special characters in query', async () => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            ilike: () => ({
              limit: async () => ({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      // Should handle special characters without crashing
      const result = await searchUsers('test%_[]');

      expect(result).toEqual([]);
    });
  });

  describe('validateUsername', () => {
    it('accepts a valid username', () => {
      expect(validateUsername('alice_99')).toBeNull();
    });

    it('rejects too-short usernames', () => {
      expect(validateUsername('ab')).toMatch(/3.30/);
    });

    it('rejects invalid characters', () => {
      expect(validateUsername('Alice!')).toMatch(/lowercase/);
    });
  });

  describe('sanitizeSocialLinks', () => {
    it('keeps only whitelisted, non-empty entries', () => {
      const result = sanitizeSocialLinks({
        instagram: 'alice',
        website: 'https://alice.dev',
        myspace: 'nope',
        x: '   ',
      });
      expect(result).toEqual({ instagram: 'alice', website: 'https://alice.dev' });
    });

    it('returns undefined when nothing valid remains', () => {
      expect(sanitizeSocialLinks({ myspace: 'nope' })).toBeUndefined();
      expect(sanitizeSocialLinks(null)).toBeUndefined();
    });
  });

  describe('isUsernameAvailable', () => {
    const mockLookup = (rows: Array<{ id: string }>) => {
      mockFrom({
        user_profiles: () => ({
          select: () => ({
            eq: () => ({
              limit: async () => ({ data: rows, error: null }),
            }),
          }),
        }),
      });
    };

    it('returns true when no row matches', async () => {
      mockLookup([]);
      expect(await isUsernameAvailable('freename')).toBe(true);
    });

    it('returns false when taken by another user', async () => {
      mockLookup([{ id: 'user-2' }]);
      expect(await isUsernameAvailable('taken', 'user-1')).toBe(false);
    });

    it('returns true when the match is the excluded user', async () => {
      mockLookup([{ id: 'user-1' }]);
      expect(await isUsernameAvailable('mine', 'user-1')).toBe(true);
    });

    it('returns false for an invalid username without querying', async () => {
      expect(await isUsernameAvailable('Bad!')).toBe(false);
    });
  });

  describe('uploadAvatar', () => {
    const makeFile = (type: string, size: number) =>
      ({ type, size, name: `a.${type.split('/')[1]}` }) as unknown as File;

    it('rejects unsupported file types', async () => {
      const result = await uploadAvatar(makeFile('image/gif', 100), 'user-1');
      expect(result).toBeNull();
    });

    it('rejects files over the size limit', async () => {
      const result = await uploadAvatar(makeFile('image/png', 5 * 1024 * 1024), 'user-1');
      expect(result).toBeNull();
    });

    it('uploads a valid file and returns the public URL', async () => {
      const upload = vi.fn(async () => ({ error: null }));
      const getPublicUrl = vi.fn(() => ({
        data: { publicUrl: 'https://cdn/avatars/user-1/x.png' },
      }));
      supabase.storage.from.mockReturnValue({ upload, getPublicUrl });

      const result = await uploadAvatar(makeFile('image/png', 1000), 'user-1');

      expect(result).toBe('https://cdn/avatars/user-1/x.png');
      expect(upload).toHaveBeenCalledTimes(1);
    });

    it('returns null when the upload errors', async () => {
      const upload = vi.fn(async () => ({ error: { message: 'boom' } }));
      supabase.storage.from.mockReturnValue({ upload, getPublicUrl: vi.fn() });

      const result = await uploadAvatar(makeFile('image/png', 1000), 'user-1');

      expect(result).toBeNull();
    });
  });
});
