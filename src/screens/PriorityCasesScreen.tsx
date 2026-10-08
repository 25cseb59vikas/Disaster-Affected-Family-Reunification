import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { siteName } from '../sites';
import { eventsByPair, pairState } from '../matchStatus';
import type { PersonRecord, SiteId, Suggestion } from '../types';

interface Case {
  key: string;
  rank: number;
  title: string;
  reason: string;
  reasonColor: string;
  detail: string;
  created_at: string;
  suggestionId?: string;
}

// Simple rules, most urgent first. Each case says why it is on the list.
function buildCases(site: SiteId, records: PersonRecord[], suggestions: Suggestion[], events: ReturnType<typeof eventsByPair>) {
  const byId = new Map(records.map(r => [r.id, r]));
  const states = new Map(suggestions.map(s => [s.id, pairState(events.get(s.id) ?? [])]));
  const reunited = new Set<string>();
  const bestFor = new Map<string, Suggestion>();
  for (const s of suggestions) {
    const st = states.get(s.id)!;
    if (st.status === 'confirmed') reunited.add(s.found_id).add(s.seeking_id);
    if (st.status === 'ruled_out') continue;
    if ((bestFor.get(s.found_id)?.score ?? -1) < s.score) bestFor.set(s.found_id, s);
  }

  const cases: Case[] = [];
  for (const r of records) {
    if (r.type !== 'found' || r.site !== site || reunited.has(r.id)) continue;
    const detail = [r.age_band, r.clothing_marks].filter(Boolean).join(' · ') || r.code;
    if (r.age_band === 'Under 12') {
      cases.push({ key: `child-${r.id}`, rank: 0, title: r.name ?? 'Child, name not known', reason: 'Child, no family located yet',
        reasonColor: 'text-urgent', detail, created_at: r.created_at, suggestionId: bestFor.get(r.id)?.id });
    } else if (!r.name) {
      cases.push({ key: `noname-${r.id}`, rank: 1, title: `Person ${r.code}`, reason: 'No name recorded',
        reasonColor: 'text-pending', detail, created_at: r.created_at, suggestionId: bestFor.get(r.id)?.id });
    }
  }
  for (const s of suggestions) {
    const st = states.get(s.id)!;
    const waiting = (st.status === 'partly_confirmed' || (st.status === 'open' && s.band === 'Strong')) && !st.confirmedBy[site];
    if (!waiting) continue;
    const f = byId.get(s.found_id);
    const other = Object.keys(st.confirmedBy)[0];
    cases.push({
      key: `confirm-${s.id}`,
      rank: 2,
      title: f?.name ?? `Person ${f?.code ?? ''}`,
      reason: st.status === 'partly_confirmed' ? `Confirmed at ${siteName(other)}, waiting for you` : 'Strong match waiting for confirmation',
      reasonColor: 'text-civilBlue',
      detail: `Match score ${s.score}`,
      created_at: f?.created_at ?? '',
      suggestionId: s.id
    });
  }
  cases.sort((a, b) => a.rank - b.rank || a.created_at.localeCompare(b.created_at));
  return { cases, reunitedPairs: [...states.values()].filter(s => s.status === 'confirmed').length, reunited };
}

export const PriorityCasesScreen: React.FC = () => {
  const { db, site, navigateTo, setSelectedSuggestionId } = useApp();
  const data = useLiveQuery(async () => {
    const [records, suggestions, events] = await Promise.all([db.records.toArray(), db.suggestions.toArray(), db.events.toArray()]);
    return { records, ...buildCases(site, records, suggestions, eventsByPair(events)) };
  }, [db, site]);

  const counts = data
    ? [
        { value: data.records.filter(r => r.site === site).length, label: `Registered here`, color: 'text-navy' },
        { value: data.records.filter(r => r.type === 'seeking' && !data.reunited.has(r.id)).length, label: 'Searching', color: 'text-terracotta' },
        { value: data.reunitedPairs, label: 'Reunited', color: 'text-verified' }
      ]
    : [];

  return (
    <Screen nav="priority">
      <h1 className="screen-title">Priority</h1>

      {data && (
        <div className="card grid grid-cols-3 divide-x divide-borderSlate text-center mb-3">
          {counts.map(c => (
            <div key={c.label} className="min-w-0 px-1">
              <span className={`block text-xl font-semibold ${c.color}`}>{c.value}</span>
              <span className="block text-xs text-navy-muted truncate">{c.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card-stack">
        {data?.cases.map(c => {
          const body = (
            <>
              <span className="flex-1 min-w-0">
                <span className="block text-lg font-semibold text-navy truncate">{c.title}</span>
                <span className={`block text-sm font-medium ${c.reasonColor}`}>{c.reason}</span>
                <span className="block text-sm text-navy-muted truncate">{c.detail}</span>
              </span>
              {c.suggestionId && <ChevronRight className="icon text-navy-muted" />}
            </>
          );
          return c.suggestionId ? (
            <button
              type="button"
              key={c.key}
              onClick={() => {
                setSelectedSuggestionId(c.suggestionId!);
                navigateTo('match_review');
              }}
              className="card w-full flex items-center gap-3 text-left cursor-pointer transition-colors hover:border-navy/30 active:bg-pressed"
            >
              {body}
            </button>
          ) : (
            <div key={c.key} className="card flex items-center gap-3">
              {body}
            </div>
          );
        })}
        {data && data.cases.length === 0 && <p className="card text-center text-base text-navy-muted">Nothing urgent right now.</p>}
      </div>
    </Screen>
  );
};
