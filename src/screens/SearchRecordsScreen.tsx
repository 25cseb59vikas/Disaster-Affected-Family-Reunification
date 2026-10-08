import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { db } from '../db/database';
import type { PersonRecord } from '../types';

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
    <div className="min-h-screen bg-canvas flex flex-col justify-between max-w-lg mx-auto pb-24">
      <div>
        <TopBar />

        <main className="p-6 pt-8 space-y-6">
          <h1 className="text-[28px] font-bold text-navy leading-tight text-left">
            Search
          </h1>

          {/* Large search box: 56px tall, 20px text */}
          <div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a name or village..."
              className="w-full h-14 px-4 text-[20px] font-medium text-navy bg-surface border border-borderSlate rounded-input focus:outline-none focus:ring-2 focus:ring-navy transition-all"
            />
          </div>

          {/* Clean list of result cards */}
          <div className="space-y-5 text-left">
            {filteredRecords.map((r) => {
              const isMatch = r.status === 'Possible match';
              const isReunited = r.status === 'Reunited';
              const isRegistered = r.status === 'Registered';

              return (
                <article
                  key={r.id || r.syncId}
                  onClick={() => handleSelectRecord(r)}
                  className="bg-surface rounded-card border border-borderSlate p-6 shadow-subtle hover:border-navy cursor-pointer transition-all active:bg-slate-50 flex items-start gap-4"
                >
                  {/* Neutral Photo Thumbnail 64x64 */}
                  <div className="w-16 h-16 rounded-lg bg-navy/10 flex-shrink-0 flex items-center justify-center text-navy font-bold text-2xl border border-borderSlate overflow-hidden">
                    {r.photoUrl ? (
                      <img src={r.photoUrl} alt={r.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{r.name.charAt(0)}</span>
                    )}
                  </div>

                  {/* 3 lines of text and badge */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-[20px] font-bold text-navy truncate">
                        {r.name}
                      </h2>
                      {/* One badge per card */}
                      {isMatch && (
                        <span className="text-[14px] font-bold px-2 py-0.5 rounded-badge bg-pending-bg text-pending border border-pending-border flex-shrink-0">
                          Possible match
                        </span>
                      )}
                      {isReunited && (
                        <span className="text-[14px] font-bold px-2 py-0.5 rounded-badge bg-verified-bg text-verified border border-verified-border flex-shrink-0">
                          Reunited
                        </span>
                      )}
                      {isRegistered && (
                        <span className="text-[14px] font-bold px-2 py-0.5 rounded-badge bg-blue-50 text-civilBlue border border-blue-200 flex-shrink-0">
                          Registered
                        </span>
                      )}
                    </div>

                    <p className="text-[18px] text-navy-muted mt-1 truncate">
                      Age {r.approxAge || '–'} · {r.village}
                    </p>

                    <p className="text-[18px] text-navy font-medium mt-1 truncate">
                      {isReunited ? 'Reunited on 24 Oct' : r.site}
                    </p>
                  </div>
                </article>
              );
            })}

            {filteredRecords.length === 0 && (
              <div className="p-8 text-center text-[18px] text-navy-muted bg-surface rounded-card border border-borderSlate">
                No records matching "{query}".
              </div>
            )}
          </div>
        </main>
      </div>

      <div className="h-20" />
      <BottomNav activeTab="search" />
    </div>
  );
};
