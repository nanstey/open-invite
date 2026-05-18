import * as React from 'react';

function subscribeToMediaQuery(query: string, onStoreChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }

  const mediaQueryList = window.matchMedia(query);
  mediaQueryList.addEventListener('change', onStoreChange);
  return () => mediaQueryList.removeEventListener('change', onStoreChange);
}

function getMediaQuerySnapshot(query: string) {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;
}

export function useMediaQuery(query: string) {
  return React.useSyncExternalStore(
    onStoreChange => subscribeToMediaQuery(query, onStoreChange),
    () => getMediaQuerySnapshot(query),
    () => false
  );
}
