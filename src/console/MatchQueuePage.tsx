import React, { useState } from 'react';
import { ArrowLeft, Check, Circle, HelpCircle, Minus, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AUTHORITY, SITES, siteName } from '../sites';
import { familyQuestion, pairState, type PairStatus } from '../matchStatus';
import { EvidenceList, NoteBox } from '../screens/MatchReviewScreen';
import type { PersonRecord, Suggestion } from '../types';
import { go, linkProps, useRoute } from '../route';
import { personLabel, useConsoleData, type ConsoleData } from './data';

export const MATCH_NOTICE = 'Matches are suggestions only. Authorised staff must verify identity and relationships before disclosure.';

export const PAIR_STATUS: Record<PairStatus, [string, string]> = {
  open: ['Open', 'bg-pending-bg text-pending border-pending-border'],
  partly_confirmed: ['1 of 2 sites confirmed', 'bg-civilBlue-soft text-civilBlue border-civilBlue/20'],
  confirmed: ['Family check next', 'bg-civilBlue-soft text-civilBlue border-civilBlue/20'],
  verified: ['Verified', 'bg-verified-bg text-verified border-verified-border'],
  ruled_out: ['Rejected', 'bg-urgent-bg text-urgent border-urgent-border']
};

type Filter = 'decide' | 'verified' | 'ruled_out' | 'all';
const FILTERS: Array<[Filter, string]> = [
  ['decide', 'Needs a decision'],
  ['verified', 'Verified'],
  ['ruled_out', 'Rejected'],
  ['all', 'All']
];
const inFilter = (f: Filter, st: PairStatus) =>
  f === 'all' || (f === 'decide' ? st === 'open' || st === 'partly_confirmed' || st === 'confirmed' : st === f);

export const Notice: React.FC = () => (
  <p className="card py-2.5 mb-4 bg-pending-bg border-pending-border text-sm font-medium text-navy">{MATCH_NOTICE}</p>
);

/** /console/matches: every suggestion across sites; the selected one (?pair=) shows its evidence beside the table. */
export const MatchQueuePage: React.FC = () => {
  const { params } = useRoute();
  const data = useConsoleData();
  const [filter, setFilter] = useState<Filter>('decide');
  const [query, setQuery] = useState('');
  const selected = params.get('pair');

  const q = query.trim().toLowerCase();
  // The server stops suggesting a rejected pair; keep it listed (without a score) from its reject event.
  const rejectedOnly: Suggestion[] = [];
  for (const [pid, evs] of data?.events ?? []) {
    if (data!.states.has(pid) || !evs.some(e => e.kind === 'rule_out')) continue;
    const [found_id, seeking_id] = pid.split(':');
    rejectedOnly.push({ id: pid, found_id, seeking_id, score: -1, band: 'Possible', ambiguous: false, reasons_for: [], reasons_against: [], unknown: [], ask_next: null });
  }
  const statusOf = (pid: string) => (data!.states.get(pid) ?? pairState(data!.events.get(pid) ?? [])).status;
  const rows = [...(data?.suggestions ?? []), ...rejectedOnly]
    .filter(s => inFilter(filter, statusOf(s.id)))
    .filter(s => {
      if (!q) return true;
      const f = data!.byId.get(s.found_id);
      const k = data!.byId.get(s.seeking_id);
      return [f?.name, f?.code, k?.name, k?.code, k?.relative_name].some(v => v?.toLowerCase().includes(q));
    })
    .sort((a, b) => b.score - a.score);

  const noneAtAll = data !== undefined && data.suggestions.length === 0 && rejectedOnly.length === 0;
  const select = (id: string) => go(`/console/matches?pair=${encodeURIComponent(id)}`);

  const queue = (
    <section className="min-w-0">
      <div className="flex flex-wrap gap-2 mb-3">
        <div role="tablist" aria-label="Show" className="flex flex-wrap p-1 rounded-button bg-pressed">
          {FILTERS.map(([f, label]) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`min-h-[40px] px-3 rounded-badge text-sm font-medium ${filter === f ? 'bg-surface text-navy shadow-subtle' : 'text-navy-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          aria-label="Search matches"
          placeholder="Name or code"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="input h-11 flex-1 min-w-[160px]"
        />
      </div>

      {/* Table from tablet width; cards on phones so nothing scrolls sideways. */}
      <div className="hidden md:block card p-0">
        <table className="w-full text-sm text-left table-fixed">
          <thead className="text-navy-muted">
            <tr className="[&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-pressed [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium">
              <th className="w-20 rounded-tl-card">Score</th>
              <th>Found person</th>
              <th>Searched for</th>
              <th className="w-44 rounded-tr-card">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => {
              const f = data!.byId.get(s.found_id);
              const k = data!.byId.get(s.seeking_id);
              const st = PAIR_STATUS[statusOf(s.id)];
              const on = s.id === selected;
              return (
                <tr
                  key={s.id}
                  onClick={() => select(s.id)}
                  className={`border-t border-borderSlate cursor-pointer align-top ${on ? 'bg-terracotta-soft' : 'hover:bg-canvas'}`}
                >
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => select(s.id)}
                      aria-pressed={on}
                      aria-label={`Score ${s.score < 0 ? 'none' : s.score}, open evidence`}
                      className={`block text-lg font-semibold leading-tight rounded-badge ${s.band === 'Strong' ? 'text-verified' : 'text-pending'}`}
                    >
                      {s.score < 0 ? '–' : s.score}
                    </button>
                    <span className="block text-xs text-navy-muted">{s.score < 0 ? 'Not suggested' : s.ambiguous ? 'Ambiguous' : s.band}</span>
                  </td>
                  <td className="px-3 py-2.5 min-w-0">
                    <span className="block truncate text-base text-navy">{personLabel(f)}</span>
                    <span className="block truncate text-xs text-navy-muted">{siteName(f?.site ?? '')}</span>
                  </td>
                  <td className="px-3 py-2.5 min-w-0">
                    <span className="block truncate text-base text-navy">{personLabel(k)}</span>
                    <span className="block truncate text-xs text-navy-muted">{siteName(k?.site ?? '')}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`badge ${st[1]}`}>{st[0]}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data && rows.length === 0 && <p className="p-4 text-center text-base text-navy-muted">{noneAtAll ? 'No matches yet' : 'No matches here.'}</p>}
      </div>

      <div className="md:hidden card-stack">
        {rows.map(s => {
          const f = data!.byId.get(s.found_id);
          const k = data!.byId.get(s.seeking_id);
          const st = PAIR_STATUS[statusOf(s.id)];
          return (
            <button key={s.id} type="button" onClick={() => select(s.id)} className="card w-full text-left hover:border-navy/30 active:bg-pressed">
              <span className="flex flex-wrap items-baseline gap-2">
                <span className={`text-xl font-semibold ${s.band === 'Strong' ? 'text-verified' : 'text-pending'}`}>{s.score < 0 ? '–' : s.score}</span>
                <span className="text-sm text-navy">{s.score < 0 ? 'No longer suggested' : s.ambiguous ? 'Ambiguous' : `${s.band} match`}</span>
                <span className={`badge text-sm ${st[1]}`}>{st[0]}</span>
              </span>
              <span className="block text-base font-semibold text-navy truncate mt-1">
                {personLabel(f)} ↔ {personLabel(k)}
              </span>
              <span className="block text-sm text-navy-muted">
                {siteName(f?.site ?? '')} → {siteName(k?.site ?? '')}
              </span>
            </button>
          );
        })}
        {data && rows.length === 0 && <p className="card text-center text-base text-navy-muted">{noneAtAll ? 'No matches yet' : 'No matches here.'}</p>}
      </div>
    </section>
  );

  return (
    <>
      <h1 className="screen-title">Match queue</h1>
      <Notice />
      <div className="lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1fr)_560px] lg:gap-6 lg:items-start">
        {/* On phones and tablets the selected match replaces the list. */}
        <div className={selected ? 'hidden lg:block' : ''}>{queue}</div>
        {selected ? (
          <div className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:pr-1">
            <a {...linkProps('/console/matches')} className="btn-text -ml-2 mb-2 gap-1 lg:hidden">
              <ArrowLeft className="w-5 h-5" strokeWidth={1.75} /> Back to the queue
            </a>
            {data && <MatchDetail key={selected} id={selected} data={data} />}
          </div>
        ) : (
          <p className="hidden lg:block card text-base text-navy-muted">Select a match to see the evidence and decide.</p>
        )}
      </div>
    </>
  );
};

const PersonCard: React.FC<{ r?: PersonRecord; title: string }> = ({ r, title }) => {
  const rel = r?.relative_relation ? ` (${r.relative_relation})` : '';
  const rows: Array<[string, string | null | undefined]> = r
    ? [
        ['Gender', r.gender === 'unknown' ? null : r.gender],
        ['Age', r.age_band],
        ['Village', r.village],
        [r.type === 'found' ? `Relative${rel}` : `Searching${rel}`, r.relative_name],
        ['Clothing, marks', r.clothing_marks],
        r.type === 'found' ? ['Found', r.found_where] : ['Last seen', r.last_seen],
        ...(r.type === 'seeking' ? ([['Phone', r.contact_phone]] as Array<[string, string | null | undefined]>) : [])
      ]
    : [];
  return (
    <div className="min-w-0 card p-3">
      <p className="text-xs text-navy-muted">{title}</p>
      {r ? (
        <>
          <div className="flex items-center gap-2 mt-1 mb-2">
            {r.photo && <img src={r.photo} alt="" className="w-10 h-10 rounded-badge object-cover border border-borderSlate" />}
            <a {...linkProps(`/console/records/${r.id}`)} className="min-w-0 text-base font-semibold text-civilBlue hover:underline break-words">
              {r.name ?? 'Name not known'}
            </a>
          </div>
          <p className="text-xs text-navy-muted mb-2">
            {siteName(r.site)} · {r.code}
          </p>
          <dl className="space-y-1">
            {rows.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-navy-muted">{label}</dt>
                <dd className={`text-sm break-words first-letter:uppercase ${value ? 'text-navy' : 'text-navy-muted italic'}`}>{value || 'Not recorded'}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="text-sm text-navy-muted">Not synced to the console yet.</p>
      )}
    </div>
  );
};

/** Evidence and the authority's decision for one pair. */
const MatchDetail: React.FC<{ id: string; data: ConsoleData }> = ({ id, data }) => {
  const { addEvent } = useApp();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [familyOpen, setFamilyOpen] = useState(false);
  const [mismatchOpen, setMismatchOpen] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [identityChecked, setIdentityChecked] = useState(false);

  const [foundId, seekingId] = id.split(':');
  const s = data.suggestions.find(x => x.id === id);
  const found = data.byId.get(foundId);
  const seeking = data.byId.get(seekingId);
  const events = data.events.get(id) ?? [];
  const state = pairState(events); // from the events: a rejected pair is no longer suggested
  const closed = state.status === 'ruled_out' || state.status === 'verified';
  const bothSites = state.status === 'confirmed';
  const accepted = state.confirmedBy[AUTHORITY.id];
  const detail = found?.private_detail?.trim();

  const accept = async () => {
    if (!accepted) await addEvent('confirm', foundId, seekingId, 'Accepted at the authority console');
    if (bothSites) setFamilyOpen(true);
  };

  if (!s && !events.length) return <p className="card text-base text-navy-muted">This match is no longer suggested.</p>;

  return (
    <article aria-label="Match evidence">
      {s && (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-3">
          <span className={`text-score font-semibold ${s.band === 'Strong' ? 'text-verified' : 'text-pending'}`}>{s.score}</span>
          <span className="text-base font-medium text-navy">{s.ambiguous ? 'Ambiguous: another candidate scores almost the same' : `${s.band} match`}</span>
          <span className={`badge ${PAIR_STATUS[state.status][1]}`}>{PAIR_STATUS[state.status][0]}</span>
        </div>
      )}
      {s?.nameless && <p className="card mb-3 bg-pending-bg border-pending-border text-base font-medium text-navy">No name recorded – matched on description</p>}

      {state.status === 'verified' && found && (
        <p className="card mb-3 bg-verified-bg border-verified-border text-base text-navy">
          <span className="font-semibold text-verified">Verified with the family</span> by {state.verifiedBy?.officer} ({siteName(state.verifiedBy?.site ?? '')}). The
          person is at {siteName(found.site)}.
        </p>
      )}
      {state.ruledOut && (
        <p className="card mb-3 bg-urgent-bg border-urgent-border text-base text-navy">
          Rejected by {state.ruledOut.officer} at {siteName(state.ruledOut.site)}
          {state.ruledOut.reason ? `: ${state.ruledOut.reason}` : ''}. It will not be suggested again.
        </p>
      )}
      {state.lastMismatch && !closed && !bothSites && (
        <p className="card mb-3 bg-pending-bg border-pending-border text-base text-navy">
          The family's answer did not match ({state.lastMismatch.officer}, {siteName(state.lastMismatch.site)}
          {state.lastMismatch.reason ? `: ${state.lastMismatch.reason}` : ''}). Site officers need to confirm again.
        </p>
      )}

      {s?.ask_next && !closed && (
        <div className="card mb-3 bg-pending-bg border-pending-border">
          <p className="text-sm font-medium text-pending">Ask next</p>
          <p className="text-lg font-semibold text-navy">{s.ask_next}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-4">
        <PersonCard r={found} title="Found person" />
        <PersonCard r={seeking} title="Being searched for" />
      </div>

      {s && (
        <div className="card mb-3">
          <EvidenceList title="For" items={s.reasons_for} empty="Nothing in favour yet." icon={<Plus className="w-4 h-4 text-verified" strokeWidth={1.75} />} />
          <EvidenceList title="Against" items={s.reasons_against} empty="Nothing against." icon={<Minus className="w-4 h-4 text-urgent" strokeWidth={1.75} />} />
          <EvidenceList
            title="Unknown"
            items={s.unknown.map(u => `${u} not recorded on one side`)}
            empty="Everything is recorded on both sides."
            icon={<HelpCircle className="w-4 h-4 text-navy-muted" strokeWidth={1.75} />}
          />
        </div>
      )}

      <section className="card mb-3">
        <h2 className="text-sm font-medium text-navy-muted mb-2">Confirmation</h2>
        <ol className="space-y-2">
          {[...SITES.map(x => ({ id: x.id, label: `Officer at ${x.name}` })), { id: AUTHORITY.id, label: 'Authority (this console)' }].map(x => {
            const e = state.confirmedBy[x.id] ?? (state.status === 'verified' ? events.find(ev => ev.kind === 'confirm' && ev.site === x.id) : undefined);
            return (
              <li key={x.id} className="flex items-center gap-2 text-base">
                {e ? <Check className="w-5 h-5 shrink-0 text-verified" strokeWidth={1.75} /> : <Circle className="w-5 h-5 shrink-0 text-navy-muted" strokeWidth={1.75} />}
                <span className="min-w-0 flex-1">{x.label}</span>
                <span className={`text-sm shrink-0 ${e ? 'text-verified' : 'text-navy-muted'}`}>{e ? e.officer : 'Waiting'}</span>
              </li>
            );
          })}
          <li className="flex items-center gap-2 text-base">
            {state.verifiedBy ? <Check className="w-5 h-5 shrink-0 text-verified" strokeWidth={1.75} /> : <Circle className="w-5 h-5 shrink-0 text-navy-muted" strokeWidth={1.75} />}
            <span className="min-w-0 flex-1">Family check</span>
            <span className={`text-sm shrink-0 ${state.verifiedBy ? 'text-verified' : 'text-navy-muted'}`}>
              {state.verifiedBy ? state.verifiedBy.officer : bothSites ? 'Now' : 'After both sites'}
            </span>
          </li>
        </ol>
        {state.needInfo.length > 0 && (
          <p className="text-sm text-pending mt-2">More information requested by {state.needInfo.map(e => `${e.officer} (${siteName(e.site)})`).join(', ')}.</p>
        )}
      </section>

      {bothSites && familyOpen && (
        <section className="card mb-3 bg-civilBlue-soft border-civilBlue/20">
          <p className="text-sm font-medium text-civilBlue">Both site officers confirmed. Last step: family check</p>
          {detail ? (
            <>
              <p className="text-lg font-semibold text-navy mt-1">Ask the family: {familyQuestion(detail)}</p>
              {showAnswer ? (
                <p className="text-base text-navy mt-2">
                  <span className="text-sm text-navy-muted">Expected answer (staff only): </span>
                  {detail}
                </p>
              ) : (
                <button type="button" onClick={() => setShowAnswer(true)} className="btn-text -ml-2">
                  Show expected answer
                </button>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <button type="button" onClick={() => addEvent('family_match', foundId, seekingId, 'Family answer matches')} className="btn-primary w-auto px-5">
                  Answer matches: mark verified
                </button>
                <button type="button" onClick={() => setMismatchOpen(o => !o)} className="btn-text text-urgent">
                  Answer does not match
                </button>
              </div>
              {mismatchOpen && (
                <NoteBox
                  id="console-mismatch-note"
                  label="What did the family say?"
                  submitLabel="Send back to the site officers"
                  required="Add a short note for the site officers."
                  onSubmit={note => {
                    addEvent('family_mismatch', foundId, seekingId, note);
                    setMismatchOpen(false);
                    setFamilyOpen(false);
                  }}
                />
              )}
            </>
          ) : (
            <>
              <p className="text-base text-navy mt-1">No private detail recorded. Verify identity with a document or a trusted local person.</p>
              <label className="flex items-start gap-3 mt-2 min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={identityChecked}
                  onChange={e => setIdentityChecked(e.target.checked)}
                  className="mt-1 w-5 h-5 shrink-0 accent-terracotta"
                />
                <span className="text-base text-navy">I checked their identity with a document or a trusted local person.</span>
              </label>
              <button
                type="button"
                disabled={!identityChecked}
                onClick={() => addEvent('family_match', foundId, seekingId, 'Identity verified with a document or trusted local person')}
                className="btn-primary w-auto px-5 mt-2 disabled:cursor-not-allowed"
              >
                Mark as verified
              </button>
            </>
          )}
        </section>
      )}

      {!closed && (
        <section className="card" aria-label="Decision">
          <h2 className="text-sm font-medium text-navy-muted mb-2">Your decision</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={accept}
              disabled={Boolean(accepted) && (!bothSites || familyOpen)}
              className="btn-primary w-auto px-6 bg-verified hover:bg-verified/90 active:bg-verified disabled:cursor-default"
            >
              <Check className="w-5 h-5" strokeWidth={2} />
              {bothSites ? 'Accept: run the family check' : accepted ? 'Accepted' : 'Accept'}
            </button>
            <button
              type="button"
              onClick={() => setRejectOpen(o => !o)}
              className="h-12 px-6 rounded-button border border-urgent text-urgent text-base font-semibold hover:bg-urgent-bg"
            >
              Reject
            </button>
          </div>
          <p className="text-sm text-navy-muted mt-2">
            {bothSites
              ? 'Both sites confirmed. Accepting opens the family question; the match is verified when the answer matches.'
              : accepted
                ? `You accepted. Waiting for ${SITES.filter(x => !state.confirmedBy[x.id]).map(x => `the officer at ${x.name}`).join(' and ')}.`
                : 'Accept records your confirmation. The family check opens once both site officers have confirmed.'}
          </p>
          {rejectOpen && (
            <NoteBox
              id="reject-reason"
              label="Why is this not the same person? (required)"
              submitLabel="Reject this match"
              required="Give a reason. It is shown to both sites."
              onSubmit={note => {
                addEvent('rule_out', foundId, seekingId, note);
                setRejectOpen(false);
              }}
            />
          )}
        </section>
      )}
    </article>
  );
};
