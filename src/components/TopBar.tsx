import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft } from 'lucide-react';

interface TopBarProps {
  showBack?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ showBack = false }) => {
  const { currentSite, volunteerName, offlineCount, syncOfflineQueue, goBack, canGoBack, navigateTo } = useApp();
  const [isSyncing, setIsSyncing] = React.useState(false);
  const siteName = currentSite.split(' – ')[0];

  const handleSync = async () => {
    setIsSyncing(true);
    await syncOfflineQueue();
    setIsSyncing(false);
  };

  const waiting = offlineCount > 0;

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
          <p className="text-base font-semibold truncate">{siteName}</p>
          <p className="text-xs text-white/70 truncate">{volunteerName}</p>
        </div>
        <button
          type="button"
          onClick={() => navigateTo('choose_site')}
          className="shrink-0 min-h-[44px] px-3 text-sm font-medium text-white/90 hover:text-white rounded-button hover:bg-white/10"
        >
          Switch
        </button>
      </div>

      <div className="h-status bg-surface border-b border-borderSlate pl-4 pr-2 flex items-center gap-2 text-xs whitespace-nowrap">
        <span aria-hidden className={`w-2 h-2 rounded-full shrink-0 ${waiting ? 'bg-pending' : 'bg-verified'}`} />
        <span className="flex-1 min-w-0 truncate text-navy-muted" aria-live="polite">
          {isSyncing ? 'Syncing…' : waiting ? `Offline · ${offlineCount} waiting` : 'Synced'}
        </span>
        {waiting && !isSyncing && (
          <button
            type="button"
            onClick={handleSync}
            className="relative shrink-0 h-full px-2 text-xs font-medium text-civilBlue hover:underline before:absolute before:-inset-y-2 before:inset-x-0 before:content-['']"
          >
            Sync now
          </button>
        )}
      </div>
    </header>
  );
};
