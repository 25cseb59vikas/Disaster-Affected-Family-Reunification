import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { db } from '../db/database';
import type { PersonRecord } from '../types';

const STATUS_BADGE: Record<string, string> = {
  'Possible match': 'bg-pending-bg text-pending border-pending-border',
  Reunited: 'bg-verified-bg text-verified border-verified-border',
  Registered: 'bg-civilBlue-soft text-civilBlue border-civilBlue/20'
};

export const SearchRecordsScreen: React.FC = () => {
  const { navigateTo, setSelectedMatch } = useApp();
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<PersonRecord[]>([]);

  useEffect(() => {
    db.records.toArray().then(data => {
      setRecords(data);
    });
  }, []);

  const filteredRecords = records.filter(r => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.village.toLowerCase().includes(q) ||
      (r.relativeName && r.relativeName.toLowerCase().includes(q))
    );
  });

  const handleSelectRecord = (record: PersonRecord) => {
    setSelectedMatch({
      matchId: `match-search-${record.id}`,
      foundPerson: {
        name: record.name,
        age: record.approxAge || 42,
        photoUrl: record.photoUrl || '',
        village: record.village,
        relativeName: record.relativeName,
        site: record.site
      },
      searchedPerson: {
        name: record.name,
        age: record.approxAge || 42,
        photoUrl: '',
        village: record.village,
        relativeName: record.relativeName,
        site: 'Field Search Inquiry'
      },
      score: record.status === 'Possible match' ? 84 : 75,
      scoreLabel: record.status === 'Possible match' ? '84% Match' : 'Record Review',
      reasons: ['Name matched database', `Location recorded at ${record.village}`],
      step: 2,
      status: 'pending'
    });
    navigateTo('match_review');
  };

  return (
    <Screen nav="search">
      <h1 className="screen-title">Search</h1>

      <input
        type="search"
        aria-label="Search by name or village"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Name or village"
        className="input mb-4"
      />

      <div className="card-stack">
        {filteredRecords.map(r => (
          <button
            type="button"
            key={r.id || r.syncId}
            onClick={() => handleSelectRecord(r)}
            className="card w-full flex items-start gap-3 text-left cursor-pointer transition-colors hover:border-navy/30 active:bg-pressed"
          >
            <span className="w-12 h-12 shrink-0 rounded-button bg-pressed flex items-center justify-center text-lg font-semibold text-navy-muted overflow-hidden">
              {r.photoUrl ? <img src={r.photoUrl} alt="" className="w-full h-full object-cover" /> : r.name.charAt(0)}
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                <span className="min-w-0 flex-1 text-lg font-semibold text-navy truncate">{r.name}</span>
                {STATUS_BADGE[r.status] && <span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span>}
              </span>
              <span className="block text-sm text-navy-muted truncate">
                Age {r.approxAge || '–'} · {r.village}
              </span>
              <span className="block text-sm text-navy truncate">{r.status === 'Reunited' ? 'Reunited on 24 Oct' : r.site}</span>
            </span>
          </button>
        ))}

        {filteredRecords.length === 0 && (
          <p className="card text-center text-base text-navy-muted">No records match "{query}".</p>
        )}
      </div>
    </Screen>
  );
};
