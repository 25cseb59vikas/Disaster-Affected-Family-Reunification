import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Bell } from 'lucide-react';
import { useUnseenCount } from './Notifications';
import { siteName } from '../sites';
import { SwitchMenu } from './SwitchMenu';

interface TopBarProps {
  showBack?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ showBack = false }) => {
  const { site, volunteerName, syncStatus, waitingCount, lastBytesSent, syncNow, goBack, canGoBack, navigateTo } = useApp();
  const unseen = useUnseenCount();
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

  return (
    <header className="flex-none">
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
        <span
          aria-hidden
          className={`w-2 h-2 rounded-full shrink-0 ${offline ? 'bg-pending' : isSyncing ? 'bg-civilBlue' : 'bg-verified'}`}
        />
        <span className="flex-1 min-w-0 truncate text-navy-muted" aria-live="polite">
          {statusText}
        </span>
        {!isSyncing && (offline || waitingCount > 0) && (
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
