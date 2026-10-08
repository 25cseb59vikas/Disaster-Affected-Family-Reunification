import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Circle, HelpCircle, Minus, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AUTHORITY, SITES, siteName } from '../sites';
import { familyQuestion, pairState } from '../matchStatus';
import { EvidenceList, NAMELESS_LABEL, NoteBox, RecordColumn } from './MatchReviewScreen';
import { STATUS_BADGE } from './SuggestedMatchesScreen';

/**
 * Desktop evidence for one pair (1024px and up), as a full screen ('page') or as the panel beside a list ('panel').
 * Same decisions and wording as the phone evidence screen; only the arrangement differs:
 * the two people side by side with the score between them, For / Against / Unknown in columns,
 * and the actions in a row at the bottom right.
 */
export const MatchEvidenceDesktop: React.FC<{ id: string; variant: 'page' | 'panel' }> = ({ id, variant }) => {
  const { db, site, addEvent } = useApp();
  const [ruleOutOpen, setRuleOutOpen] = useState(false);
  const [mismatchOpen, setMismatchOpen] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [identityChecked, setIdentityChecked] = useState(false);
  const panel = variant === 'panel';

  const data = useLiveQuery(async () => {
    const [foundId, seekingId] = id.split(':');
    const [s, found, seeking, events] = await Promise.all([
      db.suggestions.get(id),
      db.records.get(foundId),
      db.records.get(seekingId),
      db.events.where('found_id').equals(foundId).filter(e => e.seeking_id === seekingId).toArray()
    ]);
    return { s, found, seeking, events, foundId, seekingId };
  }, [db, id]);

  if (!data) return null;
  const { s, found, seeking, events, foundId, seekingId } = data;
  const state = pairState(events);
  const confirmedHere = Boolean(state.confirmedBy[site]);
  const closed = state.status === 'ruled_out' || state.status === 'verified';
  const familyStep = state.status === 'confirmed';
  const detail = found?.private_detail?.trim();
  const badge = STATUS_BADGE[state.status];
  const here = SITES.find(x => x.id === site);
  const steps = [...(here ? [here] : []), ...SITES.filter(x => x.id !== site)];

  const score = s && (
    <div className={panel ? 'flex flex-wrap items-baseline gap-x-2 gap-y-1' : 'flex flex-col items-center justify-center text-center px-2'}>
      <span className={`text-score font-semibold ${s.band === 'Strong' ? 'text-verified' : 'text-pending'}`}>{s.score}</span>
      <span className="text-sm font-medium text-navy">{s.ambiguous ? 'Ambiguous' : `${s.band} match`}</span>
      {badge && <span className={`badge mt-1 ${badge[1]}`}>{badge[0]}</span>}
    </div>
  );

  let primary: React.ReactNode = null;
  if (familyStep && detail) {
    primary = (
      <button type="button" onClick={() => addEvent('family_match', foundId, seekingId, 'Family answer matches')} className="btn-primary">
        Answer matches
      </button>
    );
  } else if (familyStep) {
    primary = (
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
    primary = (
      <button type="button" onClick={() => addEvent('confirm', foundId, seekingId)} className="btn-primary">
        Confirm
      </button>
    );
  }

  return (
    <article aria-label="Match evidence" className="space-y-4">
      {s?.nameless && <p className="card bg-pending-bg border-pending-border text-base font-medium text-navy">{NAMELESS_LABEL}</p>}
      {state.status === 'verified' && found && (
        <div className="card bg-verified-bg border-verified-border">
          <p className="text-base font-semibold text-verified">Verified with the family.</p>
          <p className="text-base text-navy">
            The person is at {siteName(found.site)}
            {found.found_where ? ` (found ${found.found_where})` : ''}. Send the family to the help desk at {siteName(found.site)}.
          </p>
        </div>
      )}
      {state.status === 'ruled_out' && (
        <p className="card bg-urgent-bg border-urgent-border text-base text-navy">
          Ruled out by {state.ruledOut!.officer} at {siteName(state.ruledOut!.site)}
          {state.ruledOut!.reason ? `: ${state.ruledOut!.reason}` : ''}. It will not be suggested again.
        </p>
      )}
      {state.lastMismatch && !closed && !familyStep && (
        <p className="card bg-pending-bg border-pending-border text-base text-navy">
          Back to review: the family's answer did not match ({state.lastMismatch.officer}, {siteName(state.lastMismatch.site)}
          {state.lastMismatch.reason ? `: ${state.lastMismatch.reason}` : ''}). Officers need to confirm again.
        </p>
      )}

      {panel && score}
      <div className={`grid gap-3 items-stretch ${panel ? 'grid-cols-2' : 'grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'}`}>
        <RecordColumn r={found} title="Found person" showPlace={state.status === 'verified'} />
        {!panel && score}
        <RecordColumn r={seeking} title="Being searched for" showPlace={state.status === 'verified'} />
      </div>

      {s?.ask_next && !closed && !familyStep && (
        <div className="card bg-pending-bg border-pending-border">
          <p className="text-sm font-medium text-pending">Ask next</p>
          <p className="text-lg font-semibold text-navy">{s.ask_next}</p>
        </div>
      )}

      {s && (
        <div className={`grid gap-3 ${panel ? 'grid-cols-1 2xl:grid-cols-3' : 'grid-cols-3'}`}>
          <div className="card [&>section]:mb-0">
            <EvidenceList title="For" items={s.reasons_for} empty="Nothing in favour yet." icon={<Plus className="w-4 h-4 text-verified" strokeWidth={1.75} />} />
          </div>
          <div className="card [&>section]:mb-0">
            <EvidenceList title="Against" items={s.reasons_against} empty="Nothing against." icon={<Minus className="w-4 h-4 text-urgent" strokeWidth={1.75} />} />
          </div>
          <div className="card [&>section]:mb-0">
            <EvidenceList
              title="Unknown"
              items={s.unknown.map(u => `${u} not recorded on one side`)}
              empty="Everything is recorded on both sides."
              icon={<HelpCircle className="w-4 h-4 text-navy-muted" strokeWidth={1.75} />}
            />
          </div>
        </div>
      )}

      {familyStep && (
        <section className="card bg-civilBlue-soft border-civilBlue/20">
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
              {mismatchOpen && (
                <NoteBox
                  id="mismatch-note-desktop"
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

      <section className="card">
        <h2 className="text-sm font-medium text-navy-muted mb-2">Confirmation</h2>
        <ol className={`grid gap-y-2 gap-x-8 ${panel ? 'grid-cols-1' : 'grid-cols-3 divide-x divide-borderSlate [&>li+li]:pl-8'}`}>
          {steps.map(x => {
            const e = state.confirmedBy[x.id] ?? (state.status === 'verified' ? events.find(ev => ev.kind === 'confirm' && ev.site === x.id) : undefined);
            return (
              <li key={x.id} className="flex items-center gap-2 text-base min-w-0">
                {e ? <Check className="w-5 h-5 shrink-0 text-verified" strokeWidth={1.75} /> : <Circle className="w-5 h-5 shrink-0 text-navy-muted" strokeWidth={1.75} />}
                <span className="min-w-0 flex-1 truncate">
                  Officer at {x.name}
                  {x.id === site ? ' (here)' : ''}
                </span>
                <span className={`text-sm shrink-0 ${e ? 'text-verified' : 'text-navy-muted'}`}>{e ? e.officer : 'Waiting'}</span>
              </li>
            );
          })}
          <li className="flex items-center gap-2 text-base min-w-0">
            {state.verifiedBy ? <Check className="w-5 h-5 shrink-0 text-verified" strokeWidth={1.75} /> : <Circle className="w-5 h-5 shrink-0 text-navy-muted" strokeWidth={1.75} />}
            <span className="min-w-0 flex-1">Family check</span>
            <span className={`text-sm shrink-0 ${state.verifiedBy ? 'text-verified' : 'text-navy-muted'}`}>
              {state.verifiedBy ? state.verifiedBy.officer : familyStep ? 'Now' : 'Locked'}
            </span>
          </li>
        </ol>
        {state.confirmedBy[AUTHORITY.id] && <p className="text-sm text-verified mt-2">Authority console accepted ({state.confirmedBy[AUTHORITY.id]!.officer}).</p>}
        {state.needInfo.length > 0 && (
          <p className="text-sm text-pending mt-2">More information requested by {state.needInfo.map(e => `${e.officer} (${siteName(e.site)})`).join(', ')}.</p>
        )}
      </section>

      {(primary || (!closed && !familyStep) || (familyStep && detail)) && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!closed && !familyStep && (
            <>
              <button type="button" onClick={() => addEvent('need_info', foundId, seekingId)} className="btn-text">
                Need more information
              </button>
              <button
                type="button"
                onClick={() => setRuleOutOpen(o => !o)}
                aria-expanded={ruleOutOpen}
                className="h-12 min-w-[120px] px-5 rounded-button border border-urgent text-urgent text-base font-semibold hover:bg-urgent-bg"
              >
                Rule out
              </button>
            </>
          )}
          {familyStep && detail && (
            <button
              type="button"
              onClick={() => setMismatchOpen(o => !o)}
              className="h-12 min-w-[120px] px-5 rounded-button border border-urgent text-urgent text-base font-semibold hover:bg-urgent-bg"
            >
              Answer does not match
            </button>
          )}
          {primary}
        </div>
      )}

      {ruleOutOpen && !closed && !familyStep && (
        <NoteBox
          id="rule-out-reason-desktop"
          label="Why is this not the same person?"
          submitLabel="Rule out this match"
          required="Say why this is not the same person."
          onSubmit={note => {
            addEvent('rule_out', foundId, seekingId, note);
            setRuleOutOpen(false);
          }}
        />
      )}
    </article>
  );
};
