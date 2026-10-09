import React, { useState } from 'react';
import { AlertTriangle, LayoutDashboard, ListChecks, Menu, Repeat, Search, Settings, Table2, UserPlus, type LucideIcon } from 'lucide-react';
import { AppProvider, useApp } from '../context/AppContext';
import { AUTHORITY } from '../sites';
import { switchRole } from '../role';
import { DemoNotice } from '../components/DemoNotice';
import { InstallButton } from '../components/InstallButton';
import { go, linkProps, useRoute } from '../route';
import { CloseButton, Drawer } from './ui';
import { ConsoleScope, SCOPE_KEY, SCOPE_SITES, storedScope } from './scope';
import { useConsoleData } from './data';
import { OverviewPage } from './OverviewPage';
import { MatchQueuePage } from './MatchQueuePage';
import { ConsolePriorityPage } from './ConsolePriorityPage';
import { RecordsPage } from './RecordsPage';
import { RecordPage } from './RecordPage';
import { ConsoleRegisterPage } from './ConsoleRegisterPage';
import { SettingsPage } from './SettingsPage';

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

type NavItem = { path: string; label: string; Icon: LucideIcon };
const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Review',
    items: [
      { path: '/console', label: 'Overview', Icon: LayoutDashboard },
      { path: '/console/matches', label: 'Match queue', Icon: ListChecks },
      { path: '/console/priority', label: 'Priority', Icon: AlertTriangle }
    ]
  },
  {
    label: 'People',
    items: [
      { path: '/console/records', label: 'Records', Icon: Table2 },
      { path: '/console/register', label: 'Register', Icon: UserPlus }
    ]
  },
  { label: 'Console', items: [{ path: '/console/settings', label: 'Settings', Icon: Settings }] }
];

/** Sync state as a chip in the top bar; tapping it syncs now. */
const SyncChip: React.FC = () => {
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
    <button
      type="button"
      onClick={() => syncNow()}
      disabled={syncStatus === 'syncing'}
      title="Sync now"
      className="h-11 lg:h-9 px-3 inline-flex items-center gap-2 rounded-full bg-white/10 text-sm text-white/90 hover:bg-white/15 disabled:cursor-wait motion-safe:transition-[background-color] motion-safe:duration-150"
    >
      <span aria-hidden className={`w-2 h-2 rounded-full ${syncStatus === 'offline' ? 'bg-pending' : syncStatus === 'syncing' ? 'bg-civilBlue motion-safe:animate-pulse' : 'bg-verified'}`} />
      <span aria-live="polite" className="tabular-nums">
        {text}
      </span>
    </button>
  );
};

/** Navigation, grouped. `rail`: icons only (1024–1279px), with the label as a tooltip. */
const SidebarNav: React.FC<{ rail: boolean; officer: string; onChangeOfficer: () => void; onNavigate?: () => void }> = ({
  rail,
  officer,
  onChangeOfficer,
  onNavigate
}) => {
  const { path } = useRoute();
  const data = useConsoleData();
  const toDecide = data ? data.suggestions.filter(s => ['open', 'partly_confirmed', 'confirmed'].includes(data.states.get(s.id)!.status)).length : 0;
  const active = (p: string) => (p === '/console' ? path === '/console' : path.startsWith(p));
  // Labels hide only in the 1024–1279px rail; the drawer and wide screens always show them.
  const hideInRail = rail ? 'lg:sr-only xl:not-sr-only' : '';

  return (
    <div className="h-full flex flex-col bg-header bg-topo-dark text-white">
      <div className={`h-14 flex items-center px-5 ${rail ? 'lg:justify-center lg:px-0 xl:justify-start xl:px-5' : ''}`}>
        <span className="font-display text-lg font-semibold tracking-tight">
          {rail ? (
            <>
              <span className="hidden lg:inline xl:hidden" aria-hidden>
                R
              </span>
              <span className="lg:hidden xl:inline">Reunite</span>
            </>
          ) : (
            'Reunite'
          )}
        </span>
        <span className={`ml-2 text-xs text-white/60 ${rail ? 'lg:hidden xl:inline' : ''}`}>Authority console</span>
      </div>

      <nav aria-label="Console" className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mt-5 first:mt-2">
            <p className={`px-3 mb-1.5 text-label font-medium uppercase text-white/45 ${rail ? 'lg:hidden xl:block' : ''}`}>{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map(({ path: p, label, Icon }) => {
                const on = active(p);
                return (
                  <li key={p}>
                    <a
                      {...linkProps(p)}
                      onClick={e => {
                        linkProps(p).onClick(e);
                        onNavigate?.();
                      }}
                      title={rail ? label : undefined}
                      aria-current={on ? 'page' : undefined}
                      className={`relative h-11 lg:h-10 px-3 rounded-panel flex items-center gap-3 text-sm font-medium motion-safe:transition-[background-color,color] motion-safe:duration-150 ${
                        rail ? 'lg:justify-center xl:justify-start' : ''
                      } ${on ? 'bg-white/10 text-white shadow-edge-accent' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={on ? 2 : 1.5} />
                      <span className={`flex-1 ${hideInRail}`}>{label}</span>
                      {p === '/console/matches' && toDecide > 0 && (
                        <span
                          aria-label={`${toDecide} need a decision`}
                          className={`min-w-[20px] h-5 px-1.5 rounded-full bg-terracotta text-white text-xs font-semibold leading-5 text-center tabular-nums ${
                            rail ? 'lg:absolute lg:top-1 lg:right-1 lg:min-w-[16px] lg:h-4 lg:leading-4 lg:px-1 lg:text-label xl:static xl:min-w-[20px] xl:h-5 xl:leading-5 xl:px-1.5 xl:text-xs' : ''
                          }`}
                        >
                          {toDecide}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        <div className={`flex items-center gap-3 px-2 ${rail ? 'lg:justify-center lg:px-0 xl:justify-start xl:px-2' : ''}`}>
          <button type="button" onClick={onChangeOfficer} title="Change name" className="rounded-full w-11 h-11 lg:w-8 lg:h-8 flex items-center justify-center shrink-0">
            <span className="sr-only">Signed in as {officer}. Change name</span>
            <span aria-hidden className="w-8 h-8 rounded-full bg-white/15 text-white text-xs font-semibold flex items-center justify-center">
              {officer
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(w => w[0]!.toUpperCase())
                .join('')}
            </span>
          </button>
          <div className={`min-w-0 flex-1 ${hideInRail}`}>
            <p className="text-sm font-medium text-white truncate">{officer}</p>
            <div className="flex gap-3 text-xs">
              <button type="button" onClick={onChangeOfficer} className="min-h-[44px] lg:min-h-[28px] text-white/70 hover:text-white">
                Change name
              </button>
              <button type="button" onClick={switchRole} className="min-h-[44px] lg:min-h-[28px] text-white/70 hover:text-white">
                Change role
              </button>
            </div>
          </div>
        </div>
        {rail && (
          <button
            type="button"
            onClick={switchRole}
            title="Change role"
            aria-label="Change role"
            className="hidden lg:flex xl:hidden mx-auto mt-2 w-10 h-10 rounded-panel items-center justify-center text-white/70 hover:bg-white/5 hover:text-white"
          >
            <Repeat className="w-[18px] h-[18px]" strokeWidth={1.5} />
          </button>
        )}
        <div className={rail ? 'hidden xl:block' : ''}>
          <InstallButton tone="dark" className="mt-3 w-full justify-center" />
        </div>
      </div>
    </div>
  );
};

const ConsoleShell: React.FC<{ officer: string; onChangeOfficer: () => void }> = ({ officer, onChangeOfficer }) => {
  const { path } = useRoute();
  const [navOpen, setNavOpen] = useState(false);
  const [site, setSite] = useState(storedScope);
  const [query, setQuery] = useState('');
  const closeNav = React.useCallback(() => setNavOpen(false), []);

  const chooseSite = (v: string) => {
    setSite(v);
    try {
      localStorage.setItem(SCOPE_KEY, v);
    } catch {
      /* not remembered in private mode */
    }
  };

  let page: React.ReactNode;
  if (path.startsWith('/console/matches')) page = <MatchQueuePage />;
  else if (path.startsWith('/console/priority')) page = <ConsolePriorityPage />;
  else if (path.startsWith('/console/records/')) page = <RecordPage id={decodeURIComponent(path.slice('/console/records/'.length))} />;
  else if (path.startsWith('/console/records')) page = <RecordsPage />;
  else if (path.startsWith('/console/register')) page = <ConsoleRegisterPage />;
  else if (path.startsWith('/console/settings')) page = <SettingsPage />;
  else page = <OverviewPage />;

  return (
    <ConsoleScope.Provider value={{ site, setSite: chooseSite }}>
      <div className="min-h-dvh bg-dotgrid lg:pl-sidebar-rail xl:pl-sidebar">
        {/* Sidebar: icons only at 1024–1279px, full from 1280px; a drawer below 1024px. */}
        <aside className="hidden lg:block fixed inset-y-0 left-0 z-30 lg:w-sidebar-rail xl:w-sidebar">
          <SidebarNav rail officer={officer} onChangeOfficer={onChangeOfficer} />
        </aside>
        <Drawer open={navOpen} onClose={closeNav} label="Navigation">
          <div className="relative h-full">
            <SidebarNav rail={false} officer={officer} onChangeOfficer={onChangeOfficer} onNavigate={closeNav} />
            <div className="absolute top-1.5 right-1.5">
              <CloseButton onClick={closeNav} label="Close navigation" />
            </div>
          </div>
        </Drawer>

        <header className="sticky top-0 z-20 h-14 bg-header text-white flex items-center gap-2 lg:gap-3 px-2 lg:px-6 border-b border-white/10">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            className="lg:hidden w-11 h-11 rounded-panel flex items-center justify-center hover:bg-white/10"
          >
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <span className="lg:hidden font-display text-lg font-semibold mr-1">Reunite</span>

          <form
            role="search"
            className="hidden md:block flex-1 max-w-md"
            onSubmit={e => {
              e.preventDefault();
              go(`/console/records${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`);
            }}
          >
            <label htmlFor="console-search" className="sr-only">
              Search records by name, code, village or phone
            </label>
            <div className="relative">
              <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" strokeWidth={1.5} />
              <input
                id="console-search"
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search records by name, code or village"
                className="w-full h-11 lg:h-9 rounded-panel bg-white/10 pl-9 pr-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:bg-white/15 focus:ring-2 focus:ring-white/30"
              />
            </div>
          </form>

          <span className="flex-1" />
          <label className="sr-only" htmlFor="console-site">
            Sites shown
          </label>
          <select
            id="console-site"
            value={site}
            onChange={e => chooseSite(e.target.value)}
            className="hidden sm:block h-11 lg:h-9 rounded-panel bg-white/10 border-0 pl-3 pr-8 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30 [&>option]:text-navy"
          >
            <option value="">All sites</option>
            {SCOPE_SITES.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <SyncChip />
        </header>

        <main className="w-full max-w-[1600px] mx-auto px-4 lg:px-8 py-6 lg:py-8">{page}</main>
        <DemoNotice />
      </div>
    </ConsoleScope.Provider>
  );
};
