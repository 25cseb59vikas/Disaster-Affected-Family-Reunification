import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BadgeCheck, Check, ChevronRight, Users, X, type LucideIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { useOpenNotification } from '../components/Notifications';
import { pairState, requiredFor } from '../matchStatus';
import { useConsoleData, type ConsoleData } from '../workspace/data';
import { EvidencePanel } from '../workspace/EvidencePanel';
import { EmptyState } from '../workspace/ui';
import { useIsDesktop } from '../useIsDesktop';
import type { AppNotification, SiteId } from '../types';

const timeAgo = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return min < 1 ? 'just now' : min < 60 ? `${min} min ago` : min < 1440 ? `${Math.round(min / 60)} h ago` : `${Math.round(min / 1440)} d ago`;
};

const KIND: Record<AppNotification['kind'], { Icon: LucideIcon; tone: string }> = {
  match: { Icon: Users, tone: 'bg-pending-bg text-pending' },
  confirm: { Icon: Check, tone: 'bg-civilBlue-soft text-civilBlue' },
  authority: { Icon: Check, tone: 'bg-civilBlue-soft text-civilBlue' },
  rejected: { Icon: X, tone: 'bg-urgent-bg text-urgent' },
  verified: { Icon: BadgeCheck, tone: 'bg-verified-bg text-verified' }
};

/** Does this notification's match still need this site to confirm the person is here? */
export function needsAction(n: AppNotification, data: ConsoleData | undefined, site: SiteId) {
  if (!data) return false;
  const state = data.states.get(n.suggestion_id) ?? pairState(data.events.get(n.suggestion_id) ?? [], requiredFor(n.suggestion_id, data.byId));
  if (state.status === 'verified' || state.status === 'ruled_out') return false;
  return requiredFor(n.suggestion_id, data.byId).includes(site) && !state.confirmedBy[site];
}

type Filter = 'all' | 'action';

/** The volunteer's inbox: matches for people registered here and what happened to them. */
export const NotificationsScreen: React.FC = () => {
  const { db, site } = useApp();
  const open = useOpenNotification();
  const data = useConsoleData();
  const [filter, setFilter] = useState<Filter>('all');
  const items = useLiveQuery(() => db.notifications.orderBy('created_at').reverse().limit(100).toArray(), [db]);
  const unread = (items ?? []).filter(n => !n.seen).length;
  const shown = (items ?? []).filter(n => filter === 'all' || needsAction(n, data, site));
  const actionCount = (items ?? []).filter(n => needsAction(n, data, site)).length;
  const desktop = useIsDesktop();
  const [picked, setPicked] = useState<string | null>(null);
  const selected = shown.find(n => n.id === picked) ?? shown[0];

  const filters = (
    <div role="tablist" aria-label="Show" className="grid grid-cols-2 p-1 rounded-button lg:rounded-panel bg-pressed md:max-w-sm lg:w-72">
      {(
        [
          ['all', 'All'],
          ['action', `Needs action${actionCount ? ` (${actionCount})` : ''}`]
        ] as Array<[Filter, string]>
      ).map(([f, label]) => (
        <button
          key={f}
          type="button"
          role="tab"
          aria-selected={filter === f}
          onClick={() => setFilter(f)}
          className={`min-h-[44px] lg:min-h-0 lg:h-8 rounded-badge text-base lg:text-sm font-medium ${filter === f ? 'bg-surface text-navy shadow-subtle' : 'text-navy-muted'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
  const markAll = unread > 0 && (
    <button type="button" onClick={() => db.notifications.where('seen').equals(0).modify({ seen: 1 })} className="btn-text -mr-2 text-sm">
      Mark all as read
    </button>
  );

  // Desktop: the inbox on the left, the selected match's evidence on the right (the same frame as the console).
  if (desktop) {
    return (
      <Screen nav="notifications" width="wide" fill>
        <header className="flex-none flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pb-3 mb-3 border-b border-borderSlate">
          <div>
            <h1 className="font-display text-title font-semibold tracking-tight text-navy leading-tight">Notifications</h1>
            <p className="text-sm text-navy-muted">Matches for people registered here. The authority makes the final decision.</p>
          </div>
          <p className="text-xs text-navy-muted">
            <span className="font-display text-xl font-semibold text-navy tabular-nums mr-1">{unread}</span>unread
            <span className="font-display text-xl font-semibold text-navy tabular-nums ml-4 mr-1">{actionCount}</span>need action
          </p>
        </header>
        <div className="flex-none flex items-center justify-between gap-3 mb-3">
          {filters}
          {markAll}
        </div>
        <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,38fr)_minmax(0,62fr)] gap-5">
          <ul aria-label="Notifications" role="listbox" className="panel h-full min-h-0 overflow-y-auto overscroll-contain">
            {shown.map(n => {
              const { Icon, tone } = KIND[n.kind] ?? KIND.match;
              const on = n.id === selected?.id;
              return (
                <li key={n.id} role="option" aria-selected={on} className="border-b border-borderSlate last:border-b-0">
                  <button
                    type="button"
                    onClick={() => {
                      setPicked(n.id);
                      if (!n.seen) db.notifications.update(n.id, { seen: 1, toasted: 1 });
                    }}
                    className={`w-full flex items-start gap-3 px-4 py-2.5 text-left motion-safe:transition-colors ${on ? 'bg-terracotta-soft/60 shadow-edge-accent' : 'hover:bg-canvas'}`}
                  >
                    <span aria-hidden className={`mt-0.5 w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${tone}`}>
                      <Icon className="w-4 h-4" strokeWidth={2} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-table text-navy ${n.seen ? '' : 'font-semibold'}`}>{n.text}</span>
                      <span className="block text-xs text-navy-muted">
                        {timeAgo(n.created_at)}
                        {needsAction(n, data, site) && <span className="text-terracotta font-medium"> · Needs your confirmation</span>}
                      </span>
                    </span>
                    {!n.seen && (
                      <span className="mt-2 shrink-0 w-2 h-2 rounded-full bg-urgent">
                        <span className="sr-only">Unread</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {items && shown.length === 0 && (
              <li className="p-6 text-center text-sm text-navy-muted">{filter === 'action' ? 'Nothing needs your action.' : 'No notifications yet.'}</li>
            )}
          </ul>
          <div className="h-full min-h-0 min-w-0">
            {selected && data ? (
              <EvidencePanel key={selected.suggestion_id} id={selected.suggestion_id} data={data} mode="site" site={site} />
            ) : (
              <div className="panel h-full flex items-center justify-center">
                <EmptyState title="Nothing selected" hint="Choose a notification to see the evidence for that match." />
              </div>
            )}
          </div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen showBack nav="notifications" width="medium">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h1 className="screen-title mb-0">Notifications</h1>
        {markAll}
      </div>

      <div className="mb-3">{filters}</div>

      <ul className="space-y-2" aria-label="Notifications">
        {shown.map(n => {
          const { Icon, tone } = KIND[n.kind] ?? KIND.match;
          const action = needsAction(n, data, site);
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => open(n)}
                className="card w-full flex items-center gap-3 text-left cursor-pointer transition-colors hover:border-navy/30 active:bg-pressed"
              >
                <span aria-hidden className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${tone}`}>
                  <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-base text-navy ${n.seen ? '' : 'font-semibold'}`}>{n.text}</span>
                  <span className="block text-sm text-navy-muted">
                    {timeAgo(n.created_at)}
                    {action && <span className="text-terracotta font-medium"> · Confirm this person is here</span>}
                  </span>
                </span>
                {!n.seen && (
                  <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-urgent">
                    <span className="sr-only">Unread</span>
                  </span>
                )}
                <ChevronRight aria-hidden className="icon text-navy-muted" />
              </button>
            </li>
          );
        })}
      </ul>
      {!items && (
        <p className="card text-center text-base text-navy-muted" role="status">
          Loading…
        </p>
      )}
      {items && shown.length === 0 && (
        <div className="card text-center">
          <p className="text-base font-medium text-navy">{filter === 'action' ? 'Nothing needs your action' : 'No notifications yet'}</p>
          <p className="text-sm text-navy-muted mt-1">
            {filter === 'action' ? 'Matches that need this site to confirm a person appear here.' : 'You are told here when someone registered at this site may have been matched.'}
          </p>
        </div>
      )}
    </Screen>
  );
};
