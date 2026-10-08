import React, { useState } from 'react';
import { AlertTriangle, LayoutDashboard, ListChecks, Table2, UserPlus, type LucideIcon } from 'lucide-react';
import { AppProvider, useApp } from '../context/AppContext';
import { AUTHORITY } from '../sites';
import { switchRole } from '../role';
import { DemoNotice } from '../components/DemoNotice';
import { InstallButton } from '../components/InstallButton';
import { linkProps, useRoute } from '../route';
import { useConsoleData } from './data';
import { OverviewPage } from './OverviewPage';
import { MatchQueuePage } from './MatchQueuePage';
import { ConsolePriorityPage } from './ConsolePriorityPage';
import { RecordsPage } from './RecordsPage';
import { RecordPage } from './RecordPage';
import { ConsoleRegisterPage } from './ConsoleRegisterPage';

const OFFICER_KEY = 'reunite.consoleOfficer';

const storedOfficer = () => {
  try {
    return localStorage.getItem(OFFICER_KEY) ?? '';
  } catch {
    return '';
  }
};

/** /console: all sites at once, for an authority desk. Desktop first; stacks into one column on phones. */
export const ConsoleApp: React.FC = () => {
  const [officer, setOfficer] = useState(storedOfficer);
  const [editing, setEditing] = useState(!officer);

  const saveOfficer = (name: string) => {
    try {
      localStorage.setItem(OFFICER_KEY, name);
    } catch {
      /* not remembered in private mode */
    }
    setOfficer(name);
    setEditing(false);
  };

  if (editing) return <OfficerName initial={officer} onDone={saveOfficer} onCancel={officer ? () => setEditing(false) : undefined} />;

  return (
    <AppProvider fixedSite={AUTHORITY.id} officer={officer}>
      <ConsoleShell officer={officer} onChangeOfficer={() => setEditing(true)} />
    </AppProvider>
  );
};

const OfficerName: React.FC<{ initial: string; onDone: (name: string) => void; onCancel?: () => void }> = ({ initial, onDone, onCancel }) => {
  const [name, setName] = useState(initial);
  return (
    <div className="min-h-dvh bg-canvas flex flex-col">
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-10">
        <p className="text-sm font-medium text-navy-muted">Reunite · Authority console</p>
        <h1 className="screen-title mt-1">Your name</h1>
        <form
          onSubmit={e => {
            e.preventDefault();
            if (name.trim()) onDone(name.trim());
          }}
        >
          <label htmlFor="officer-name" className="field-label">
            Shown on every decision you make
          </label>
          <input id="officer-name" required autoFocus value={name} onChange={e => setName(e.target.value)} className="input" autoComplete="name" />
          <button type="submit" className="btn-primary mt-4">
            Continue
          </button>
        </form>
        <div className="flex flex-wrap gap-x-4 mt-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-text -ml-2">
              Cancel
            </button>
          )}
          <button type="button" onClick={switchRole} className="btn-text -ml-2">
            Change role
          </button>
        </div>
      </main>
      <DemoNotice />
    </div>
  );
};

const NAV: Array<{ path: string; label: string; Icon: LucideIcon }> = [
  { path: '/console', label: 'Overview', Icon: LayoutDashboard },
  { path: '/console/matches', label: 'Match queue', Icon: ListChecks },
  { path: '/console/priority', label: 'Priority', Icon: AlertTriangle },
  { path: '/console/records', label: 'Records', Icon: Table2 },
  { path: '/console/register', label: 'Register', Icon: UserPlus }
];

const SyncLine: React.FC = () => {
  const { syncStatus, waitingCount, syncNow } = useApp();
  const text =
    syncStatus === 'syncing'
      ? 'Syncing'
      : syncStatus === 'offline'
        ? `Offline${waitingCount ? ` · ${waitingCount} waiting` : ''}`
        : waitingCount
          ? `${waitingCount} waiting`
          : 'Synced';
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        aria-hidden
        className={`w-2 h-2 rounded-full shrink-0 ${syncStatus === 'offline' ? 'bg-pending' : syncStatus === 'syncing' ? 'bg-civilBlue' : 'bg-verified'}`}
      />
      <span className="flex-1 min-w-0 truncate text-white/80" aria-live="polite">
        {text}
      </span>
      {syncStatus !== 'syncing' && (
        <button type="button" onClick={() => syncNow()} className="shrink-0 text-white/90 hover:text-white hover:underline">
          Sync now
        </button>
      )}
    </div>
  );
};

const ConsoleShell: React.FC<{ officer: string; onChangeOfficer: () => void }> = ({ officer, onChangeOfficer }) => {
  const { path } = useRoute();
  const data = useConsoleData();
  const toDecide = data ? data.suggestions.filter(s => ['open', 'partly_confirmed', 'confirmed'].includes(data.states.get(s.id)!.status)).length : 0;

  const active = (p: string) => (p === '/console' ? path === '/console' : path.startsWith(p));

  let page: React.ReactNode;
  if (path.startsWith('/console/matches')) page = <MatchQueuePage />;
  else if (path.startsWith('/console/priority')) page = <ConsolePriorityPage />;
  else if (path.startsWith('/console/records/')) page = <RecordPage id={decodeURIComponent(path.slice('/console/records/'.length))} />;
  else if (path.startsWith('/console/records')) page = <RecordsPage />;
  else if (path.startsWith('/console/register')) page = <ConsoleRegisterPage />;
  else page = <OverviewPage />;

  return (
    <div className="min-h-dvh bg-canvas lg:pl-60">
      <aside className="bg-header text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:flex lg:flex-col lg:overflow-y-auto">
        <div className="px-4 pt-4 pb-3 lg:pb-5">
          <p className="text-lg font-semibold">Reunite</p>
          <p className="text-xs text-white/70">Authority console</p>
        </div>
        <nav aria-label="Console" className="px-2 pb-2 flex flex-wrap gap-1 lg:flex-col lg:flex-nowrap">
          {NAV.map(({ path: p, label, Icon }) => (
            <a
              key={p}
              {...linkProps(p)}
              aria-current={active(p) ? 'page' : undefined}
              className={`min-h-[44px] px-3 rounded-button flex items-center gap-2 text-base font-medium ${
                active(p) ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
              <span className="flex-1">{label}</span>
              {p === '/console/matches' && toDecide > 0 && (
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-terracotta text-white text-xs font-semibold leading-[22px] text-center">
                  {toDecide}
                </span>
              )}
            </a>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-white/10 lg:mt-auto space-y-2">
          <SyncLine />
          <p className="text-sm text-white/80 truncate">
            Signed in as <span className="font-semibold text-white">{officer}</span>
          </p>
          <div className="flex flex-wrap gap-x-3 text-sm">
            <button type="button" onClick={onChangeOfficer} className="text-white/90 hover:underline min-h-[32px]">
              Change name
            </button>
            <button type="button" onClick={switchRole} className="text-white/90 hover:underline min-h-[32px]">
              Change role
            </button>
          </div>
          <InstallButton tone="dark" />
        </div>
      </aside>

      <div className="min-h-dvh flex flex-col">
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 lg:px-8 py-6 lg:py-8">{page}</main>
        <DemoNotice />
      </div>
    </div>
  );
};
