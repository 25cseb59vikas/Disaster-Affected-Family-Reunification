import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { useOpenNotification } from '../components/Notifications';

const timeAgo = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return min < 1 ? 'just now' : min < 60 ? `${min} min ago` : min < 1440 ? `${Math.round(min / 60)} h ago` : `${Math.round(min / 1440)} d ago`;
};

export const NotificationsScreen: React.FC = () => {
  const { db } = useApp();
  const open = useOpenNotification();
  const items = useLiveQuery(() => db.notifications.orderBy('created_at').reverse().limit(50).toArray(), [db], []);

  return (
    <Screen showBack nav="matches" sidebar="notifications">
      <h1 className="screen-title">Notifications</h1>
      <div className="card-stack">
        {items.map(n => (
          <button
            type="button"
            key={n.id}
            onClick={() => open(n)}
            className="card w-full flex items-center gap-3 text-left cursor-pointer transition-colors hover:border-navy/30 active:bg-pressed"
          >
            {!n.seen && <span aria-label="New" className="w-2 h-2 shrink-0 rounded-full bg-urgent" />}
            <span className="flex-1 min-w-0">
              <span className={`block text-base text-navy ${n.seen ? '' : 'font-semibold'}`}>{n.text}</span>
              <span className="block text-sm text-navy-muted">{timeAgo(n.created_at)}</span>
            </span>
            <ChevronRight className="icon text-navy-muted" />
          </button>
        ))}
        {items.length === 0 && <p className="card text-center text-base text-navy-muted">No notifications yet.</p>}
      </div>
    </Screen>
  );
};
