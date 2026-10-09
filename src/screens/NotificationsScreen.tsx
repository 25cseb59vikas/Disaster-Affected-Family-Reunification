import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BadgeCheck, Check, ChevronRight, Users, X, type LucideIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { useOpenNotification } from '../components/Notifications';
import { pairState, requiredFor } from '../matchStatus';
import { useConsoleData, type ConsoleData } from '../workspace/data';
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

  return (
    <Screen showBack nav="notifications" width="medium">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h1 className="screen-title mb-0">Notifications</h1>
        {unread > 0 && (
          <button type="button" onClick={() => db.notifications.where('seen').equals(0).modify({ seen: 1 })} className="btn-text -mr-2 text-sm">
            Mark all as read
          </button>
        )}
      </div>

      <div role="tablist" aria-label="Show" className="grid grid-cols-2 p-1 mb-3 rounded-button bg-pressed md:max-w-sm">
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
            className={`min-h-[44px] rounded-badge text-base font-medium ${filter === f ? 'bg-surface text-navy shadow-subtle' : 'text-navy-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

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
