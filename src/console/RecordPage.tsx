import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { recordStatus } from '../matchStatus';
import { siteName } from '../sites';
import { timeSince } from '../screens/SearchRecordsScreen';
import { linkProps } from '../route';
import { personLabel, useConsoleData, type ConsoleData } from './data';
import type { PersonRecord } from '../types';
import { PAIR_STATUS } from './MatchQueuePage';
import { STATUS_BADGE, statusLabel, Thumb } from './RecordsPage';

/** The record's fields as label/value pairs, shared by the record page and the panel beside the lists. */
export function recordRows(r: PersonRecord): Array<[string, string | null | undefined]> {
  const seeking = r.type === 'seeking';
  return [
    ['Type', seeking ? 'Search for a missing person' : 'Person found'],
    ['Gender', r.gender === 'unknown' ? null : r.gender],
    ['Age', r.age_band],
    ['Village', r.village],
    [seeking ? 'Searching' : 'Relative', r.relative_name ? `${r.relative_name}${r.relative_relation ? ` (${r.relative_relation})` : ''}` : null],
    ...(seeking ? ([['Contact phone', r.contact_phone]] as Array<[string, string | null | undefined]>) : []),
    ['Clothing, marks', r.clothing_marks],
    [seeking ? 'Last seen' : 'Found', seeking ? r.last_seen : r.found_where],
    ...(!seeking && r.looking_for.length
      ? ([['Looking for', r.looking_for.map(p => `${p.relation}${p.name ? ` ${p.name}` : ''}`).join(', ')]] as Array<[string, string]>)
      : []),
    ['Registered', `${siteName(r.site)} · ${r.registered_by || 'unknown'} · ${timeSince(r.created_at)}`]
  ];
}

/** Desktop panel beside the Records and Priority lists: the record at a glance, with a link to the full page. */
export const RecordPanel: React.FC<{ id: string; data: ConsoleData }> = ({ id, data }) => {
  const r = data.byId.get(id);
  if (!r) return <p className="card text-base text-navy-muted">Record not found.</p>;
  const { status } = recordStatus(r.id, data.suggestions, data.events);
  const pairs = data.suggestions.filter(s => s.found_id === r.id || s.seeking_id === r.id).sort((a, b) => b.score - a.score);
  return (
    <article aria-label="Record" className="space-y-3">
      <div className="flex items-center gap-3">
        <Thumb r={r} size="w-14 h-14" />
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-navy break-words">{r.name ?? 'Name not known'}</h2>
          <p className="text-sm text-navy-muted">
            {r.code} · {siteName(r.site)} <span className={`badge ml-1 ${STATUS_BADGE[status]}`}>{statusLabel(r, status)}</span>
          </p>
        </div>
      </div>
      <dl className="card grid grid-cols-2 gap-x-4 gap-y-2">
        {recordRows(r).map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-navy-muted">{label}</dt>
            <dd className={`text-base break-words first-letter:uppercase ${value ? 'text-navy' : 'text-navy-muted italic'}`}>{value || 'Not recorded'}</dd>
          </div>
        ))}
      </dl>
      <section className="card">
        <h3 className="text-sm font-medium text-navy-muted mb-1">Suggested matches</h3>
        {pairs.length ? (
          <ul>
            {pairs.map(s => {
              const other = data.byId.get(s.found_id === r.id ? s.seeking_id : s.found_id);
              const st = PAIR_STATUS[data.states.get(s.id)!.status];
              return (
                <li key={s.id}>
                  <a {...linkProps(`/console/matches?pair=${encodeURIComponent(s.id)}`)} className="flex items-center gap-2 min-h-[44px] rounded-button hover:bg-canvas">
                    <span className={`text-lg font-semibold w-9 ${s.band === 'Strong' ? 'text-verified' : 'text-pending'}`}>{s.score}</span>
                    <span className="flex-1 min-w-0 truncate text-base text-navy">{personLabel(other)}</span>
                    <span className={`badge ${st[1]}`}>{st[0]}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-base text-navy-muted">No suggested matches yet.</p>
        )}
      </section>
      <div className="flex justify-end">
        <a {...linkProps(`/console/records/${r.id}`)} className="btn-text">
          Open the full record
        </a>
      </div>
    </article>
  );
};

/** /console/records/<id>: the full record, its status and every suggested pair it is part of. */
export const RecordPage: React.FC<{ id: string }> = ({ id }) => {
  const data = useConsoleData();
  const [showPrivate, setShowPrivate] = useState(false);
  const r = data?.byId.get(id);

  const back = (
    <a {...linkProps('/console/records')} className="btn-text -ml-2 mb-2 gap-1">
      <ArrowLeft className="w-5 h-5" strokeWidth={1.75} /> All records
    </a>
  );
  if (!data) return back;
  if (!r) {
    return (
      <>
        {back}
        <p className="card text-base text-navy-muted">Record not found. It may not have synced to the console yet.</p>
      </>
    );
  }

  const { status } = recordStatus(r.id, data.suggestions, data.events);
  const seeking = r.type === 'seeking';
  const rows = recordRows(r);
  const pairs = data.suggestions.filter(s => s.found_id === r.id || s.seeking_id === r.id).sort((a, b) => b.score - a.score);

  return (
    <>
      {back}
      <div className="flex items-center gap-3 mb-4">
        <Thumb r={r} size="w-14 h-14" />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-navy break-words">{r.name ?? 'Name not known'}</h1>
          <p className="text-sm text-navy-muted">
            {r.code} · {siteName(r.site)} <span className={`badge text-xs ml-1 ${STATUS_BADGE[status]}`}>{statusLabel(r, status)}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <div className="space-y-4 min-w-0">
          <dl className="card grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-navy-muted">{label}</dt>
                <dd className={`text-base break-words first-letter:uppercase ${value ? 'text-navy' : 'text-navy-muted italic'}`}>{value || 'Not recorded'}</dd>
              </div>
            ))}
          </dl>

          {!seeking && (
            <section className="card">
              <h2 className="text-sm font-medium text-navy-muted">Private detail (for the family check, staff only)</h2>
              {r.private_detail ? (
                showPrivate ? (
                  <p className="text-base text-navy mt-1">{r.private_detail}</p>
                ) : (
                  <button type="button" onClick={() => setShowPrivate(true)} className="btn-text -ml-2">
                    Show private detail
                  </button>
                )
              ) : (
                <p className="text-base text-navy-muted italic mt-1">Not recorded</p>
              )}
            </section>
          )}

          {r.transcript && (
            <section className="card">
              <h2 className="text-sm font-medium text-navy-muted mb-1">What was heard at registration</h2>
              <p className="text-base text-navy">{r.transcript}</p>
            </section>
          )}
        </div>

        <div className="space-y-4 min-w-0">
          {r.photo && <img src={r.photo} alt={`Photo of ${r.name ?? 'this person'}`} className="w-full max-w-xs rounded-card border border-borderSlate" />}
          <section className="card">
            <h2 className="text-lg font-semibold text-navy mb-2">Suggested matches</h2>
            {pairs.length ? (
              <ul className="space-y-2">
                {pairs.map(s => {
                  const other = data.byId.get(s.found_id === r.id ? s.seeking_id : s.found_id);
                  const st = PAIR_STATUS[data.states.get(s.id)!.status];
                  return (
                    <li key={s.id}>
                      <a {...linkProps(`/console/matches?pair=${encodeURIComponent(s.id)}`)} className="flex items-center gap-2 min-h-[44px] hover:underline">
                        <span className={`text-lg font-semibold w-9 ${s.band === 'Strong' ? 'text-verified' : 'text-pending'}`}>{s.score}</span>
                        <span className="flex-1 min-w-0 truncate text-base text-navy">
                          {personLabel(other)} · {siteName(other?.site ?? '')}
                        </span>
                        <span className={`badge text-xs ${st[1]}`}>{st[0]}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-base text-navy-muted">No suggested matches yet.</p>
            )}
          </section>
          <p className="text-sm text-navy-muted">
            Family status page: <span className="text-navy">{location.host}/status?code={r.code}</span>
          </p>
        </div>
      </div>
    </>
  );
};
