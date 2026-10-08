import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface TopBarProps {
  showBack?: boolean;
  backTitle?: string;
  hideNavInfo?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ showBack = false, backTitle, hideNavInfo = false }) => {
  const { currentSite, volunteerName, offlineCount, isOnline, syncOfflineQueue, goBack, canGoBack } = useApp();
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncOfflineQueue();
    setIsSyncing(false);
  };

  return (
    <header className="bg-navy text-surface sticky top-0 z-40 shadow-sm">
      {/* Main Top Header */}
      <div className="h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && canGoBack && (
            <button
              onClick={goBack}
              aria-label="Go back"
              className="w-10 h-10 -ml-2 rounded flex items-center justify-center text-surface hover:bg-white/10 active:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
            </button>
          )}
          <div className="leading-tight">
            <h1 className="text-[19px] font-semibold tracking-tight text-white">
              {backTitle || currentSite}
            </h1>
            {!hideNavInfo && (
              <p className="text-[14px] text-white/75 font-normal">
                Volunteer: {volunteerName}
              </p>
            )}
          </div>
        </div>

        {/* Sync / Offline Status Button */}
        {!hideNavInfo && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
              offlineCount > 0
                ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-500/30'
            }`}
            title="Tap to synchronize database"
          >
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>{isSyncing ? 'Syncing...' : isOnline ? 'Online' : 'Offline'}</span>
          </button>
        )}
      </div>

      {/* Offline Status Strip */}
      {!hideNavInfo && (
        <div className={`px-4 py-1 text-[13px] font-medium flex items-center justify-between border-t ${
          offlineCount > 0 ? 'bg-[#18263A] text-amber-200 border-navy/40' : 'bg-[#132235] text-emerald-300 border-navy/40'
        }`}>
          <span>
            {offlineCount > 0
              ? `Offline · ${offlineCount} waiting to sync (Dexie IndexedDB)`
              : 'All records synchronized locally & backed up'}
          </span>
          {offlineCount > 0 && (
            <button
              onClick={handleSync}
              className="text-terracotta hover:underline font-semibold text-[13px] ml-2"
            >
              Sync now
            </button>
          )}
        </div>
      )}
    </header>
  );
};
