import React, { useSyncExternalStore } from 'react';
import { Download } from 'lucide-react';

// Chrome and Edge fire beforeinstallprompt once the app is installable. Listen from the start
// (this module is imported by main.tsx) because the event can fire before any screen is drawn.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); // show our own button instead of the mini-infobar
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useInstallPrompt() {
  const available = useSyncExternalStore(subscribe, () => deferred !== null);
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null; // a prompt can only be used once
    notify();
  };
  return { available, install };
}

/** "Install app", shown only where the browser supports installing and the app is not installed yet. */
export const InstallButton: React.FC<{ className?: string; tone?: 'light' | 'dark' }> = ({ className = '', tone = 'light' }) => {
  const { available, install } = useInstallPrompt();
  if (!available) return null;
  return (
    <button
      type="button"
      onClick={install}
      className={`min-h-[44px] px-3 inline-flex items-center gap-2 rounded-button text-base font-medium border ${
        tone === 'dark' ? 'border-white/30 text-white hover:bg-white/10' : 'border-borderSlate bg-surface text-navy hover:border-navy'
      } ${className}`}
    >
      <Download className="w-5 h-5" strokeWidth={1.75} />
      Install app
    </button>
  );
};
