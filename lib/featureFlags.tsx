import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

import type { Database } from './database.types';
import { supabase } from './supabase';

export const FEATURE_FLAG_KEYS = ['groups', 'sendInvites'] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];
export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  groups: false,
  sendInvites: false,
};

type FeatureFlagRow = Pick<Database['public']['Tables']['feature_flags']['Row'], 'enabled' | 'key'>;

const FEATURE_FLAGS_QUERY_KEY = ['feature-flags'];

function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return FEATURE_FLAG_KEYS.includes(value as FeatureFlagKey);
}

export function resolveFeatureFlags(rows: FeatureFlagRow[] | null | undefined): FeatureFlags {
  const resolved: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };

  for (const row of rows ?? []) {
    if (isFeatureFlagKey(row.key)) {
      resolved[row.key] = row.enabled;
    }
  }

  return resolved;
}

export async function fetchFeatureFlags(): Promise<FeatureFlags> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('key, enabled')
    .in('key', [...FEATURE_FLAG_KEYS]);

  if (error) {
    console.warn('Error fetching feature flags:', error);
    return { ...DEFAULT_FEATURE_FLAGS };
  }

  return resolveFeatureFlags((data as FeatureFlagRow[] | null) ?? null);
}

type FeatureFlagsContextValue = {
  flags: FeatureFlags;
  isLoading: boolean;
};

const FeatureFlagsContext = React.createContext<FeatureFlagsContextValue | undefined>(undefined);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const query = useQuery({
    queryKey: FEATURE_FLAGS_QUERY_KEY,
    queryFn: fetchFeatureFlags,
    initialData: DEFAULT_FEATURE_FLAGS,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const value = React.useMemo(
    () => ({
      flags: query.data ?? DEFAULT_FEATURE_FLAGS,
      isLoading: query.isLoading,
    }),
    [query.data, query.isLoading]
  );

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags(): FeatureFlags {
  const context = React.useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context.flags;
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  return useFeatureFlags()[key];
}
