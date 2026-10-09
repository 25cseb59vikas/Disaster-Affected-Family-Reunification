import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { siteName } from '../sites';
import { eventsByPair, recordStatus } from '../matchStatus';
import { timeSince } from './SearchRecordsScreen';
import { Avatar } from '../workspace/ui';

/** One record: its details, its single status, its best match, and the code the family uses on /status. */
export const RecordDetailScreen: React.FC = () => {
  const { db, selectedRecordId, navigateTo, setSelectedSuggestionId } = useApp();
  const data = useLiveQuery(async () => {
    if (!selectedRecordId) return null;
    const [r, suggestions, events, records] = await Promise.all([db.records.get(selectedRecordId), db.suggestions.toArray(), db.events.toArray(), db.records.toArray()]);
    return r ? { r, ...recordStatus(r.id, suggestions, eventsByPair(events), new Map(records.map(x => [x.id, x]))) } : null;
  }, [db, selectedRecordId]);

  if (!data) {
    return (
      <Screen showBack nav="search">
        <h1 className="screen-title">Record</h1>
        <p className="text-base text-navy-muted">{data === null ? 'Record not found.' : ''}</p>
      </Screen>
    );
  }

  const { r, status, suggestion } = data;
  const seeking = r.type === 'seeking';
  const rows: Array<[string, string | null | undefined]> = [
    ['Age', r.age_band],
    ['Gender', r.gender === 'unknown' ? null : r.gender],
    ['Village', r.village],
    [seeking ? 'Searching' : 'Relative', r.relative_name ? `${r.relative_name}${r.relative_relation ? ` (${r.relative_relation})` : ''}` : null],
    ...(seeking ? ([['Contact phone', r.contact_phone]] as Array<[string, string | null | undefined]>) : []),
    ['Clothing, marks', r.clothing_marks],
    [seeking ? 'Last seen' : 'Found', seeking ? r.last_seen : r.found_where],
    ['Registered', `${r.source === 'phone' ? 'Phone line' : siteName(r.site)} · ${timeSince(r.created_at)}`]
  ];
  const statusUrl = `/status?code=${encodeURIComponent(r.code)}`;

  return (
    <Screen
      showBack
      nav="search"
      width="wide"
      footer={
        suggestion ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setSelectedSuggestionId(suggestion.id);
              navigateTo('match_review');
            }}
          >
            Open the match
          </button>
        ) : undefined
      }
    >
      <h1 className="screen-title">{r.name ?? 'Name not known'}</h1>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        <div>
          <div className="card mb-3">
            <p className="text-sm text-navy-muted">{seeking ? 'Search status' : 'Status'}</p>
            <p className="text-lg font-semibold text-navy">{!seeking && status === 'Searching' ? 'No match yet' : status}</p>
            {suggestion && <p className="text-sm text-navy-muted">Best match score {suggestion.score}</p>}
          </div>

          <div className="card mb-3">
            <p className="text-sm text-navy-muted">Record code</p>
            <p className="text-xl font-semibold text-navy tracking-wide">{r.code}</p>
            <p className="text-sm text-navy-muted mt-1">The family can check progress with this code at</p>
            <a href={statusUrl} target="_blank" rel="noreferrer" className="btn-text -ml-2 break-all">
              {location.host}
              {statusUrl}
            </a>
          </div>
        </div>

        <dl className="card space-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-navy-muted">{label}</dt>
              <dd className={`text-base break-words first-letter:uppercase ${value ? 'text-navy' : 'text-navy-muted italic'}`}>{value || 'Not recorded'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Screen>
  );
};

/** Desktop panel beside the Search and Priority lists: one record's status, code and details. */
export const RecordSummary: React.FC<{ id: string }> = ({ id }) => {
  const { db, navigateTo, setSelectedSuggestionId } = useApp();
  const data = useLiveQuery(async () => {
    const [r, suggestions, events, records] = await Promise.all([db.records.get(id), db.suggestions.toArray(), db.events.toArray(), db.records.toArray()]);
    return r ? { r, ...recordStatus(r.id, suggestions, eventsByPair(events), new Map(records.map(x => [x.id, x]))) } : null;
  }, [db, id]);
  if (!data) return data === null ? <p className="card text-base text-navy-muted">Record not found.</p> : null;

  const { r, status, suggestion } = data;
  const seeking = r.type === 'seeking';
  const rows: Array<[string, string | null | undefined]> = [
    ['Age', r.age_band],
    ['Gender', r.gender === 'unknown' ? null : r.gender],
    ['Village', r.village],
    [seeking ? 'Searching' : 'Relative', r.relative_name ? `${r.relative_name}${r.relative_relation ? ` (${r.relative_relation})` : ''}` : null],
    ...(seeking ? ([['Contact phone', r.contact_phone]] as Array<[string, string | null | undefined]>) : []),
    ['Clothing, marks', r.clothing_marks],
    [seeking ? 'Last seen' : 'Found', seeking ? r.last_seen : r.found_where],
    ['Registered', `${r.source === 'phone' ? 'Phone line' : siteName(r.site)} · ${timeSince(r.created_at)}`]
  ];

  const statusUrl = `/status?code=${encodeURIComponent(r.code)}`;
  const shownStatus = !seeking && status === 'Searching' ? 'No match yet' : status;

  // Same frame as the evidence pane: fixed header, a body that scrolls on its own, fixed footer.
  return (
    <article aria-label="Record" className="panel h-full min-h-0 flex flex-col">
      <header className="flex-none flex items-center gap-3 px-5 py-3 border-b border-borderSlate">
        {r.photo ? (
          <img src={r.photo} alt="" className="w-10 h-10 rounded-full object-cover border border-borderSlate" />
        ) : (
          <Avatar name={r.name} size="md" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-navy line-clamp-2" title={r.name ?? undefined}>
            {r.name ?? 'Name not known'}
          </h2>
          <p className="text-xs text-navy-muted">
            {seeking ? 'Search' : 'Found here'} · code <span className="font-medium text-navy tracking-wide">{r.code}</span>
          </p>
        </div>
        <span className={`badge ${status === 'Found' ? 'bg-verified-bg text-verified border-verified-border' : status === 'Searching' ? 'bg-canvas text-navy-muted border-borderSlate' : 'bg-pending-bg text-pending border-pending-border'}`}>
          {shownStatus}
        </span>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
        <table className="w-full text-table">
          <tbody className="divide-y divide-borderSlate">
            {rows.map(([label, value]) => (
              <tr key={label}>
                <th scope="row" className="w-[132px] py-1.5 pr-3 text-left text-xs font-normal text-navy-muted align-top whitespace-nowrap">
                  {label}
                </th>
                <td className={`py-1.5 break-words first-letter:uppercase ${value ? 'text-navy' : 'text-navy-muted'}`}>{value || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <section className="rounded-panel bg-canvas px-4 py-3">
          <h3 className="label-caps">Match status</h3>
          <p className="mt-1 text-sm text-navy">
            <span className="font-semibold">{shownStatus}</span>
            {suggestion ? ` · best match score ${suggestion.score}` : ' · no suggested match yet'}
          </p>
        </section>
        <section className="rounded-panel bg-canvas px-4 py-3">
          <h3 className="label-caps">For the family</h3>
          <p className="mt-1 text-sm text-navy">They can follow progress with the code {r.code} at</p>
          <a href={statusUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-civilBlue hover:underline break-all">
            {location.host}
            {statusUrl}
          </a>
        </section>
      </div>
      {suggestion && (
        <footer className="flex-none flex items-center justify-end gap-3 px-5 py-2.5 border-t border-borderSlate">
          <button
            type="button"
            className="ws-btn ws-btn-accent"
            onClick={() => {
              setSelectedSuggestionId(suggestion.id);
              navigateTo('match_review');
            }}
          >
            Open the evidence
          </button>
        </footer>
      )}
    </article>
  );
};
