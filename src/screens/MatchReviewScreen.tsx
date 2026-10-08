import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Circle, HelpCircle, Minus, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { SITES, siteName } from '../sites';
import { pairState } from '../matchStatus';
import type { PersonRecord } from '../types';

const RecordColumn: React.FC<{ r?: PersonRecord; title: string }> = ({ r, title }) => {
  const rows: Array<[string, string | null | undefined]> = r
    ? [
        ['Name', r.name],
        ['Gender', r.gender === 'unknown' ? null : r.gender],
        ['Age', r.age_band],
        ['Village', r.village],
        [r.type === 'found' ? `Relative${r.relative_relation ? ` (${r.relative_relation})` : ''}` : `Searching${r.relative_relation ? ` (${r.relative_relation})` : ''}`, r.relative_name],
        ['Clothing, marks', r.clothing_marks],
        ...(r.type === 'found'
          ? ([['Found', r.found_where]] as Array<[string, string | null]>)
          : ([['Last seen', r.last_seen]] as Array<[string, string | null | undefined]>))
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

const EvidenceList: React.FC<{ title: string; items: string[]; icon: React.ReactNode; empty: string }> = ({ title, items, icon, empty }) => (
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

export const MatchReviewScreen: React.FC = () => {
  const { db, site, selectedSuggestionId, addEvent } = useApp();
  const [ruleOutOpen, setRuleOutOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

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
  const closed = state.status === 'ruled_out' || state.status === 'confirmed';

  const submitRuleOut = async () => {
    if (!reason.trim()) {
      setReasonError('Say why this is not the same person.');
      return;
    }
    await addEvent('rule_out', foundId, seekingId, reason);
    setRuleOutOpen(false);
  };

  return (
    <Screen
      showBack
      nav="matches"
      footer={
        !closed && !confirmedHere ? (
          <button type="button" onClick={() => addEvent('confirm', foundId, seekingId)} className="btn-primary">
            Confirm
          </button>
        ) : undefined
      }
    >
      <h1 className="screen-title">Evidence</h1>

      {s && (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-3">
          <span className={`text-score font-semibold ${s.band === 'Strong' ? 'text-verified' : 'text-pending'}`}>{s.score}</span>
          <span className="text-base font-medium text-navy">{s.ambiguous ? 'Ambiguous: another candidate scores almost the same' : `${s.band} match`}</span>
        </div>
      )}

      {s?.nameless && (
        <p className="card mb-3 bg-pending-bg border-pending-border text-base font-medium text-navy">No name recorded – matched on description</p>
      )}

      {state.status === 'confirmed' && (
        <p className="card mb-3 bg-verified-bg border-verified-border text-base font-medium text-verified">
          Confirmed by officers at both sites.
        </p>
      )}
      {state.status === 'ruled_out' && (
        <p className="card mb-3 bg-urgent-bg border-urgent-border text-base text-navy">
          Ruled out by {state.ruledOut!.officer} at {siteName(state.ruledOut!.site)}
          {state.ruledOut!.reason ? `: ${state.ruledOut!.reason}` : ''}. It will not be suggested again.
        </p>
      )}

      {s?.ask_next && !closed && (
        <div className="card mb-3 bg-pending-bg border-pending-border">
          <p className="text-sm font-medium text-pending">Ask next</p>
          <p className="text-lg font-semibold text-navy">{s.ask_next}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-4">
        <RecordColumn r={found} title="Found person" />
        <RecordColumn r={seeking} title="Being searched for" />
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

      <section className="card mb-3">
        <h2 className="text-sm font-medium text-navy-muted mb-2">Confirmation</h2>
        <ol className="space-y-2">
          {[SITES.find(x => x.id === site)!, otherSite].map(x => {
            const e = state.confirmedBy[x.id];
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
        </ol>
        {state.needInfo.length > 0 && (
          <p className="text-sm text-pending mt-2">
            More information requested by {state.needInfo.map(e => `${e.officer} (${siteName(e.site)})`).join(', ')}.
          </p>
        )}
      </section>

      {!closed && (
        <div className="flex flex-wrap gap-x-2">
          <button type="button" onClick={() => setRuleOutOpen(o => !o)} className="btn-text -ml-2 text-urgent">
            Rule out
          </button>
          <button type="button" onClick={() => addEvent('need_info', foundId, seekingId)} className="btn-text">
            Need more information
          </button>
        </div>
      )}

      {ruleOutOpen && !closed && (
        <div className="card mt-2">
          <label htmlFor="rule-out-reason" className="field-label">
            Why is this not the same person?
          </label>
          <textarea
            id="rule-out-reason"
            rows={2}
            value={reason}
            onChange={e => {
              setReason(e.target.value);
              setReasonError('');
            }}
            className="input h-auto py-3 resize-none"
          />
          {reasonError && <p className="text-sm text-urgent mt-1.5">{reasonError}</p>}
          <button type="button" onClick={submitRuleOut} className="btn-text -ml-2 text-urgent">
            Rule out this match
          </button>
        </div>
      )}
    </Screen>
  );
};
