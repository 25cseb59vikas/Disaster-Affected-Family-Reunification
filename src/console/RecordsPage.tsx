import React, { useState } from 'react';
import { recordStatus, type SearchStatus } from '../matchStatus';
import { AUTHORITY, FAMILY_APP, PHONE_LINE, SITES, siteName } from '../sites';
import { timeSince } from '../screens/SearchRecordsScreen';
import type { PersonRecord } from '../types';
import { go, linkProps, useRoute } from '../route';
import { useConsoleData } from './data';
import { useIsDesktop } from '../useIsDesktop';
import { RecordPanel } from './RecordPage';

export const STATUS_BADGE: Record<SearchStatus, string> = {
  Searching: 'bg-canvas text-navy-muted border-borderSlate',
  'Possible match': 'bg-pending-bg text-pending border-pending-border',
  'Being verified': 'bg-civilBlue-soft text-civilBlue border-civilBlue/20',
  Found: 'bg-verified-bg text-verified border-verified-border'
};

export const statusLabel = (r: PersonRecord, s: SearchStatus) => (r.type === 'found' && s === 'Searching' ? 'No match yet' : s);

const SITE_OPTIONS = [...SITES, PHONE_LINE, FAMILY_APP, AUTHORITY];

export const Thumb: React.FC<{ r: PersonRecord; size?: string }> = ({ r, size = 'w-10 h-10' }) => (
  <span className={`${size} shrink-0 rounded-badge bg-pressed flex items-center justify-center text-base font-semibold text-navy-muted overflow-hidden`}>
    {r.photo ? <img src={r.photo} alt="" className="w-full h-full object-cover" /> : (r.name?.charAt(0) ?? '?')}
  </span>
);

/** /console/records: every record from every site, searchable and filterable. */
export const RecordsPage: React.FC = () => {
  const data = useConsoleData();
  const desktop = useIsDesktop();
  const { params } = useRoute();
  // Desktop: the chosen record shows beside the table (?id=); phones and tablets open the record page.
  const open = (id: string) => go(desktop ? `/console/records?id=${encodeURIComponent(id)}` : `/console/records/${id}`);
  const [query, setQuery] = useState('');
  const [site, setSite] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  const q = query.trim().toLowerCase();
  const rows = (data?.records ?? [])
    .map(r => ({ r, status: recordStatus(r.id, data!.suggestions, data!.events).status }))
    .filter(({ r, status: st }) => (!site || r.site === site) && (!type || r.type === type) && (!status || st === status))
    .filter(({ r }) => !q || [r.name, r.code, r.village, r.relative_name, r.contact_phone, r.clothing_marks].some(v => v?.toLowerCase().includes(q)));

  const select = 'input h-12 lg:h-11 w-auto min-w-0 pr-8';
  const selectedId = params.get('id') ?? rows[0]?.r.id ?? null;

  return (
    <>
      <h1 className="screen-title">Records</h1>
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          type="search"
          aria-label="Search records"
          placeholder="Name, code, village, relative or phone"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="input h-12 lg:h-11 flex-1 min-w-[200px]"
        />
        <select aria-label="Site" value={site} onChange={e => setSite(e.target.value)} className={select}>
          <option value="">All sites</option>
          {SITE_OPTIONS.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select aria-label="Type" value={type} onChange={e => setType(e.target.value)} className={select}>
          <option value="">Found and searches</option>
          <option value="found">Found</option>
          <option value="seeking">Searches</option>
        </select>
        <select aria-label="Status" value={status} onChange={e => setStatus(e.target.value)} className={select}>
          <option value="">Any status</option>
          {(['Searching', 'Possible match', 'Being verified', 'Found'] as SearchStatus[]).map(s => (
            <option key={s} value={s}>
              {s === 'Searching' ? 'No match yet' : s}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-navy-muted mb-2">
        {rows.length} of {data?.records.length ?? 0} records
      </p>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6 lg:items-start">
      <div className="hidden md:block card p-0">
        <table className="w-full text-sm text-left table-fixed">
          <thead className="text-navy-muted">
            <tr className="[&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-pressed [&>th]:py-2.5 [&>th:first-child]:rounded-tl-card [&>th:last-child]:rounded-tr-card">
              <th className="w-14 px-3 py-2 font-medium">
                <span className="sr-only">Photo</span>
              </th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="w-24 px-3 py-2 font-medium lg:hidden 2xl:table-cell">Type</th>
              <th className="w-24 px-3 py-2 font-medium">Code</th>
              <th className="w-32 px-3 py-2 font-medium">Site</th>
              <th className="hidden 2xl:table-cell w-24 px-3 py-2 font-medium">Age</th>
              <th className="hidden 2xl:table-cell px-3 py-2 font-medium">Village</th>
              <th className="w-40 px-3 py-2 font-medium">Status</th>
              <th className="hidden 2xl:table-cell w-28 px-3 py-2 font-medium">Registered</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, status: st }) => (
              <tr
                key={r.id}
                onClick={() => open(r.id)}
                aria-selected={desktop && r.id === selectedId}
                className={`border-t border-borderSlate cursor-pointer ${desktop && r.id === selectedId ? 'bg-terracotta-soft' : 'hover:bg-canvas'}`}
              >
                <td className="px-3 py-2">
                  <Thumb r={r} />
                </td>
                <td className="px-3 py-2 truncate">
                  <a {...linkProps(desktop ? `/console/records?id=${encodeURIComponent(r.id)}` : `/console/records/${r.id}`)} className="min-h-[44px] inline-flex items-center font-semibold text-navy hover:underline">
                    {r.name ?? 'Name not known'}
                  </a>
                </td>
                <td className="px-3 py-2 text-navy lg:hidden 2xl:table-cell">{r.type === 'found' ? 'Found' : 'Search'}</td>
                <td className="px-3 py-2 text-navy-muted">{r.code}</td>
                <td className="px-3 py-2 text-navy truncate">{siteName(r.site)}</td>
                <td className="hidden 2xl:table-cell px-3 py-2 text-navy">{r.age_band ?? '–'}</td>
                <td className="hidden 2xl:table-cell px-3 py-2 text-navy truncate">{r.village ?? '–'}</td>
                <td className="px-3 py-2">
                  <span className={`badge ${STATUS_BADGE[st]}`}>{statusLabel(r, st)}</span>
                </td>
                <td className="hidden 2xl:table-cell px-3 py-2 text-navy-muted">{timeSince(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data && <p className="p-4 text-center text-base text-navy-muted" role="status">Loading…</p>}
        {data && rows.length === 0 && <p className="p-4 text-center text-base text-navy-muted">{data.records.length === 0 ? 'No records yet' : 'No records match.'}</p>}
      </div>
      {desktop && data && (
        <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:pr-1" aria-label="Selected record">
          {selectedId ? <RecordPanel id={selectedId} data={data} /> : <p className="card text-base text-navy-muted">Select a record to see it here.</p>}
        </aside>
      )}
      </div>

      <div className="md:hidden card-stack">
        {rows.map(({ r, status: st }) => (
          <a key={r.id} {...linkProps(`/console/records/${r.id}`)} className="card flex items-start gap-3 hover:border-navy/30">
            <Thumb r={r} size="w-12 h-12" />
            <span className="flex-1 min-w-0">
              <span className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                <span className="min-w-0 flex-1 text-lg font-semibold text-navy truncate">{r.name ?? 'Name not known'}</span>
                <span className={`badge ${STATUS_BADGE[st]}`}>{statusLabel(r, st)}</span>
              </span>
              <span className="block text-sm text-navy-muted truncate">
                {r.type === 'found' ? 'Found' : 'Search'} · {siteName(r.site)} · {r.code}
              </span>
            </span>
          </a>
        ))}
        {data && rows.length === 0 && <p className="card text-center text-base text-navy-muted">{data.records.length === 0 ? 'No records yet' : 'No records match.'}</p>}
      </div>
    </>
  );
};
