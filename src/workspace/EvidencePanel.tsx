import React, { useState } from 'react';
import { ArrowLeft, Check, HelpCircle, Info, Minus, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AUTHORITY, siteName } from '../sites';
import { familyQuestion, pairState, requiredFor } from '../matchStatus';
import type { PersonRecord, SiteId } from '../types';
import { useElementWidth } from '../useIsDesktop';
import type { ConsoleData } from './data';
import { StatusPill } from './ui';

export const MATCH_NOTICE = 'Matches are suggestions only. Authorised staff must verify identity and relationships before disclosure.';

// ---- Comparison ---------------------------------------------------------------------------------------------

type Agreement = 'same' | 'different' | 'missing' | 'none';

const squash = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
const tokens = (v: string) => new Set(v.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2));

/** A display hint only (not the matching score): do the two recorded values say the same thing? */
function agreement(a: string | null | undefined, b: string | null | undefined): Agreement {
  if (!a?.trim() || !b?.trim()) return 'missing';
  const x = squash(a);
  const y = squash(b);
  if (x === y || (x.length > 3 && y.includes(x)) || (y.length > 3 && x.includes(y))) return 'same';
  const ta = tokens(a);
  const tb = tokens(b);
  const shared = [...ta].filter(t => tb.has(t)).length;
  return shared > 0 && shared >= Math.min(ta.size, tb.size) * 0.6 ? 'same' : 'different';
}

const MARK: Record<Agreement, React.ReactNode> = {
  same: (
    <span className="text-verified" title="Same on both records">
      <Check aria-hidden className="w-4 h-4" strokeWidth={2.25} />
      <span className="sr-only">Same on both records</span>
    </span>
  ),
  different: (
    <span className="text-pending font-semibold leading-none" title="Different on the two records">
      <span aria-hidden>≠</span>
      <span className="sr-only">Different on the two records</span>
    </span>
  ),
  missing: (
    <span className="text-navy-muted/60" title="Not recorded on one side">
      <Minus aria-hidden className="w-4 h-4" strokeWidth={1.5} />
      <span className="sr-only">Not recorded on one side</span>
    </span>
  ),
  none: null
};

interface FieldRow {
  label: string;
  found: string | null;
  seeking: string | null;
  agree: Agreement;
}

function fieldRows(f?: PersonRecord, k?: PersonRecord): FieldRow[] {
  const rel = (r?: PersonRecord) => (r?.relative_name ? `${r.relative_name}${r.relative_relation ? ` (${r.relative_relation})` : ''}` : null);
  const row = (label: string, a: string | null | undefined, b: string | null | undefined, cmp = true): FieldRow => ({
    label,
    found: a?.trim() || null,
    seeking: b?.trim() || null,
    agree: cmp ? agreement(a, b) : 'none'
  });
  return [
    row('Name', f?.name, k?.name),
    row('Gender', f && f.gender !== 'unknown' ? f.gender : null, k && k.gender !== 'unknown' ? k.gender : null),
    row('Age', f?.age_band, k?.age_band),
    row('Village', f?.village, k?.village),
    row('Relative', rel(f), rel(k)),
    row('Clothing or marks', f?.clothing_marks, k?.clothing_marks),
    row('Found / last seen', f?.found_where, k?.last_seen),
    row('Site and code', f ? `${siteName(f.site)}, ${f.code}` : null, k ? `${siteName(k.site)}, ${k.code}` : null, false)
  ];
}

/** Field by field, the found person against the family's search, with a same / different / missing mark. */
export const ComparisonTable: React.FC<{ found?: PersonRecord; seeking?: PersonRecord }> = ({ found, seeking }) => {
  const [showEmpty, setShowEmpty] = useState(false);
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const rows = fieldRows(found, seeking);
  const empty = rows.filter(r => !r.found && !r.seeking);
  const shown = showEmpty ? rows : rows.filter(r => r.found || r.seeking);
  const stacked = width > 0 && width < 440;
  const value = (v: string | null) => (v ? <span className="first-letter:uppercase inline-block">{v}</span> : <span className="text-navy-muted">Not recorded</span>);

  return (
    <div ref={ref}>
      {stacked ? (
        <dl className="divide-y divide-borderSlate rounded-panel bg-surface shadow-panel">
          {shown.map(r => (
            <div key={r.label} className="px-3 py-2 flex gap-3">
              <div className="flex-1 min-w-0">
                <dt className="text-label uppercase text-navy-muted">{r.label}</dt>
                <dd className="text-table text-navy break-words">
                  <span className="text-navy-muted">Found: </span>
                  {value(r.found)}
                </dd>
                <dd className="text-table text-navy break-words">
                  <span className="text-navy-muted">Searching: </span>
                  {value(r.seeking)}
                </dd>
              </div>
              <span className="pt-4 shrink-0 w-4 flex justify-center">{MARK[r.agree]}</span>
            </div>
          ))}
        </dl>
      ) : (
        <table className="w-full text-table text-left table-fixed rounded-panel bg-surface shadow-panel">
          <thead>
            <tr className="h-7 [&>th]:px-3 [&>th]:text-label [&>th]:uppercase [&>th]:font-medium [&>th]:text-navy-muted border-b border-borderSlate">
              <th className="w-[124px]">Field</th>
              <th>Found person</th>
              <th>Searching family</th>
              <th className="w-8">
                <span className="sr-only">Agreement</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map(r => (
              <tr key={r.label} className="border-b border-borderSlate last:border-b-0 align-top">
                <th scope="row" className="px-3 py-[5px] text-xs font-normal text-navy-muted whitespace-nowrap">
                  {r.label}
                </th>
                <td className="px-3 py-[5px] text-navy break-words">{value(r.found)}</td>
                <td className="px-3 py-[5px] text-navy break-words">{value(r.seeking)}</td>
                <td className="py-[5px] pr-3">
                  <span className="flex justify-center">{MARK[r.agree]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {empty.length > 0 && (
        <button type="button" onClick={() => setShowEmpty(s => !s)} className="mt-1 min-h-[32px] text-xs font-medium text-civilBlue hover:underline">
          {showEmpty ? 'Hide empty fields' : `Show empty fields (${empty.length})`}
        </button>
      )}
    </div>
  );
};

// ---- Evidence panel -----------------------------------------------------------------------------------------

const SHOWN = 3; // lines per column before "Show all"

const EvidenceColumn: React.FC<{ title: string; items: string[]; empty: string; icon: React.ReactNode }> = ({ title, items, empty, icon }) => {
  const [all, setAll] = useState(false);
  const visible = all ? items : items.slice(0, SHOWN);
  return (
  <section className="min-w-0">
    <h3 className="label-caps">
      {title} <span className="tabular-nums text-navy-muted/70">{items.length}</span>
    </h3>
    {items.length ? (
      <ul className="mt-1 space-y-0.5">
        {visible.map((t, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs leading-4 text-navy" title={t}>
            <span aria-hidden className="mt-px shrink-0">
              {icon}
            </span>
            <span className="min-w-0 line-clamp-1 lg:line-clamp-1">{t}</span>
          </li>
        ))}
        {items.length > SHOWN && (
          <li>
            <button type="button" onClick={() => setAll(a => !a)} className="min-h-[44px] lg:min-h-0 text-xs font-medium text-civilBlue hover:underline">
              {all ? 'Show fewer' : `Show all ${items.length}`}
            </button>
          </li>
        )}
      </ul>
    ) : (
      <p className="mt-1.5 text-xs leading-4 text-navy-muted">{empty}</p>
    )}
  </section>
  );
};

interface EvidencePanelProps {
  id: string;
  data: ConsoleData;
  /** 'pane': beside a list; 'full': full screen or slide-over, with a back button. */
  variant?: 'pane' | 'full';
  onBack?: () => void;
  /** 'authority': Accept, Reject and the family check. 'site': read-only, with the site's own confirmation. */
  mode?: 'authority' | 'site';
  /** Site mode: the volunteer's site. */
  site?: SiteId;
}

/**
 * Evidence for one pair, sized to one screen: a fixed header (names, score, status), a body that is the only
 * part that scrolls, and a fixed footer with the actions. The same component in the console and the field app.
 */
export const EvidencePanel: React.FC<EvidencePanelProps> = ({ id, data, variant = 'pane', onBack, mode = 'authority', site }) => {
  const { addEvent } = useApp();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [familyOpen, setFamilyOpen] = useState(false);
  const [mismatchOpen, setMismatchOpen] = useState(false);
  const [mismatchNote, setMismatchNote] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [identityChecked, setIdentityChecked] = useState(false);
  const [siteNote, setSiteNote] = useState('');
  const [problemOpen, setProblemOpen] = useState(false);
  const [problemNote, setProblemNote] = useState('');
  const [problemSent, setProblemSent] = useState(false);

  const [foundId, seekingId] = id.split(':');
  const s = data.suggestions.find(x => x.id === id);
  const found = data.byId.get(foundId);
  const seeking = data.byId.get(seekingId);
  const events = data.events.get(id) ?? [];
  const required = requiredFor(id, data.byId);
  const state = data.states.get(id) ?? pairState(events, required); // a rejected pair is no longer suggested
  const closed = state.status === 'ruled_out' || state.status === 'verified';
  const allSites = state.status === 'confirmed';
  const accepted = state.confirmedBy[AUTHORITY.id];
  const detail = found?.private_detail?.trim();
  const full = variant === 'full';
  const authority = mode === 'authority';
  const confirmedHere = site ? state.confirmedBy[site] : undefined;
  const siteMustConfirm = Boolean(site && required.includes(site));
  const waitingFor = required.filter(x => !state.confirmedBy[x]).map(siteName);

  const accept = async () => {
    // The authority's acceptance is recorded as its confirmation; when it is the only required one it completes the sites.
    if (!accepted) await addEvent('confirm', foundId, seekingId, 'Accepted at the authority console');
    if (allSites || required.includes(AUTHORITY.id)) setFamilyOpen(true);
  };
  const reject = () => {
    if (!reason.trim()) {
      setReasonError('Give a reason. It is shown to both sites.');
      return;
    }
    addEvent('rule_out', foundId, seekingId, reason);
    setRejectOpen(false);
    setReason('');
  };

  // ---- Header: the two names, the score and the status on one line ----
  const header = (
    <div className={`flex-none flex flex-wrap items-center gap-x-4 gap-y-1 px-4 lg:px-5 py-1.5 min-h-[48px] border-b border-borderSlate bg-surface ${full ? '' : 'rounded-t-panel'}`}>
      {onBack && (
        <button type="button" onClick={onBack} aria-label="Back" className="-ml-2 w-11 h-11 shrink-0 rounded-panel flex items-center justify-center text-navy hover:bg-pressed">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
      )}
      <h2 className="flex-1 min-w-[12rem] text-base font-semibold text-navy leading-tight" title={`${found?.name ?? 'Name not known'} and ${seeking?.name ?? 'name not known'}`}>
        <span className="line-clamp-2">
          {found?.name ?? 'Name not known'} <span className="font-normal text-navy-muted">and</span> {seeking?.name ?? 'name not known'}
        </span>
      </h2>
      <div className="flex items-center gap-3 shrink-0">
        {s && s.score >= 0 && (
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-title font-semibold text-navy tabular-nums">{s.score}</span>
            <span className="text-sm text-navy-muted">{s.ambiguous ? 'Ambiguous' : `${s.band} match`}</span>
          </span>
        )}
        <StatusPill status={state.status} />
      </div>
    </div>
  );

  if (!s && !events.length) {
    return (
      <div className={`flex flex-col ${full ? 'h-full bg-canvas' : 'panel h-full'}`}>
        {header}
        <p className="p-5 text-sm text-navy-muted">This match is no longer suggested.</p>
      </div>
    );
  }

  // ---- Footer actions ----
  let actions: React.ReactNode = null;
  if (authority && !closed) {
    if (rejectOpen) {
      actions = (
        <div className="w-full space-y-2">
          <label htmlFor={`reject-${id}`} className="block text-sm font-medium text-navy">
            Why is this not the same person?
          </label>
          <textarea
            id={`reject-${id}`}
            rows={2}
            value={reason}
            autoFocus
            onChange={e => {
              setReason(e.target.value);
              setReasonError('');
            }}
            className="ws-input h-auto py-2 resize-none"
          />
          {reasonError && <p className="text-sm text-urgent">{reasonError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRejectOpen(false)} className="ws-btn-quiet">
              Cancel
            </button>
            <button type="button" onClick={reject} className="ws-btn bg-urgent text-white hover:bg-urgent/90">
              Reject match
            </button>
          </div>
        </div>
      );
    } else if (familyOpen && (allSites || state.status === 'confirmed')) {
      actions = (
        <div className="flex gap-2">
          {detail && (
            <button type="button" onClick={() => setMismatchOpen(o => !o)} className="ws-btn-danger">
              Answer does not match
            </button>
          )}
          <button
            type="button"
            disabled={!detail && !identityChecked}
            onClick={() => addEvent('family_match', foundId, seekingId, detail ? 'Family answer matches' : 'Identity verified with a document or trusted local person')}
            className="ws-btn-accent"
          >
            <Check className="w-4 h-4" strokeWidth={2} />
            {detail ? 'Answer matches: verify' : 'Mark as verified'}
          </button>
        </div>
      );
    } else {
      actions = (
        <div className="flex gap-2">
          <button type="button" onClick={() => setRejectOpen(true)} className="ws-btn-danger">
            Reject
          </button>
          <button type="button" onClick={accept} disabled={Boolean(accepted) && !allSites} className="ws-btn-accent">
            <Check className="w-4 h-4" strokeWidth={2} />
            {accepted && !allSites ? 'Accepted' : 'Accept match'}
          </button>
        </div>
      );
    }
  } else if (!authority && !closed && siteMustConfirm && !confirmedHere) {
    actions = (
      <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
        <label htmlFor={`site-note-${id}`} className="sr-only">
          Note for the authority (optional)
        </label>
        <input
          id={`site-note-${id}`}
          value={siteNote}
          onChange={e => setSiteNote(e.target.value)}
          placeholder="Note (optional)"
          className="ws-input flex-1 min-w-[10rem] sm:w-56"
        />
        <button type="button" onClick={() => addEvent('confirm', foundId, seekingId, siteNote || undefined)} className="ws-btn-accent">
          <Check className="w-4 h-4" strokeWidth={2} />
          Confirm this person is here
        </button>
      </div>
    );
  }

  const authorityLine = authority ? null : <p className="text-xs text-navy-muted">The authority makes the final decision.</p>;

  return (
    <article aria-label="Match evidence" className={`flex flex-col min-h-0 h-full ${full ? 'bg-canvas' : 'panel'}`}>
      {header}

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 lg:px-5 pt-3 pb-2 space-y-2.5">
        {state.status === 'verified' && found && (
          <p className="rounded-panel bg-verified-bg px-3 py-2 text-sm text-navy">
            <span className="font-semibold text-verified">Verified with the family</span> by {state.verifiedBy?.officer} ({siteName(state.verifiedBy?.site ?? '')}).{' '}
            {authority ? `The person is at ${siteName(found.site)}.` : `Bring the family to the help desk at ${siteName(found.site)}.`}
          </p>
        )}
        {state.ruledOut && (
          <p className="rounded-panel bg-urgent-bg px-3 py-2 text-sm text-navy">
            <span className="font-semibold text-urgent">Rejected</span> by {state.ruledOut.officer} ({siteName(state.ruledOut.site)})
            {state.ruledOut.reason ? `: ${state.ruledOut.reason}` : ''}. It will not be suggested again.
          </p>
        )}
        {state.lastMismatch && !closed && !allSites && (
          <p className="rounded-panel bg-pending-bg px-3 py-2 text-sm text-navy">
            The family's answer did not match ({state.lastMismatch.officer}, {siteName(state.lastMismatch.site)}
            {state.lastMismatch.reason ? `: ${state.lastMismatch.reason}` : ''}). The sites need to confirm again.
          </p>
        )}
        {!authority && confirmedHere && !closed && (
          <p className="rounded-panel bg-civilBlue-soft px-3 py-2 text-sm text-navy">
            <span className="font-semibold">You confirmed this person is here.</span> Ask the family to wait. The authority will verify and you will be notified.
          </p>
        )}
        {s?.nameless && <p className="rounded-panel bg-pending-bg px-3 py-2 text-sm text-navy">No name recorded: matched on description.</p>}

        <ComparisonTable found={found} seeking={seeking} />

        {s?.ask_next && !closed && (
          <p className="rounded-panel bg-terracotta-soft/60 shadow-edge-accent px-3 py-2 text-sm text-navy">
            <span className="font-semibold text-terracotta">Ask next: </span>
            {s.ask_next}
          </p>
        )}

        {s && (
          <div className="grid gap-4 sm:grid-cols-3">
            <EvidenceColumn title="For" items={s.reasons_for} empty="Nothing in favour yet." icon={<Plus className="w-3 h-3 text-verified" strokeWidth={2.5} />} />
            <EvidenceColumn title="Against" items={s.reasons_against} empty="Nothing against." icon={<Minus className="w-3 h-3 text-urgent" strokeWidth={2.5} />} />
            <EvidenceColumn
              title="Unknown"
              items={s.unknown.map(u => `${u} not recorded on one side`)}
              empty="Recorded on both sides."
              icon={<HelpCircle className="w-3 h-3 text-navy-muted" strokeWidth={2} />}
            />
          </div>
        )}

        <section aria-label="Verification">
          <h3 className="sr-only">Verification</h3>
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {[
              ...required.map(x => ({
                key: x,
                label: x === AUTHORITY.id ? 'Authority' : siteName(x),
                e: state.confirmedBy[x] ?? (state.status === 'verified' ? events.find(ev => ev.kind === 'confirm' && ev.site === x) : undefined)
              })),
              { key: 'family', label: 'Family check', e: state.verifiedBy ?? undefined }
            ].map((st, i, all) => (
              <li key={st.key} className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center ${st.e ? 'bg-verified text-white' : 'bg-surface text-navy-muted shadow-panel'}`}
                  aria-hidden
                >
                  {st.e ? <Check className="w-3 h-3" strokeWidth={3} /> : <span className="text-[11px] tabular-nums">{i + 1}</span>}
                </span>
                <span className="text-xs text-navy whitespace-nowrap">
                  <span className="font-medium">{st.label}</span>{' '}
                  <span className={st.e ? 'text-verified' : 'text-navy-muted'}>
                    {st.e ? st.e.officer : st.key === 'family' ? (allSites ? 'now' : 'after the sites') : 'waiting'}
                  </span>
                </span>
                {i < all.length - 1 && <span aria-hidden className="w-6 h-px bg-borderSlate" />}
              </li>
            ))}
          </ol>
          {accepted && !required.includes(AUTHORITY.id) && <p className="mt-2 text-xs text-navy-muted">Accepted at the authority console by {accepted.officer}.</p>}
          {state.needInfo.length > 0 && (
            <p className="mt-1 text-xs text-pending">
              Notes for the authority:{' '}
              {state.needInfo.map(e => `${e.officer} (${siteName(e.site)})${e.reason ? `: ${e.reason}` : ''}`).join('; ')}
            </p>
          )}
        </section>

        {authority && familyOpen && allSites && !closed && (
          <section className="raised p-4" aria-label="Family check">
            <p className="label-caps">Family check</p>
            {detail ? (
              <>
                <p className="mt-1 text-base font-semibold text-navy">Ask the family: {familyQuestion(detail)}</p>
                {showAnswer ? (
                  <p className="mt-2 text-sm text-navy">
                    <span className="text-navy-muted">Expected answer (staff only): </span>
                    {detail}
                  </p>
                ) : (
                  <button type="button" onClick={() => setShowAnswer(true)} className="mt-1 text-sm font-medium text-civilBlue hover:underline min-h-[32px]">
                    Show expected answer
                  </button>
                )}
                {mismatchOpen && (
                  <div className="mt-3 space-y-2">
                    <label htmlFor={`mismatch-${id}`} className="block text-sm font-medium text-navy">
                      What did the family say?
                    </label>
                    <textarea id={`mismatch-${id}`} rows={2} value={mismatchNote} onChange={e => setMismatchNote(e.target.value)} className="ws-input h-auto py-2 resize-none" />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!mismatchNote.trim()) return;
                          addEvent('family_mismatch', foundId, seekingId, mismatchNote);
                          setMismatchOpen(false);
                          setFamilyOpen(false);
                          setMismatchNote('');
                        }}
                        className="ws-btn-danger"
                      >
                        Send back to the sites
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-navy">No private detail recorded. Verify identity with a document or a trusted local person.</p>
                <label className="mt-2 flex items-start gap-3 min-h-[40px] cursor-pointer">
                  <input type="checkbox" checked={identityChecked} onChange={e => setIdentityChecked(e.target.checked)} className="mt-1 w-4 h-4 shrink-0 accent-terracotta" />
                  <span className="text-sm text-navy">I checked their identity with a document or a trusted local person.</span>
                </label>
              </>
            )}
          </section>
        )}

        {!authority && !closed && (
          <div>
            {problemSent ? (
              <p className="text-sm text-navy-muted">Your note was sent to the authority.</p>
            ) : problemOpen ? (
              <div className="space-y-2">
                <label htmlFor={`problem-${id}`} className="block text-sm font-medium text-navy">
                  What is wrong with this record?
                </label>
                <textarea id={`problem-${id}`} rows={2} value={problemNote} onChange={e => setProblemNote(e.target.value)} className="ws-input h-auto py-2 resize-none" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setProblemOpen(false)} className="ws-btn-quiet">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!problemNote.trim()) return;
                      addEvent('need_info', foundId, seekingId, problemNote);
                      setProblemSent(true);
                      setProblemOpen(false);
                    }}
                    className="ws-btn-quiet"
                  >
                    Send to the authority
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setProblemOpen(true)} className="min-h-[44px] lg:min-h-[32px] text-sm font-medium text-civilBlue hover:underline">
                Something is wrong with this record
              </button>
            )}
          </div>
        )}
        {!authority && (
          <p className="flex items-start gap-2 text-xs text-navy-muted">
            <Info aria-hidden className="w-3.5 h-3.5 mt-px shrink-0" strokeWidth={1.5} />
            {MATCH_NOTICE}
          </p>
        )}
      </div>

      {/* Footer: always visible. */}
      <div
        className={`flex-none flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-borderSlate bg-surface px-4 lg:px-5 py-2 ${
          full ? 'pb-[max(12px,env(safe-area-inset-bottom))]' : 'rounded-b-panel'
        }`}
      >
        {authority ? (
          !rejectOpen && <p className="flex-1 min-w-[12rem] max-w-md text-xs text-navy-muted">{MATCH_NOTICE}</p>
        ) : (
          <div className="flex-1 min-w-[12rem]">
            {authorityLine}
            {!closed && !confirmedHere && siteMustConfirm === false && <p className="text-xs text-navy-muted">Waiting for {waitingFor.join(' and ') || 'the authority'}.</p>}
          </div>
        )}
        {actions}
        {authority && !closed && !rejectOpen && !familyOpen && accepted && !allSites && (
          <p className="w-full text-right text-xs text-navy-muted">Waiting for {waitingFor.join(' and ')}.</p>
        )}
      </div>
    </article>
  );
};
