import { useSyncExternalStore } from 'react';

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
