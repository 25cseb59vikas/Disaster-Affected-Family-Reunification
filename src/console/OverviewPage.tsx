import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { AUTHORITY, FAMILY_APP, PHONE_LINE, SITES } from '../sites';
import { saveRecord, type NewPerson } from '../records';
import type { SiteId } from '../types';
import { linkProps } from './route';
import { useConsoleData, type ConsoleData } from './data';

const ROWS: Array<{ id: SiteId; name: string }> = [...SITES, PHONE_LINE, FAMILY_APP, AUTHORITY];

interface SiteCounts {
  registered: number;
  searching: number;
  possible: number;
  verified: number;
}

function countsFor(data: ConsoleData, site: SiteId | null): SiteCounts {
  const here = (id: string) => site === null || data.byId.get(id)?.site === site;
  const reunited = new Set<string>();
  let possible = 0;
  let verified = 0;
  for (const s of data.suggestions) {
    const st = data.states.get(s.id)!.status;
    if (st === 'verified') reunited.add(s.found_id).add(s.seeking_id);
    if (!here(s.found_id) && !here(s.seeking_id)) continue;
    if (st === 'verified') verified++;
    else if (st !== 'ruled_out') possible++;
  }
  const records = data.records.filter(r => site === null || r.site === site);
  return {
    registered: records.length,
    searching: records.filter(r => r.type === 'seeking' && !reunited.has(r.id)).length,
    possible,
    verified
  };
}

interface LinkState {
  up: boolean;
  delay_ms: number;
  kbps: number | null;
  stats: { syncs: number; last_sync: number | null };
}

/** The simulated link between sites, as set on the link panel (/api/sim). */
function useLinkState() {
  const [state, setState] = useState<LinkState | null | 'unreachable'>(null);
  useEffect(() => {
    const poll = () =>
      fetch('/api/sim/state', { signal: AbortSignal.timeout(4000) })
        .then(r => (r.ok ? r.json() : Promise.reject()))
        .then(setState)
        .catch(() => setState('unreachable'));
    poll();
    const t = window.setInterval(poll, 5000);
    return () => clearInterval(t);
  }, []);
  return state;
}

const ago = (t: number | null) => {
  if (!t) return 'never';
  const s = Math.max(0, Math.round(Date.now() / 1000 - t));
  return s < 2 ? 'just now' : s < 120 ? `${s} s ago` : `${Math.round(s / 60)} min ago`;
};

// Fictional people, adapted from the teammate's "Load fictional demo family" button.
const DEMO_BY = 'Demo family (fictional)';
const DEMO_FAMILY: Array<{ site: SiteId; type: 'found' | 'seeking'; person: NewPerson }> = [
  {
    site: 'hospital-b',
    type: 'found',
    person: {
      name: 'Arunkumar', gender: 'male', age_band: 'Under 12', village: 'Kilvelur', relative_name: 'Ravi Kumar', relative_relation: 'father',
      clothing_marks: 'Blue school shirt, khaki shorts', found_where: 'Near the bridge', last_seen: null, contact_phone: null,
      private_detail: 'Small scar on the left knee', household_id: null, has_missing_family: true,
      looking_for: [{ relation: 'father', name: 'Ravi Kumar' }], transcript: null, photo: null
    }
  },
  {
    site: 'camp-a',
    type: 'seeking',
    person: {
      name: 'Arun Kumar', gender: 'male', age_band: 'Under 12', village: 'Kilvelur', relative_name: 'Ravi Kumar', relative_relation: 'father',
      clothing_marks: 'Blue shirt', found_where: null, last_seen: 'Near the bridge, separated during the flood', contact_phone: '00000 00000 (fictional)',
      private_detail: null, household_id: null, has_missing_family: false, looking_for: [], transcript: null, photo: null
    }
  }
];

const DemoFamily: React.FC<{ data: ConsoleData }> = ({ data }) => {
  const { db, syncNow } = useApp();
  const [busy, setBusy] = useState(false);
  const loaded = data.records.some(r => r.registered_by === DEMO_BY);

  const load = async () => {
    setBusy(true);
    for (const d of DEMO_FAMILY) await saveRecord(db, d.site, d.type, DEMO_BY, d.person);
    await syncNow();
    setBusy(false);
  };

  return (
    <section className="card">
      <h2 className="text-lg font-semibold text-navy">Demo helper</h2>
      <p className="text-sm text-navy-muted mt-1">
        Adds a fictional boy found at Hospital B and his father's search at Camp A. They sync like any other records and should appear as a
        match in the queue within a few seconds.
      </p>
      <button type="button" onClick={load} disabled={busy || loaded} className="btn-primary w-auto px-5 mt-3 disabled:cursor-default">
        {loaded ? 'Demo family loaded' : busy ? 'Loading…' : 'Load fictional demo family'}
      </button>
    </section>
  );
};

/** /console: counts per site, the link between sites, and what needs attention. */
export const OverviewPage: React.FC = () => {
  const data = useConsoleData();
  const link = useLinkState();
  const { syncStatus, waitingCount } = useApp();
  const total = data ? countsFor(data, null) : null;
  const toDecide = data ? data.suggestions.filter(s => ['open', 'partly_confirmed', 'confirmed'].includes(data.states.get(s.id)!.status)).length : 0;

  return (
    <>
      <h1 className="screen-title">Overview</h1>

      {total && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            ['Registered', total.registered, 'text-navy'],
            ['Searching', total.searching, 'text-terracotta'],
            ['Possible matches', total.possible, 'text-pending'],
            ['Verified', total.verified, 'text-verified']
          ].map(([label, value, color]) => (
            <div key={label as string} className="card">
              <p className={`text-score font-semibold ${color}`}>{value}</p>
              <p className="text-sm text-navy-muted">{label} · all sites</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
        <section className="min-w-0">
          <h2 className="text-lg font-semibold text-navy mb-2">By site</h2>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-pressed text-navy-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Site</th>
                  <th className="px-2 py-2 font-medium text-right">Registered</th>
                  <th className="px-2 py-2 font-medium text-right">Searching</th>
                  <th className="px-2 py-2 font-medium text-right">
                    <span className="hidden sm:inline">Possible matches</span>
                    <span className="sm:hidden">Possible</span>
                  </th>
                  <th className="px-3 py-2 font-medium text-right">Verified</th>
                </tr>
              </thead>
              <tbody>
                {data &&
                  ROWS.map(site => {
                    const c = countsFor(data, site.id);
                    return (
                      <tr key={site.id} className="border-t border-borderSlate">
                        <td className="px-3 py-2.5 font-medium text-navy">{site.name}</td>
                        <td className="px-2 py-2.5 text-right">{c.registered}</td>
                        <td className="px-2 py-2.5 text-right">{c.searching}</td>
                        <td className="px-2 py-2.5 text-right">{c.possible}</td>
                        <td className="px-3 py-2.5 text-right">{c.verified}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-navy-muted mt-2">A match counts for both sites involved. Counts are from the console's last sync.</p>
        </section>

        <div className="space-y-4 min-w-0">
          <section className="card">
            <h2 className="text-lg font-semibold text-navy">Link status</h2>
            {link === null ? (
              <p className="text-sm text-navy-muted mt-1">Checking…</p>
            ) : link === 'unreachable' ? (
              <p className="text-base text-urgent mt-1">Server not reachable. Records and decisions made here wait on this device.</p>
            ) : (
              <>
                <p className={`text-base font-semibold mt-1 ${link.up ? 'text-verified' : 'text-urgent'}`}>{link.up ? 'Link between sites up' : 'Link between sites down'}</p>
                <p className="text-sm text-navy-muted">
                  {link.up ? `Delay ${link.delay_ms} ms${link.kbps ? ` · ${link.kbps} kbit/s` : ''}` : 'Sites keep working offline'} · last sync {ago(link.stats.last_sync)}
                </p>
              </>
            )}
            <p className="text-sm text-navy mt-2">
              This console: {syncStatus === 'synced' ? 'synced' : syncStatus}
              {waitingCount ? ` · ${waitingCount} waiting to send` : ''}
            </p>
          </section>

          <a {...linkProps('/console/matches')} className="card block hover:border-navy/30">
            <p className="text-lg font-semibold text-navy">{toDecide} {toDecide === 1 ? 'match needs' : 'matches need'} a decision</p>
            <p className="text-sm text-civilBlue">Open the match queue</p>
          </a>

          {data && <DemoFamily data={data} />}
        </div>
      </div>
    </>
  );
};
