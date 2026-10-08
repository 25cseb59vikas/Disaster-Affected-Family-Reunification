import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useApp } from '../context/AppContext';
import type { AppNotification } from '../types';

/** Short vibration and a soft two-tone chime, where the browser allows (both are skipped silently otherwise). */
function alertVolunteer() {
  try {
    navigator.vibrate?.(150);
  } catch {
    /* not supported */
  }
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.15 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.32);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch {
    /* audio blocked until the user has interacted with the page */
  }
}

export function useOpenNotification() {
  const { db, navigateTo, setSelectedSuggestionId } = useApp();
  return async (n: AppNotification) => {
    await db.notifications.update(n.id, { seen: 1, toasted: 1 });
    setSelectedSuggestionId(n.suggestion_id);
    navigateTo('match_review');
  };
}

export function useUnseenCount() {
  const { db } = useApp();
  return useLiveQuery(() => db.notifications.where('seen').equals(0).count(), [db], 0);
}

/** Toast at the top for notifications that have not been shown yet. */
export const NotificationToast: React.FC = () => {
  const { db } = useApp();
  const open = useOpenNotification();
  const [current, setCurrent] = useState<AppNotification | null>(null);
  const fresh = useLiveQuery(() => db.notifications.where('toasted').equals(0).sortBy('created_at'), [db], []);

  useEffect(() => {
    if (!fresh.length) return;
    const latest = fresh[fresh.length - 1];
    db.notifications.where('toasted').equals(0).modify({ toasted: 1 });
    const extra = fresh.length - 1;
    setCurrent(extra ? { ...latest, text: `${latest.text} (+${extra} more in the bell list)` } : latest);
    alertVolunteer();
  }, [fresh, db]);

  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => setCurrent(null), 8000);
    return () => clearTimeout(t);
  }, [current]);

  if (!current) return null;
  return (
    <div className="fixed top-2 inset-x-0 z-50 px-3 pt-[env(safe-area-inset-top)] pointer-events-none">
      <button
        type="button"
        role="status"
        onClick={() => {
          open(current);
          setCurrent(null);
        }}
        className="pointer-events-auto w-full max-w-[406px] mx-auto block text-left rounded-card bg-header text-white px-4 py-3 shadow-subtle"
      >
        <span className="block text-base font-medium">{current.text}</span>
      </button>
    </div>
  );
};
