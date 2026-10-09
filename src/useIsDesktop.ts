import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import type React from 'react';

// Desktop layouts start at 1024px (Tailwind's lg). Below that, phone and tablet layouts are unchanged.
const query = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)') : null;

/** True from 1024px wide; follows window resizes. */
export function useIsDesktop() {
  return useSyncExternalStore(
    cb => {
      query?.addEventListener('change', cb);
      return () => query?.removeEventListener('change', cb);
    },
    () => query?.matches ?? false
  );
}

/** True while the media query matches; follows window resizes. */
export function useMediaQuery(q: string) {
  const mq = typeof window !== 'undefined' ? window.matchMedia(q) : null;
  return useSyncExternalStore(
    cb => {
      mq?.addEventListener('change', cb);
      return () => mq?.removeEventListener('change', cb);
    },
    () => mq?.matches ?? false
  );
}

/** Width of an element, kept up to date (for layouts that depend on the space a component really has). */
export function useElementWidth<T extends HTMLElement>(): [React.RefCallback<T>, number] {
  const [width, setWidth] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    observer.current?.disconnect();
    if (!el) return;
    observer.current = new ResizeObserver(entries => setWidth(Math.round(entries[0].contentRect.width)));
    observer.current.observe(el);
  }, []);
  return [ref, width];
}
