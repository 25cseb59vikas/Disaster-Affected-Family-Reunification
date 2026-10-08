import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Bell } from 'lucide-react';
import { useUnseenCount } from './Notifications';
import { siteName } from '../sites';
import { SwitchMenu } from './SwitchMenu';

interface TopBarProps {
  showBack?: boolean;
}

/** The sync line's wording and state, shared by the phone top bar and the desktop status bar. */
export function useSyncLine() {
  const { syncStatus, waitingCount, lastBytesSent, syncNow } = useApp();
  const isSyncing = syncStatus === 'syncing';
  const offline = syncStatus === 'offline';
  const kb = lastBytesSent / 1024;
  const statusText = isSyncing
    ? 'Syncing'
    : offline
      ? waitingCount > 0 ? `Offline · ${waitingCount} waiting` : 'Offline'
      : waitingCount > 0
        ? `${waitingCount} waiting`
        : `Synced · ${lastBytesSent === 0 ? '0' : kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB sent`;
  const dot = offline ? 'bg-pending' : isSyncing ? 'bg-civilBlue' : 'bg-verified';
  const canSyncNow = !isSyncing && (offline || waitingCount > 0);
  return { statusText, dot, canSyncNow, syncNow };
}

/** Phones and tablets: navy bar with site, volunteer, notifications and Switch, plus the sync line. */
export const TopBar: React.FC<TopBarProps> = ({ showBack = false }) => {
  const { site, volunteerName, goBack, canGoBack, navigateTo } = useApp();
  const unseen = useUnseenCount();
  const { statusText, dot, canSyncNow, syncNow } = useSyncLine();

  return (
    <header className="flex-none lg:hidden">
      <div className="h-header bg-header text-white pl-4 pr-2 flex items-center gap-2">
        {showBack && canGoBack && (
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="-ml-3 w-11 h-11 shrink-0 rounded-button flex items-center justify-center hover:bg-white/10"
          >
            <ArrowLeft className="icon" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold truncate">{siteName(site)}</p>
          <p className="text-xs text-white/70 truncate">{volunteerName}</p>
        </div>
        <button
          type="button"
          onClick={() => navigateTo('notifications')}
          aria-label={unseen ? `Notifications, ${unseen} new` : 'Notifications'}
          className="relative shrink-0 w-11 h-11 rounded-button flex items-center justify-center hover:bg-white/10"
        >
          <Bell className="icon" />
          {unseen > 0 && <span aria-hidden className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-urgent ring-2 ring-header" />}
        </button>
        <div className="shrink-0">
          <SwitchMenu />
        </div>
      </div>

      <div className="h-status bg-surface border-b border-borderSlate pl-4 pr-2 flex items-center gap-2 text-xs whitespace-nowrap">
        <span aria-hidden className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className="flex-1 min-w-0 truncate text-navy-muted" aria-live="polite">
          {statusText}
        </span>
        {canSyncNow && (
          <button
            type="button"
            onClick={() => syncNow()}
            className="relative shrink-0 h-full px-2 text-xs font-medium text-civilBlue hover:underline before:absolute before:-inset-y-2 before:inset-x-0 before:content-['']"
          >
            Sync now
          </button>
        )}
      </div>
    </header>
  );
};

/** Desktop: Back on the left, the sync line on the right, at the top of the content area. */
export const DesktopStatusBar: React.FC<TopBarProps> = ({ showBack = false }) => {
  const { goBack, canGoBack } = useApp();
  const { statusText, dot, canSyncNow, syncNow } = useSyncLine();
  return (
    <div className="hidden lg:flex flex-none h-11 items-center gap-3 px-8 bg-surface border-b border-borderSlate text-sm">
      {showBack && canGoBack && (
        <button type="button" onClick={goBack} className="-ml-2 min-h-[36px] px-2 inline-flex items-center gap-1.5 rounded-button font-medium text-navy hover:bg-pressed">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          Back
        </button>
      )}
      <span className="flex-1" />
      <span aria-hidden className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      <span className="text-navy-muted" aria-live="polite">
        {statusText}
      </span>
      {canSyncNow && (
        <button type="button" onClick={() => syncNow()} className="min-h-[36px] px-2 rounded-button font-medium text-civilBlue hover:bg-civilBlue-soft">
          Sync now
        </button>
      )}
    </div>
  );
};
