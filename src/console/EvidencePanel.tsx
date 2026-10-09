import React, { useState } from 'react';
import { ArrowLeft, Check, HelpCircle, Info, Minus, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AUTHORITY, SITES, siteName } from '../sites';
import { familyQuestion, pairState } from '../matchStatus';
import type { PersonRecord } from '../types';
import { linkProps } from '../route';
import { useElementWidth } from '../useIsDesktop';
import type { ConsoleData } from './data';
import { Avatar, StatusPill } from './ui';

export const MATCH_NOTICE = 'Matches are suggestions only. Authorised staff must verify identity and relationships before disclosure.';

/** One person's record as a raised card: initials, name, site, and the fields that matter for matching. */
const RecordCard: React.FC<{ r?: PersonRecord; role: string }> = ({ r, role }) => {
  if (!r) {
    return (
      <div className="raised p-4 min-w-0">
        <p className="label-caps">{role}</p>
        <p className="mt-2 text-sm text-navy-muted">Not synced to the console yet.</p>
      </div>
    );
  }
  const rel = r.relative_relation ? ` (${r.relative_relation})` : '';
  const rows: Array<[string, string | null | undefined]> = [
    ['Gender', r.gender === 'unknown' ? null : r.gender],
    ['Age', r.age_band],
    ['Village', r.village],
    [r.type === 'found' ? 'Relative' : 'Searching', r.relative_name ? `${r.relative_name}${rel}` : null],
    ['Clothing, marks', r.clothing_marks],
    r.type === 'found' ? ['Found', r.found_where] : ['Last seen', r.last_seen],
    ...(r.type === 'seeking' ? ([['Phone', r.contact_phone]] as Array<[string, string | null | undefined]>) : [])
  ];
  return (
    <div className="raised p-4 min-w-0">
      <p className="label-caps">{role}</p>
      <div className="mt-2 flex items-center gap-3 min-w-0">
        <Avatar name={r.name} size="md" />
        <div className="min-w-0">
          <a {...linkProps(`/console/records/${r.id}`)} className="flex items-center min-h-[44px] lg:min-h-0 text-base font-semibold leading-tight text-navy hover:text-terracotta break-words">
            {r.name ?? 'Name not known'}
          </a>
          <p className="text-xs text-navy-muted truncate">
            {siteName(r.site)}, {r.code}
          </p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-x-3 gap-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className={`min-w-0 ${label === 'Clothing, marks' ? 'col-span-full' : ''}`}>
            <dt className="text-label uppercase text-navy-muted">{label}</dt>
            <dd className={`text-table break-words first-letter:uppercase ${value ? 'text-navy' : 'text-navy-muted'}`}>{value || 'Not recorded'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

/** The score between the two people: the one place with emphasis, on a soft radial highlight. */
const Score: React.FC<{ score: number; band: string; ambiguous: boolean }> = ({ score, band, ambiguous }) => (
  <div
    className="flex flex-col items-center justify-center text-center px-2 py-4 rounded-panel"
    style={{ backgroundImage: 'radial-gradient(closest-side, rgba(194, 84, 15, 0.12), rgba(194, 84, 15, 0) 100%)' }}
  >
    <span className="font-display text-metric font-semibold text-navy tabular-nums">{score}</span>
    <span className="text-xs text-navy-muted">of 100</span>
    <span className="mt-1 text-sm font-medium text-navy">{ambiguous ? 'Ambiguous' : `${band} match`}</span>
  </div>
);

const EvidenceColumn: React.FC<{ title: string; items: string[]; empty: string; icon: React.ReactNode }> = ({ title, items, empty, icon }) => (
  <section className="min-w-0">
    <h3 className="label-caps flex items-center gap-2">
      {title}
      <span className="tabular-nums text-navy-muted/70">{items.length}</span>
    </h3>
    {items.length ? (
      <ul className="mt-2 space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-table text-navy">
            <span aria-hidden className="mt-0.5 shrink-0">
              {icon}
            </span>
            <span className="min-w-0">{t}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-2 text-table text-navy-muted">{empty}</p>
    )}
  </section>
);

/**
 * Evidence and the authority's decision for one pair: the two records with the score between them,
 * For / Against / Unknown, the "Ask next" callout, the verification tracker, and Accept / Reject in a sticky footer.
 * `full`: the full-screen view below 1024px, with a back button.
 */
export const EvidencePanel: React.FC<{ id: string; data: ConsoleData; variant?: 'pane' | 'full'; onBack?: () => void }> = ({
  id,
  data,
  variant = 'pane',
  onBack
}) => {
  const { addEvent } = useApp();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [familyOpen, setFamilyOpen] = useState(false);
  const [mismatchOpen, setMismatchOpen] = useState(false);
  const [mismatchNote, setMismatchNote] = useState('');
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
  const full = variant === 'full';
  // The comparison adapts to the room the panel really has: score between the cards, above them, or stacked.
  const [cmpRef, cmpWidth] = useElementWidth<HTMLDivElement>();
  const cmp = cmpWidth >= 560 ? 'between' : cmpWidth >= 400 ? 'top' : 'stack';

  const accept = async () => {
    if (!accepted) await addEvent('confirm', foundId, seekingId, 'Accepted at the authority console');
    if (bothSites) setFamilyOpen(true);
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

  const header = (
    <div className={`flex-none flex items-center gap-2 px-4 lg:px-5 h-14 border-b border-borderSlate bg-surface ${full ? '' : 'rounded-t-panel'}`}>
      {onBack && (
        <button type="button" onClick={onBack} aria-label="Back to the match queue" className="-ml-2 w-11 h-11 rounded-panel flex items-center justify-center text-navy hover:bg-pressed">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
      )}
      <h2 className="flex-1 min-w-0 text-base font-semibold text-navy truncate">Evidence</h2>
      <StatusPill status={state.status} />
    </div>
  );

  if (!s && !events.length) {
    return (
      <div className={`flex flex-col ${full ? 'h-full bg-canvas' : 'panel'}`}>
        {header}
        <p className="p-5 text-sm text-navy-muted">This match is no longer suggested.</p>
      </div>
    );
  }

  const steps = [
    ...SITES.map(x => ({ id: x.id, label: `Officer at ${x.name}`, e: state.confirmedBy[x.id] ?? (state.status === 'verified' ? events.find(ev => ev.kind === 'confirm' && ev.site === x.id) : undefined) })),
    { id: 'family', label: 'Family check', e: state.verifiedBy ?? undefined }
  ];

  // The footer's actions follow the pair's state; the decisions themselves are unchanged.
  let footer: React.ReactNode = null;
  if (!closed && rejectOpen) {
    footer = (
      <div className="space-y-2">
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
  } else if (!closed && bothSites && familyOpen) {
    footer = (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {detail && (
          <button type="button" onClick={() => setMismatchOpen(o => !o)} className="ws-btn-danger">
            Answer does not match
          </button>
        )}
        <button
          type="button"
          disabled={!detail && !identityChecked}
          onClick={() =>
            addEvent('family_match', foundId, seekingId, detail ? 'Family answer matches' : 'Identity verified with a document or trusted local person')
          }
          className="ws-btn-accent"
        >
          <Check className="w-4 h-4" strokeWidth={2} />
          {detail ? 'Answer matches: verify' : 'Mark as verified'}
        </button>
      </div>
    );
  } else if (!closed) {
    footer = (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-navy-muted max-w-[16rem]">
          {bothSites
            ? 'Both sites confirmed. Accepting opens the family check.'
            : accepted
              ? `You accepted. Waiting for ${SITES.filter(x => !state.confirmedBy[x.id]).map(x => x.name).join(' and ')}.`
              : 'Accepting records your confirmation.'}
        </p>
        <div className="flex gap-2 ml-auto">
          <button type="button" onClick={() => setRejectOpen(true)} className="ws-btn-danger">
            Reject
          </button>
          <button type="button" onClick={accept} disabled={Boolean(accepted) && !bothSites} className="ws-btn-accent">
            <Check className="w-4 h-4" strokeWidth={2} />
            {accepted && !bothSites ? 'Accepted' : 'Accept match'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <article aria-label="Match evidence" className={`flex flex-col min-h-0 ${full ? 'h-full bg-canvas' : 'panel max-h-full'}`}>
      {header}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 lg:px-5 py-5 space-y-5">
        {state.status === 'verified' && found && (
          <p className="rounded-panel bg-verified-bg px-3 py-2 text-sm text-navy">
            <span className="font-semibold text-verified">Verified with the family</span> by {state.verifiedBy?.officer} ({siteName(state.verifiedBy?.site ?? '')}). The
            person is at {siteName(found.site)}.
          </p>
        )}
        {state.ruledOut && (
          <p className="rounded-panel bg-urgent-bg px-3 py-2 text-sm text-navy">
            <span className="font-semibold text-urgent">Rejected</span> by {state.ruledOut.officer} at {siteName(state.ruledOut.site)}
            {state.ruledOut.reason ? `: ${state.ruledOut.reason}` : ''}. It will not be suggested again.
          </p>
        )}
        {state.lastMismatch && !closed && !bothSites && (
          <p className="rounded-panel bg-pending-bg px-3 py-2 text-sm text-navy">
            The family's answer did not match ({state.lastMismatch.officer}, {siteName(state.lastMismatch.site)}
            {state.lastMismatch.reason ? `: ${state.lastMismatch.reason}` : ''}). Site officers need to confirm again.
          </p>
        )}
        {s?.nameless && <p className="rounded-panel bg-pending-bg px-3 py-2 text-sm text-navy">No name recorded: matched on description.</p>}

        <div
          ref={cmpRef}
          className={`grid gap-3 items-stretch ${
            cmp === 'between' && s ? 'grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]' : cmp === 'stack' ? 'grid-cols-1' : 'grid-cols-2'
          }`}
        >
          {s && (
            <div className={cmp === 'between' ? 'order-2 self-center' : 'col-span-full'}>
              <Score score={s.score} band={s.band} ambiguous={s.ambiguous} />
            </div>
          )}
          <div className="order-1 min-w-0">
            <RecordCard r={found} role="Found person" />
          </div>
          <div className="order-3 min-w-0">
            <RecordCard r={seeking} role="Searching family" />
          </div>
        </div>

        {s?.ask_next && !closed && (
          <div className="rounded-panel bg-terracotta-soft/60 shadow-edge-accent px-4 py-3">
            <p className="label-caps text-terracotta">Ask next</p>
            <p className="mt-0.5 text-base font-semibold text-navy">{s.ask_next}</p>
          </div>
        )}

        {s && (
          <div className="grid gap-5 sm:grid-cols-3">
            <EvidenceColumn title="For" items={s.reasons_for} empty="Nothing in favour yet." icon={<Plus className="w-3.5 h-3.5 text-verified" strokeWidth={2} />} />
            <EvidenceColumn title="Against" items={s.reasons_against} empty="Nothing against." icon={<Minus className="w-3.5 h-3.5 text-urgent" strokeWidth={2} />} />
            <EvidenceColumn
              title="Unknown"
              items={s.unknown.map(u => `${u} not recorded on one side`)}
              empty="Everything is recorded on both sides."
              icon={<HelpCircle className="w-3.5 h-3.5 text-navy-muted" strokeWidth={1.5} />}
            />
          </div>
        )}

        <section aria-label="Verification">
          <h3 className="label-caps">Verification</h3>
          <ol className="mt-3 grid grid-cols-3 gap-2">
            {steps.map((st, i) => (
              <li key={st.id} className="relative min-w-0">
                {i > 0 && <span aria-hidden className={`absolute top-3 right-[calc(50%+16px)] w-[calc(100%-24px)] h-px ${st.e ? 'bg-verified/50' : 'bg-borderSlate'}`} />}
                <span className="flex flex-col items-center text-center">
                  <span
                    className={`relative w-6 h-6 rounded-full flex items-center justify-center ${
                      st.e ? 'bg-verified text-white' : 'bg-surface text-navy-muted shadow-panel'
                    }`}
                  >
                    {st.e ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <span className="text-xs tabular-nums">{i + 1}</span>}
                  </span>
                  <span className="mt-1.5 text-xs font-medium text-navy">{st.label}</span>
                  <span className={`text-xs truncate max-w-full ${st.e ? 'text-verified' : 'text-navy-muted'}`}>
                    {st.e ? st.e.officer : st.id === 'family' ? (bothSites ? 'Now' : 'After both sites') : 'Waiting'}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          {accepted && <p className="mt-3 text-xs text-navy-muted text-center">Accepted at the authority console by {accepted.officer}.</p>}
          {state.needInfo.length > 0 && (
            <p className="mt-2 text-xs text-pending text-center">
              More information requested by {state.needInfo.map(e => `${e.officer} (${siteName(e.site)})`).join(', ')}.
            </p>
          )}
        </section>

        {bothSites && familyOpen && !closed && (
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
                        Send back to the site officers
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

        <p className="flex items-start gap-2 text-xs text-navy-muted">
          <Info aria-hidden className="w-3.5 h-3.5 mt-px shrink-0" strokeWidth={1.5} />
          {MATCH_NOTICE}
        </p>
      </div>

      {footer && (
        <div className={`flex-none border-t border-borderSlate bg-surface px-4 lg:px-5 py-3 ${full ? 'pb-[max(12px,env(safe-area-inset-bottom))]' : 'rounded-b-panel'}`}>{footer}</div>
      )}
    </article>
  );
};
