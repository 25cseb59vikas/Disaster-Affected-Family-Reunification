import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { siteName } from '../sites';
import type { PersonRecord, Suggestion } from '../types';

const matchesQuery = (r: PersonRecord, q: string) =>
  [r.name, r.village, r.relative_name, r.code, r.clothing_marks].some(v => v?.toLowerCase().includes(q));

export const SearchRecordsScreen: React.FC = () => {
  const { db, navigateTo, setSelectedSuggestionId } = useApp();
  const [query, setQuery] = useState('');
  const records = useLiveQuery(() => db.records.orderBy('created_at').reverse().toArray(), [db], []);
  const suggestions = useLiveQuery(() => db.suggestions.toArray(), [db], []);

  const bestSuggestion = new Map<string, Suggestion>();
  for (const s of suggestions) {
    for (const id of [s.found_id, s.seeking_id]) {
      if ((bestSuggestion.get(id)?.score ?? -1) < s.score) bestSuggestion.set(id, s);
    }
  }

  const q = query.trim().toLowerCase();
  const shown = q ? records.filter(r => matchesQuery(r, q)) : records;

  return (
    <Screen nav="search">
      <h1 className="screen-title">Search</h1>

      <input
        type="search"
        aria-label="Search by name, village or code"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Name, village or code"
        className="input mb-4"
      />

      <div className="card-stack">
        {shown.map(r => {
          const s = bestSuggestion.get(r.id);
          const details = [r.age_band, r.village].filter(Boolean).join(' · ') || 'No age or village';
          const content = (
            <>
              <span className="w-12 h-12 shrink-0 rounded-button bg-pressed flex items-center justify-center text-lg font-semibold text-navy-muted overflow-hidden">
                {r.photo ? <img src={r.photo} alt="" className="w-full h-full object-cover" /> : (r.name?.charAt(0) ?? '?')}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                  <span className="min-w-0 flex-1 text-lg font-semibold text-navy truncate">{r.name ?? 'Name not known'}</span>
                  {s && <span className="badge bg-pending-bg text-pending border-pending-border">Possible match</span>}
                </span>
                <span className="block text-sm text-navy-muted truncate">{details}</span>
                <span className="block text-sm text-navy truncate">
                  {r.type === 'found' ? 'Found at' : 'Searching from'} {siteName(r.site)} · {r.code}
                </span>
              </span>
            </>
          );
          return s ? (
            <button
              type="button"
              key={r.id}
              onClick={() => {
                setSelectedSuggestionId(s.id);
                navigateTo('match_review');
              }}
              className="card w-full flex items-start gap-3 text-left cursor-pointer transition-colors hover:border-navy/30 active:bg-pressed"
            >
              {content}
            </button>
          ) : (
            <div key={r.id} className="card flex items-start gap-3">
              {content}
            </div>
          );
        })}

        {shown.length === 0 && (
          <p className="card text-center text-base text-navy-muted">
            {records.length === 0 ? 'No records yet.' : `No records match "${query}".`}
          </p>
        )}
      </div>
    </Screen>
  );
};
