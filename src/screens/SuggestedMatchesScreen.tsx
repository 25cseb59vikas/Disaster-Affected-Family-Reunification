import React, { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { siteName } from '../sites';
import { eventsByPair, pairState, type PairStatus } from '../matchStatus';
import type { PersonRecord } from '../types';

const STATUS_BADGE: Record<PairStatus, [string, string] | null> = {
  verified: ['Verified with family', 'bg-verified-bg text-verified border-verified-border'],
  confirmed: ['Family check next', 'bg-civilBlue-soft text-civilBlue border-civilBlue/20'],
  partly_confirmed: ['Confirmed at one site', 'bg-civilBlue-soft text-civilBlue border-civilBlue/20'],
  ruled_out: null,
  open: null
};

const Person: React.FC<{ r?: PersonRecord; caption: string }> = ({ r, caption }) => (
  <div className="min-w-0 p-3 rounded-button bg-canvas">
    <p className="text-xs text-navy-muted truncate">{caption}</p>
    <p className="text-base font-semibold text-navy truncate">{r ? r.name ?? 'Name not known' : 'Not synced yet'}</p>
    <p className="text-sm text-navy-muted truncate">{r ? [r.age_band, r.village].filter(Boolean).join(' · ') || '–' : ''}</p>
  </div>
);

export const SuggestedMatchesScreen: React.FC = () => {
  const { db, navigateTo, setSelectedSuggestionId } = useApp();
  const data = useLiveQuery(
    async () => {
      const [suggestions, records, events] = await Promise.all([db.suggestions.toArray(), db.records.toArray(), db.events.toArray()]);
      return { suggestions, records: new Map(records.map(r => [r.id, r])), events: eventsByPair(events) };
    },
    [db]
  );

  // Viewing the list clears the unseen badge.
  useEffect(() => {
    db.notifications.where('seen').equals(0).modify({ seen: 1 });
  }, [db, data]);

  const items = (data?.suggestions ?? [])
    .map(s => ({ s, state: pairState(data!.events.get(s.id) ?? []) }))
    .filter(({ state }) => state.status !== 'ruled_out')
    .sort((a, b) => b.s.score - a.s.score);

  return (
    <Screen nav="matches" width="wide">
      <h1 className="screen-title">Matches</h1>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
        {items.map(({ s, state }) => {
          const strong = s.band === 'Strong';
          const statusBadge = STATUS_BADGE[state.status];
          return (
            <button
              type="button"
              key={s.id}
              onClick={() => {
                setSelectedSuggestionId(s.id);
                navigateTo('match_review');
              }}
              className="card w-full text-left cursor-pointer transition-colors hover:border-navy/30 active:bg-pressed"
            >
              <div className="grid grid-cols-2 gap-2">
                <Person r={data!.records.get(s.found_id)} caption={`Found · ${siteName(data!.records.get(s.found_id)?.site ?? '')}`} />
                <Person r={data!.records.get(s.seeking_id)} caption={`Searching · ${siteName(data!.records.get(s.seeking_id)?.site ?? '')}`} />
              </div>

              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 my-3">
                <span className={`text-score font-semibold ${strong ? 'text-verified' : 'text-pending'}`}>{s.score}</span>
                <span className="text-base font-medium text-navy">{s.ambiguous ? 'Ambiguous' : `${s.band} match`}</span>
                {statusBadge && <span className={`badge ${statusBadge[1]}`}>{statusBadge[0]}</span>}
              </div>

              {s.nameless && <p className="text-sm font-medium text-pending mb-1">No name recorded – matched on description</p>}
              <ul className="space-y-1">
                {s.reasons_for.slice(0, 3).map((reason, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-navy">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-verified" strokeWidth={1.75} />
                    <span className="min-w-0">{reason}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}

        {data && items.length === 0 && <p className="card text-center text-base text-navy-muted md:col-span-full">No matches yet</p>}
      </div>
    </Screen>
  );
};
