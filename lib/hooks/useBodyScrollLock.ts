import * as React from 'react';

type BodyStyleSnapshot = {
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  bodyPaddingRight: string;
  htmlOverflow: string;
  scrollY: number;
};

let lockCount = 0;
let snapshot: BodyStyleSnapshot | null = null;

function lockBodyScroll() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  if (lockCount === 0) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    snapshot = {
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyLeft: document.body.style.left,
      bodyRight: document.body.style.right,
      bodyWidth: document.body.style.width,
      bodyPaddingRight: document.body.style.paddingRight,
      htmlOverflow: document.documentElement.style.overflow,
      scrollY: window.scrollY,
    };

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${snapshot.scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  lockCount += 1;
}

function unlockBodyScroll() {
  if (typeof document === 'undefined' || typeof window === 'undefined' || lockCount === 0) return;

  lockCount -= 1;
  if (lockCount > 0 || !snapshot) return;

  document.documentElement.style.overflow = snapshot.htmlOverflow;
  document.body.style.overflow = snapshot.bodyOverflow;
  document.body.style.position = snapshot.bodyPosition;
  document.body.style.top = snapshot.bodyTop;
  document.body.style.left = snapshot.bodyLeft;
  document.body.style.right = snapshot.bodyRight;
  document.body.style.width = snapshot.bodyWidth;
  document.body.style.paddingRight = snapshot.bodyPaddingRight;
  try {
    window.scrollTo(0, snapshot.scrollY);
  } catch {
    // jsdom exposes scrollTo but does not implement it.
  }
  snapshot = null;
}

export function useBodyScrollLock(locked: boolean) {
  React.useEffect(() => {
    if (!locked) return;

    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [locked]);
}
