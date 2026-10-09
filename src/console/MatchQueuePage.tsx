import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { pairState, type PairStatus } from '../matchStatus';
import { siteName } from '../sites';
import type { PersonRecord, Suggestion } from '../types';
import { go, useRoute } from '../route';
import { useIsDesktop, useMediaQuery } from '../useIsDesktop';
import { useConsoleData, type ConsoleData } from './data';
import { EvidencePanel, MATCH_NOTICE } from './EvidencePanel';
import { useScope, SCOPE_SITES } from './scope';
import { Avatar, Drawer, EmptyState, HeaderCount, PageHeader, PAIR_PILL, ScoreBar, SkeletonRows, StatusPill } from './ui';

export { MATCH_NOTICE };

/** Status labels and badge classes, still used by the record pages. */
export const PAIR_STATUS: Record<PairStatus, [string, string]> = Object.fromEntries(
  (Object.keys(PAIR_PILL) as PairStatus[]).map(k => [k, [PAIR_PILL[k].label, `${PAIR_PILL[k].tone} border-transparent`]])
) as Record<PairStatus, [string, string]>;

export const Notice: React.FC = () => <p className="mb-4 text-xs text-navy-muted">{MATCH_NOTICE}</p>;

/** The evidence pane for one pair (also used beside the Priority list). */
export const MatchDetail: React.FC<{ id: string; data: ConsoleData }> = ({ id, data }) => <EvidencePanel id={id} data={data} />;

type StatusFilter = 'decide' | PairStatus | 'all';
const STATUS_OPTIONS: Array<[StatusFilter, string]> = [
  ['decide', 'Needs a decision'],
  ['open', 'Open'],
  ['partly_confirmed', '1 of 2 sites confirmed'],
  ['confirmed', 'Family check next'],
  ['verified', 'Verified'],
  ['ruled_out', 'Rejected'],
  ['all', 'Any status']
];
const DECIDE: PairStatus[] = ['open', 'partly_confirmed', 'confirmed'];
const matchesStatus = (f: StatusFilter, st: PairStatus) => f === 'all' || (f === 'decide' ? DECIDE.includes(st) : st === f);

interface Row {
  s: Suggestion;
  status: PairStatus;
  found?: PersonRecord;
  seeking?: PersonRecord;
}

const searchingFamily = (k?: PersonRecord) =>
  k ? (k.relative_name ? `${k.relative_name}${k.relative_relation ? ` (${k.relative_relation})` : ''}` : 'Not recorded') : 'Not synced yet';

/** /console/matches: every suggested pair across sites, with the evidence for the selected one beside the table. */
export const MatchQueuePage: React.FC = () => {
  const { params } = useRoute();
  const data = useConsoleData();
  const desktop = useIsDesktop();
  // 1280px and up: table and evidence side by side. 1024-1279px: the table alone, evidence in a slide-over.
  const split = useMediaQuery('(min-width: 1280px)');
  const roomy = useMediaQuery('(min-width: 1536px)');
  const extra = desktop && (!split || roomy); // separate Strength and Sites columns when the table has room
  const { site, setSite } = useScope();
  const [query, setQuery] = useState('');
  const [strength, setStrength] = useState<'' | 'Strong' | 'Possible'>('');
  const [status, setStatus] = useState<StatusFilter>('decide');
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());
  const pairParam = params.get('pair');

  // A rejected pair is no longer suggested; keep it listed (without a score) from its reject event.
  const all: Row[] = [];
  if (data) {
    for (const s of data.suggestions) all.push({ s, status: data.states.get(s.id)!.status, found: data.byId.get(s.found_id), seeking: data.byId.get(s.seeking_id) });
    for (const [pid, evs] of data.events) {
      if (data.states.has(pid) || !evs.some(e => e.kind === 'rule_out')) continue;
      const [found_id, seeking_id] = pid.split(':');
      const s: Suggestion = { id: pid, found_id, seeking_id, score: -1, band: 'Possible', ambiguous: false, reasons_for: [], reasons_against: [], unknown: [], ask_next: null };
      all.push({ s, status: pairState(evs).status, found: data.byId.get(found_id), seeking: data.byId.get(seeking_id) });
    }
  }
  const q = query.trim().toLowerCase();
  const rows = all
    .filter(r => matchesStatus(status, r.status))
    .filter(r => !strength || (r.s.score >= 0 && r.s.band === strength))
    .filter(r => !site || r.found?.site === site || r.seeking?.site === site)
    .filter(r => !q || [r.found?.name, r.found?.code, r.seeking?.name, r.seeking?.code, r.seeking?.relative_name].some(v => v?.toLowerCase().includes(q)))
    .sort((a, b) => b.s.score - a.s.score);

  const counts = {
    decide: all.filter(r => DECIDE.includes(r.status)).length,
    verified: all.filter(r => r.status === 'verified').length,
    rejected: all.filter(r => r.status === 'ruled_out').length
  };
  // Split view: the first row is shown until one is chosen. Otherwise a choice opens the slide-over or full screen.
  const selected = pairParam ?? (split ? rows[0]?.s.id : undefined);
  const filtered = Boolean(q || strength || site || status !== 'decide');

  const select = (id: string) => go(`/console/matches?pair=${encodeURIComponent(id)}`);
  const clearFilters = () => {
    setQuery('');
    setStrength('');
    setStatus('decide');
    setSite('');
  };

  // Keyboard: arrow keys move through rows (the evidence follows), Home/End jump, Enter opens.
  const onRowKey = (e: React.KeyboardEvent, i: number) => {
    const to = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : null;
    if (to !== null) {
      e.preventDefault();
      const next = rows[Math.max(0, Math.min(rows.length - 1, to))];
      if (next) {
        select(next.s.id);
        rowRefs.current.get(next.s.id)?.focus();
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select(rows[i].s.id);
    }
  };
  useEffect(() => {
    if (selected && split) rowRefs.current.get(selected)?.scrollIntoView({ block: 'nearest' });
  }, [selected, split]);

  const empty = !data ? null : all.length === 0 ? (
    <EmptyState title="No matches yet" hint="A match appears when a found person and a family's search look alike. Register people, or load demo data in Settings." />
  ) : rows.length === 0 ? (
    <EmptyState
      title={q ? `No matches for "${query}"` : 'No matches with these filters'}
      hint="Try another name or code, or show every status."
      action={
        <button type="button" onClick={clearFilters} className="ws-btn-quiet">
          Clear filters
        </button>
      }
    />
  ) : null;

  const select_ = 'ws-input w-auto pr-8';

  return (
    <>
      <PageHeader
        title="Match queue"
        description="Suggested pairs of a person found at a site and a family's search, strongest first. Review the evidence, then accept or reject."
        aside={
          <div className="flex gap-6">
            <HeaderCount value={data ? counts.decide : '–'} label="Need a decision" />
            <HeaderCount value={data ? counts.verified : '–'} label="Verified" />
            <HeaderCount value={data ? counts.rejected : '–'} label="Rejected" />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4" role="toolbar" aria-label="Filter matches">
        <label htmlFor="match-search" className="sr-only">
          Search by name or code
        </label>
        <input
          id="match-search"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name or code"
          className="ws-input flex-1 min-w-[180px] max-w-xs"
        />
        <label htmlFor="match-site" className="sr-only">
          Site
        </label>
        <select id="match-site" value={site} onChange={e => setSite(e.target.value)} className={select_}>
          <option value="">All sites</option>
          {SCOPE_SITES.map(x => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <label htmlFor="match-strength" className="sr-only">
          Strength
        </label>
        <select id="match-strength" value={strength} onChange={e => setStrength(e.target.value as typeof strength)} className={select_}>
          <option value="">Any strength</option>
          <option value="Strong">Strong</option>
          <option value="Possible">Possible</option>
        </select>
        <label htmlFor="match-status" className="sr-only">
          Status
        </label>
        <select id="match-status" value={status} onChange={e => setStatus(e.target.value as StatusFilter)} className={select_}>
          {STATUS_OPTIONS.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        {filtered && (
          <button type="button" onClick={clearFilters} className="h-11 lg:h-9 px-2 text-sm font-medium text-civilBlue hover:underline">
            Clear filters
          </button>
        )}
        <span className="ml-auto text-sm text-navy-muted tabular-nums" aria-live="polite">
          {data ? `${rows.length} ${rows.length === 1 ? 'match' : 'matches'}` : ''}
        </span>
      </div>

      {desktop ? (
        <div className={split ? 'grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-6 items-start' : ''}>
          <div className="panel">
            <table className="w-full text-table text-left table-fixed tabular-nums">
              <thead>
                <tr className="[&>th]:sticky [&>th]:top-14 [&>th]:z-10 [&>th]:bg-surface [&>th]:h-10 [&>th]:px-3 [&>th]:text-label [&>th]:uppercase [&>th]:text-navy-muted [&>th]:font-medium [&>th]:border-b [&>th]:border-borderSlate">
                  <th className="w-[84px] rounded-tl-panel">Score</th>
                  <th className={`${extra ? '' : 'hidden'} w-[84px]`}>Strength</th>
                  <th>Found person</th>
                  <th>Searching family</th>
                  <th className={`${extra ? '' : 'hidden'} w-[150px]`}>Sites</th>
                  <th className="w-[152px] rounded-tr-panel">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const on = r.s.id === selected;
                  return (
                    <tr
                      key={r.s.id}
                      ref={el => {
                        if (el) rowRefs.current.set(r.s.id, el);
                        else rowRefs.current.delete(r.s.id);
                      }}
                      tabIndex={on || (!selected && i === 0) ? 0 : -1}
                      aria-selected={on}
                      onClick={() => select(r.s.id)}
                      onKeyDown={e => onRowKey(e, i)}
                      className={`h-11 border-b border-borderSlate last:border-b-0 cursor-pointer outline-none focus-visible:bg-civilBlue-soft motion-safe:transition-[background-color] motion-safe:duration-150 ${
                        on ? 'bg-terracotta-soft/50 shadow-edge-accent' : 'hover:bg-canvas'
                      }`}
                    >
                      <td className="px-3">
                        <ScoreBar score={r.s.score} />
                        <span className={`${extra ? 'hidden' : ''} block text-xs text-navy-muted`}>{r.s.score < 0 ? 'Not suggested' : r.s.ambiguous ? 'Ambiguous' : r.s.band}</span>
                      </td>
                      <td className={`${extra ? '' : 'hidden'} px-3 text-navy`}>{r.s.score < 0 ? '–' : r.s.ambiguous ? 'Ambiguous' : r.s.band}</td>
                      <td className="px-3 py-1.5">
                        <span className="flex items-center gap-2 min-w-0">
                          <Avatar name={r.found?.name} />
                          <span className="min-w-0">
                            <span className="block font-medium text-navy truncate">{r.found ? r.found.name ?? 'Name not known' : 'Not synced yet'}</span>
                            <span className={`${extra ? 'hidden' : ''} block text-xs text-navy-muted truncate`}>{siteName(r.found?.site ?? '')}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-1.5 min-w-0">
                        <span className="block text-navy truncate">{searchingFamily(r.seeking)}</span>
                        <span className="block text-xs text-navy-muted truncate">
                          for {r.seeking?.name ?? 'name not known'}
                          <span className={`${extra ? 'hidden' : ''}`}>, {siteName(r.seeking?.site ?? '')}</span>
                        </span>
                      </td>
                      <td className={`${extra ? '' : 'hidden'} px-3 text-navy-muted`}>
                        <span className="block truncate">{siteName(r.found?.site ?? '')}</span>
                        <span className="block truncate">{siteName(r.seeking?.site ?? '')}</span>
                      </td>
                      <td className="px-3">
                        <StatusPill status={r.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!data && <SkeletonRows />}
            {empty}
          </div>
          {split ? (
          <div className="sticky top-[calc(3.5rem+1.5rem)] h-[calc(100dvh-3.5rem-3rem)] min-h-[420px]">
            {data && selected ? (
              <EvidencePanel key={selected} id={selected} data={data} />
            ) : (
              <div className="panel h-full flex items-center justify-center">
                {data ? <EmptyState title="Nothing selected" hint="Choose a match in the table to see its evidence here." /> : <SkeletonRows rows={6} />}
              </div>
            )}
          </div>
          ) : (
            <Drawer open={Boolean(pairParam && data)} onClose={() => go('/console/matches')} label="Match evidence" side="right">
              {pairParam && data && <EvidencePanel key={pairParam} id={pairParam} data={data} variant="full" onBack={() => go('/console/matches')} />}
            </Drawer>
          )}
        </div>
      ) : (
        <>
          <ul className="space-y-2" aria-label="Matches">
            {rows.map(r => (
              <li key={r.s.id}>
                <button type="button" onClick={() => select(r.s.id)} className="panel w-full p-3 text-left flex items-center gap-3 hover:shadow-raised active:bg-pressed">
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <ScoreBar score={r.s.score} />
                      <StatusPill status={r.status} />
                    </span>
                    <span className="mt-2 block text-sm font-medium text-navy truncate">
                      {r.found ? r.found.name ?? 'Name not known' : 'Not synced yet'}
                      <span className="font-normal text-navy-muted">, {siteName(r.found?.site ?? '')}</span>
                    </span>
                    <span className="block text-sm text-navy-muted truncate">
                      Searched by {searchingFamily(r.seeking)}, {siteName(r.seeking?.site ?? '')}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="w-5 h-5 text-navy-muted shrink-0" strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
          {!data && (
            <div className="panel">
              <SkeletonRows rows={5} />
            </div>
          )}
          {empty && <div className="panel">{empty}</div>}
          <Drawer open={Boolean(pairParam && data)} onClose={() => go('/console/matches')} label="Match evidence" side="full">
            {pairParam && data && <EvidencePanel key={pairParam} id={pairParam} data={data} variant="full" onBack={() => go('/console/matches')} />}
          </Drawer>
        </>
      )}
    </>
  );
};
