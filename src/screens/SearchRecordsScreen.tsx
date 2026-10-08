import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { siteName } from '../sites';
import { eventsByPair, recordStatus, type SearchStatus } from '../matchStatus';
import type { PersonRecord } from '../types';

type View = 'here' | 'searches';

const matchesQuery = (r: PersonRecord, q: string) =>
  [r.name, r.village, r.relative_name, r.code, r.clothing_marks, r.contact_phone].some(v => v?.toLowerCase().includes(q));

const STATUS_BADGE: Record<SearchStatus, string> = {
  Searching: 'bg-canvas text-navy-muted border-borderSlate',
  'Possible match': 'bg-pending-bg text-pending border-pending-border',
  'Being verified': 'bg-civilBlue-soft text-civilBlue border-civilBlue/20',
  Found: 'bg-verified-bg text-verified border-verified-border'
};

export const timeSince = (iso: string) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return min < 60 ? `${min} min ago` : min < 48 * 60 ? `${Math.round(min / 60)} h ago` : `${Math.round(min / 1440)} days ago`;
};

export const SearchRecordsScreen: React.FC = () => {
  const { db, site, navigateTo, setSelectedRecordId } = useApp();
  const [view, setView] = useState<View>('here');
  const [query, setQuery] = useState('');
  const data = useLiveQuery(async () => {
    const [records, suggestions, events] = await Promise.all([
      db.records.orderBy('created_at').reverse().toArray(),
      db.suggestions.toArray(),
      db.events.toArray()
    ]);
    return { records, suggestions, events: eventsByPair(events) };
  }, [db]);

  const q = query.trim().toLowerCase();
  const pool = (data?.records ?? []).filter(r => (view === 'here' ? r.type === 'found' && r.site === site : r.type === 'seeking'));
  const shown = q ? pool.filter(r => matchesQuery(r, q)) : pool;

  const open = (r: PersonRecord) => {
    setSelectedRecordId(r.id);
    navigateTo('record_detail');
  };

  return (
    <Screen nav="search">
      <h1 className="screen-title">Search</h1>

      <div role="tablist" aria-label="Show" className="grid grid-cols-2 p-1 mb-3 rounded-button bg-pressed">
        {(
          [
            ['here', 'People here'],
            ['searches', 'Searches']
          ] as Array<[View, string]>
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`min-h-[44px] rounded-badge text-base font-medium ${view === v ? 'bg-surface text-navy shadow-subtle' : 'text-navy-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        type="search"
        aria-label={view === 'here' ? 'Search people here' : 'Search the searches'}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={view === 'here' ? 'Name, village or code' : 'Name, relative, phone or code'}
        className="input mb-4"
      />

      <div className="card-stack">
        {shown.map(r => {
          const { status } = recordStatus(r.id, data!.suggestions, data!.events);
          return (
            <button
              type="button"
              key={r.id}
              onClick={() => open(r)}
              className="card w-full flex items-start gap-3 text-left cursor-pointer transition-colors hover:border-navy/30 active:bg-pressed"
            >
              {view === 'here' && (
                <span className="w-12 h-12 shrink-0 rounded-button bg-pressed flex items-center justify-center text-lg font-semibold text-navy-muted overflow-hidden">
                  {r.photo ? <img src={r.photo} alt="" className="w-full h-full object-cover" /> : (r.name?.charAt(0) ?? '?')}
                </span>
              )}
              <span className="flex-1 min-w-0">
                <span className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                  <span className="min-w-0 flex-1 text-lg font-semibold text-navy truncate">{r.name ?? 'Name not known'}</span>
                  <span className={`badge ${STATUS_BADGE[status]}`}>
                    {view === 'here' && status === 'Searching' ? 'No match yet' : status}
                  </span>
                </span>
                {view === 'here' ? (
                  <span className="block text-sm text-navy-muted truncate">
                    {[r.age_band, r.village].filter(Boolean).join(' · ') || 'No age or village'} · {r.code}
                  </span>
                ) : (
                  <>
                    <span className="block text-sm text-navy truncate">
                      Searching: {r.relative_name ?? 'not recorded'}
                      {r.relative_relation ? ` (${r.relative_relation})` : ''}
                      {r.contact_phone ? ` · ${r.contact_phone}` : ''}
                    </span>
                    <span className="block text-sm text-navy-muted truncate">
                      {r.source === 'phone' ? 'Phone line' : siteName(r.site)} · {timeSince(r.created_at)} · {r.code}
                    </span>
                  </>
                )}
              </span>
            </button>
          );
        })}

        {data && shown.length === 0 && (
          <p className="card text-center text-base text-navy-muted">
            {pool.length === 0 ? (view === 'here' ? 'Nobody registered here yet.' : 'No searches yet.') : `Nothing matches "${query}".`}
          </p>
        )}
      </div>
    </Screen>
  );
};
