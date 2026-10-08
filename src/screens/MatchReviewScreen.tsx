import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Circle, HelpCircle, Minus, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { AUTHORITY, SITES, siteName } from '../sites';
import { familyQuestion, pairState } from '../matchStatus';
import type { PersonRecord } from '../types';
import { useIsDesktop } from '../useIsDesktop';
import { MatchEvidenceDesktop } from './MatchEvidenceDesktop';

export const NAMELESS_LABEL = 'No name recorded – matched on description';

/** One record's public fields. The private detail is never listed; the place found shows only once verified. */
export const RecordColumn: React.FC<{ r?: PersonRecord; title: string; showPlace: boolean }> = ({ r, title, showPlace }) => {
  const relation = r?.relative_relation ? ` (${r.relative_relation})` : '';
  const rows: Array<[string, string | null | undefined]> = r
    ? [
        ['Name', r.name],
        ['Gender', r.gender === 'unknown' ? null : r.gender],
        ['Age', r.age_band],
        ['Village', r.village],
        [r.type === 'found' ? `Relative${relation}` : `Searching${relation}`, r.relative_name],
        ['Clothing, marks', r.clothing_marks],
        r.type === 'found' ? ['Found', showPlace ? r.found_where : r.found_where && 'Shown after the family check'] : ['Last seen', r.last_seen]
      ]
    : [];
  return (
    <div className="min-w-0 card p-3">
      <p className="text-xs text-navy-muted">{title}</p>
      {r ? (
        <>
          <p className="text-sm font-medium text-navy mb-2">
            {siteName(r.site)} · {r.code}
          </p>
          <dl className="space-y-1.5">
            {rows.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-navy-muted">{label}</dt>
                <dd className={`text-sm break-words first-letter:uppercase ${value ? 'text-navy' : 'text-navy-muted italic'}`}>
                  {value || 'Not recorded'}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="text-sm text-navy-muted">Not synced to this site yet.</p>
      )}
    </div>
  );
};

export const EvidenceList: React.FC<{ title: string; items: string[]; icon: React.ReactNode; empty: string }> = ({ title, items, icon, empty }) => (
  <section className="mb-3">
    <h2 className="text-sm font-medium text-navy-muted mb-1">{title}</h2>
    {items.length ? (
      <ul className="space-y-1">
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-base text-navy">
            <span className="mt-0.5 shrink-0">{icon}</span>
            <span className="min-w-0">{t}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-navy-muted">{empty}</p>
    )}
  </section>
);

export const NoteBox: React.FC<{ id: string; label: string; submitLabel: string; onSubmit: (note: string) => void; required: string }> = ({
  id,
  label,
  submitLabel,
  onSubmit,
  required
}) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="card mt-2">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <textarea
        id={id}
        rows={2}
        value={note}
        onChange={e => {
          setNote(e.target.value);
          setError('');
        }}
        className="input h-auto py-3 resize-none"
      />
      {error && <p className="text-sm text-urgent mt-1.5">{error}</p>}
      <button
        type="button"
        onClick={() => (note.trim() ? onSubmit(note) : setError(required))}
        className="btn-text -ml-2 text-urgent"
      >
        {submitLabel}
      </button>
    </div>
  );
};

export const MatchReviewScreen: React.FC = () => {
  const { db, site, selectedSuggestionId, addEvent } = useApp();
  const [ruleOutOpen, setRuleOutOpen] = useState(false);
  const [mismatchOpen, setMismatchOpen] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [identityChecked, setIdentityChecked] = useState(false);

  const data = useLiveQuery(
    async () => {
      if (!selectedSuggestionId) return null;
      const s = await db.suggestions.get(selectedSuggestionId);
      const [foundId, seekingId] = selectedSuggestionId.split(':');
      const [found, seeking, events] = await Promise.all([
        db.records.get(foundId),
        db.records.get(seekingId),
        db.events.where('found_id').equals(foundId).filter(e => e.seeking_id === seekingId).toArray()
      ]);
      return { s, found, seeking, events, foundId, seekingId };
    },
    [db, selectedSuggestionId]
  );
  const desktop = useIsDesktop();

  if (desktop) {
    return (
      <Screen showBack nav="matches" width="wide">
        <h1 className="screen-title">Evidence</h1>
        {selectedSuggestionId ? (
          <MatchEvidenceDesktop key={selectedSuggestionId} id={selectedSuggestionId} variant="page" />
        ) : (
          <p className="text-base text-navy-muted">No match selected.</p>
        )}
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen showBack nav="matches">
        <h1 className="screen-title">Evidence</h1>
        <p className="text-base text-navy-muted">{data === null ? 'No match selected.' : ''}</p>
      </Screen>
    );
  }

  const { s, found, seeking, events, foundId, seekingId } = data;
  const state = pairState(events);
  const confirmedHere = Boolean(state.confirmedBy[site]);
  const otherSite = SITES.find(x => x.id !== site)!;
  const closed = state.status === 'ruled_out' || state.status === 'verified';
  const familyStep = state.status === 'confirmed';
  const detail = found?.private_detail?.trim();

  let footer: React.ReactNode;
  if (familyStep && detail) {
    footer = (
      <button type="button" onClick={() => addEvent('family_match', foundId, seekingId, 'Family answer matches')} className="btn-primary">
        Answer matches
      </button>
    );
  } else if (familyStep) {
    footer = (
      <button
        type="button"
        disabled={!identityChecked}
        onClick={() => addEvent('family_match', foundId, seekingId, 'Identity verified with a document or trusted local person')}
        className="btn-primary disabled:cursor-not-allowed"
      >
        Mark as verified
      </button>
    );
  } else if (!closed && !confirmedHere) {
    footer = (
      <button type="button" onClick={() => addEvent('confirm', foundId, seekingId)} className="btn-primary">
        Confirm
      </button>
    );
  }

  return (
    <Screen showBack nav="matches" footer={footer} width="wide">
      <h1 className="screen-title">Evidence</h1>

      {/* Phones: one column in the original order. From 1024px: the people and evidence on the left,
          the family check, confirmations and actions on the right. */}
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-x-6 lg:items-start">
        <div className="contents lg:block lg:min-w-0">
          <div className="max-lg:order-1">
            {s && (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-3">
                <span className={`text-score font-semibold ${s.band === 'Strong' ? 'text-verified' : 'text-pending'}`}>{s.score}</span>
                <span className="text-base font-medium text-navy">{s.ambiguous ? 'Ambiguous: another candidate scores almost the same' : `${s.band} match`}</span>
              </div>
            )}

            {s?.nameless && <p className="card mb-3 bg-pending-bg border-pending-border text-base font-medium text-navy">{NAMELESS_LABEL}</p>}

            {state.status === 'verified' && found && (
              <div className="card mb-3 bg-verified-bg border-verified-border">
                <p className="text-base font-semibold text-verified">Verified with the family.</p>
                <p className="text-base text-navy">
                  The person is at {siteName(found.site)}
                  {found.found_where ? ` (found ${found.found_where})` : ''}. Send the family to the help desk at {siteName(found.site)}.
                </p>
              </div>
            )}
            {state.status === 'ruled_out' && (
              <p className="card mb-3 bg-urgent-bg border-urgent-border text-base text-navy">
                Ruled out by {state.ruledOut!.officer} at {siteName(state.ruledOut!.site)}
                {state.ruledOut!.reason ? `: ${state.ruledOut!.reason}` : ''}. It will not be suggested again.
              </p>
            )}
            {state.lastMismatch && !closed && !familyStep && (
              <p className="card mb-3 bg-pending-bg border-pending-border text-base text-navy">
                Back to review: the family's answer did not match ({state.lastMismatch.officer}, {siteName(state.lastMismatch.site)}
                {state.lastMismatch.reason ? `: ${state.lastMismatch.reason}` : ''}). Officers need to confirm again.
              </p>
            )}

          </div>
          <div className="max-lg:order-3">
            {s?.ask_next && !closed && !familyStep && (
              <div className="card mb-3 bg-pending-bg border-pending-border">
                <p className="text-sm font-medium text-pending">Ask next</p>
                <p className="text-lg font-semibold text-navy">{s.ask_next}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mb-4">
              <RecordColumn r={found} title="Found person" showPlace={state.status === 'verified'} />
              <RecordColumn r={seeking} title="Being searched for" showPlace={state.status === 'verified'} />
            </div>

            {s && (
              <>
                <EvidenceList title="For" items={s.reasons_for} empty="Nothing in favour yet." icon={<Plus className="w-4 h-4 text-verified" strokeWidth={1.75} />} />
                <EvidenceList title="Against" items={s.reasons_against} empty="Nothing against." icon={<Minus className="w-4 h-4 text-urgent" strokeWidth={1.75} />} />
                <EvidenceList
                  title="Unknown"
                  items={s.unknown.map(u => `${u} not recorded on one side`)}
                  empty="Everything is recorded on both sides."
                  icon={<HelpCircle className="w-4 h-4 text-navy-muted" strokeWidth={1.75} />}
                />
              </>
            )}

          </div>
        </div>
        <div className="contents lg:block lg:min-w-0">
          <div className="max-lg:order-2">
            {familyStep && (
              <section className="card mb-3 bg-civilBlue-soft border-civilBlue/20">
                <p className="text-sm font-medium text-civilBlue">Both officers confirmed. Last step: family check</p>
                {detail ? (
                  <>
                    <p className="text-lg font-semibold text-navy mt-1">Ask the family: {familyQuestion(detail)}</p>
                    {showAnswer ? (
                      <p className="text-base text-navy mt-2">
                        <span className="text-sm text-navy-muted">Expected answer (officer only): </span>
                        {detail}
                      </p>
                    ) : (
                      <button type="button" onClick={() => setShowAnswer(true)} className="btn-text -ml-2">
                        Show expected answer
                      </button>
                    )}
                    <div>
                      <button type="button" onClick={() => setMismatchOpen(o => !o)} className="btn-text -ml-2 text-urgent">
                        Answer does not match
                      </button>
                    </div>
                    {mismatchOpen && (
                      <NoteBox
                        id="mismatch-note"
                        label="What did the family say?"
                        submitLabel="Send back to review"
                        required="Add a short note for the other officers."
                        onSubmit={note => {
                          addEvent('family_mismatch', foundId, seekingId, note);
                          setMismatchOpen(false);
                          setShowAnswer(false);
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
                  </>
                )}
              </section>
            )}

          </div>
          <div className="max-lg:order-4">
            <section className="card mb-3">
              <h2 className="text-sm font-medium text-navy-muted mb-2">Confirmation</h2>
              <ol className="space-y-2">
                {[SITES.find(x => x.id === site)!, otherSite].map(x => {
                  const e = state.confirmedBy[x.id] ?? (state.status === 'verified' ? events.find(ev => ev.kind === 'confirm' && ev.site === x.id) : undefined);
                  return (
                    <li key={x.id} className="flex items-center gap-2 text-base">
                      {e ? <Check className="w-5 h-5 shrink-0 text-verified" strokeWidth={1.75} /> : <Circle className="w-5 h-5 shrink-0 text-navy-muted" strokeWidth={1.75} />}
                      <span className="min-w-0 flex-1">
                        Officer at {x.name}
                        {x.id === site ? ' (here)' : ''}
                      </span>
                      <span className={`text-sm shrink-0 ${e ? 'text-verified' : 'text-navy-muted'}`}>{e ? e.officer : 'Waiting'}</span>
                    </li>
                  );
                })}
                {state.confirmedBy[AUTHORITY.id] && (
                  <li className="flex items-center gap-2 text-base">
                    <Check className="w-5 h-5 shrink-0 text-verified" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1">Authority console accepted</span>
                    <span className="text-sm shrink-0 text-verified">{state.confirmedBy[AUTHORITY.id]!.officer}</span>
                  </li>
                )}
                <li className="flex items-center gap-2 text-base">
                  {state.verifiedBy ? <Check className="w-5 h-5 shrink-0 text-verified" strokeWidth={1.75} /> : <Circle className="w-5 h-5 shrink-0 text-navy-muted" strokeWidth={1.75} />}
                  <span className="min-w-0 flex-1">Family check</span>
                  <span className={`text-sm shrink-0 ${state.verifiedBy ? 'text-verified' : 'text-navy-muted'}`}>
                    {state.verifiedBy ? state.verifiedBy.officer : familyStep ? 'Now' : 'Locked'}
                  </span>
                </li>
              </ol>
              {state.needInfo.length > 0 && (
                <p className="text-sm text-pending mt-2">
                  More information requested by {state.needInfo.map(e => `${e.officer} (${siteName(e.site)})`).join(', ')}.
                </p>
              )}
            </section>

            {!closed && !familyStep && (
              <div className="flex flex-wrap gap-x-2">
                <button type="button" onClick={() => setRuleOutOpen(o => !o)} className="btn-text -ml-2 text-urgent">
                  Rule out
                </button>
                <button type="button" onClick={() => addEvent('need_info', foundId, seekingId)} className="btn-text">
                  Need more information
                </button>
              </div>
            )}

            {ruleOutOpen && !closed && !familyStep && (
              <NoteBox
                id="rule-out-reason"
                label="Why is this not the same person?"
                submitLabel="Rule out this match"
                required="Say why this is not the same person."
                onSubmit={note => {
                  addEvent('rule_out', foundId, seekingId, note);
                  setRuleOutOpen(false);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
};
