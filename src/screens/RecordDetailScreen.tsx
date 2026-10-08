import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { siteName } from '../sites';
import { eventsByPair, recordStatus } from '../matchStatus';
import { timeSince } from './SearchRecordsScreen';

/** One record: its details, its single status, its best match, and the code the family uses on /status. */
export const RecordDetailScreen: React.FC = () => {
  const { db, selectedRecordId, navigateTo, setSelectedSuggestionId } = useApp();
  const data = useLiveQuery(async () => {
    if (!selectedRecordId) return null;
    const [r, suggestions, events] = await Promise.all([db.records.get(selectedRecordId), db.suggestions.toArray(), db.events.toArray()]);
    return r ? { r, ...recordStatus(r.id, suggestions, eventsByPair(events)) } : null;
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

      <dl className="card space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-navy-muted">{label}</dt>
            <dd className={`text-base break-words first-letter:uppercase ${value ? 'text-navy' : 'text-navy-muted italic'}`}>{value || 'Not recorded'}</dd>
          </div>
        ))}
      </dl>
    </Screen>
  );
};
