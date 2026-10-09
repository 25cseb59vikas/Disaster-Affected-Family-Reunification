import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { refreshSites } from '../sites';

interface ServerCounts {
  records: number;
  events: number;
  suggestions: number;
}

type Action = 'clear' | 'testdata' | 'family';

/**
 * /console/settings: the demo data on the server. Nothing is built into the console itself; these buttons
 * ask the server (the same actions as on the link panel, /sim).
 */
export const SettingsPage: React.FC = () => {
  const { syncNow } = useApp();
  const [counts, setCounts] = useState<ServerCounts | null | 'unreachable'>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [message, setMessage] = useState('');
  const [sites, setSites] = useState<Array<{id:string; name:string; type:string; active:boolean}>>([]);
  const [newSite, setNewSite] = useState('');
  const [siteType, setSiteType] = useState('camp');
  const loadSites = async () => {
    try { const res = await fetch('/api/sites'); if (res.ok) setSites((await res.json()).sites); } catch { setMessage('Cannot load sites while offline.'); }
  };
  const saveSite = async (url: string, method: string, data: object) => {
    try {
      const res = await fetch(url, {method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadSites(); await refreshSites(); setNewSite(''); setMessage('Sites updated.');
    } catch { setMessage('Could not update site. Check the server.'); }
  };

  const refresh = () =>
    fetch('/api/sim/state', { signal: AbortSignal.timeout(5000) })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(s => setCounts(s.counts as ServerCounts))
      .catch(() => setCounts('unreachable'));

  useEffect(() => {
    refresh();
    void loadSites();
  }, []);

  const run = async (action: Action) => {
    setBusy(action);
    setMessage('');
    const path = { clear: '/api/sim/clear', testdata: '/api/sim/load-testdata', family: '/api/sim/demo-family' }[action];
    try {
      const res = await fetch(path, { method: 'POST', signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setCounts(body.counts as ServerCounts);
      if (action === 'clear') {
        setMessage('All data cleared. Every open app deletes its local data and reloads within 15 seconds.');
      } else {
        setMessage(body.loaded ? `Loaded ${body.loaded} records. They appear here after the next sync.` : 'Already loaded: nothing new was added.');
      }
      // The console's own sync sees the change at once (and reloads itself after a clear).
      await syncNow();
    } catch {
      setMessage('The server could not be reached. Nothing was changed.');
    } finally {
      setBusy(null);
      setConfirmClear(false);
    }
  };

  const secondary =
    'h-12 min-w-[120px] px-5 rounded-button border border-borderSlate bg-surface text-base font-semibold text-navy hover:border-navy disabled:opacity-60 disabled:cursor-wait';

  return (
    <div className="max-w-3xl">
      <h1 className="screen-title">Settings</h1>

      <section className="card mb-6">
        <h2 className="text-lg font-semibold text-navy">Sites</h2>
        <p className="text-sm text-navy-muted mt-1">Physical sites can confirm matches. Inactive sites remain on historical records.</p>
        <div className="mt-3 space-y-2">{sites.map(s => <div key={s.id} className="flex flex-wrap gap-2 items-center">
          <span className="flex-1">{s.name} · {s.type} · {s.active ? 'Active' : 'Inactive'}</span>
          <button className="btn-text" type="button" onClick={() => { const name = prompt('Rename site', s.name); if (name && name.trim() !== s.name) void saveSite(`/api/sites/${s.id}`, 'PATCH', {name}); }}>Rename</button>
          {s.active && <button className="btn-text" type="button" onClick={() => { if (confirm(`Deactivate ${s.name}?`)) void saveSite(`/api/sites/${s.id}`, 'PATCH', {active:false}); }}>Deactivate</button>}
        </div>)}</div>
        <div className="flex flex-wrap gap-2 mt-4">
          <input className="input flex-1" aria-label="New site name" placeholder="Camp C" value={newSite} onChange={e=>setNewSite(e.target.value)} />
          <select className="input" aria-label="Site type" value={siteType} onChange={e=>setSiteType(e.target.value)}>
            {['camp','hospital','relief centre','other'].map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <button type="button" className="btn-primary" disabled={!newSite.trim()} onClick={()=>void saveSite('/api/sites','POST',{name:newSite,type:siteType})}>Add site</button>
        </div>
      </section>
      <section className="card">
        <h2 className="text-lg font-semibold text-navy">Demo data</h2>
        <p className="text-base text-navy mt-1" aria-live="polite">
          {counts === null
            ? 'Checking the server…'
            : counts === 'unreachable'
              ? 'The server cannot be reached.'
              : counts.records === 0
                ? 'The server has no records.'
                : `The server has ${counts.records} records, ${counts.suggestions} suggested matches and ${counts.events} decisions.`}
        </p>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button type="button" onClick={() => run('testdata')} disabled={busy !== null} className={secondary}>
              {busy === 'testdata' ? 'Loading…' : 'Load test data (150 fictional people)'}
            </button>
            <p className="text-sm text-navy-muted flex-1 min-w-[200px]">Generated people at Camp A and Hospital B, marked "TEST DATA".</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button type="button" onClick={() => run('family')} disabled={busy !== null} className={secondary}>
              {busy === 'family' ? 'Loading…' : 'Load fictional demo family'}
            </button>
            <p className="text-sm text-navy-muted flex-1 min-w-[200px]">One case: a boy found at Hospital B and his father's search at Camp A.</p>
          </div>

          <div className="pt-4 border-t border-borderSlate">
            {confirmClear ? (
              <div className="card bg-urgent-bg border-urgent-border" role="alertdialog" aria-label="Confirm clear all data">
                <p className="text-base font-semibold text-navy">Clear all data?</p>
                <p className="text-sm text-navy mt-1">
                  This deletes every record, decision and suggested match on the server. Every open field app, console and family app
                  then deletes its local data for all sites. It cannot be undone.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => run('clear')}
                    disabled={busy !== null}
                    className="h-12 min-w-[120px] px-5 rounded-button bg-urgent text-white text-base font-semibold hover:bg-urgent/90 disabled:opacity-60"
                  >
                    {busy === 'clear' ? 'Clearing…' : 'Yes, clear all data'}
                  </button>
                  <button type="button" onClick={() => setConfirmClear(false)} className={secondary}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  disabled={busy !== null}
                  className="h-12 min-w-[120px] px-5 rounded-button border border-urgent text-urgent text-base font-semibold hover:bg-urgent-bg"
                >
                  Clear all data
                </button>
                <p className="text-sm text-navy-muted flex-1 min-w-[200px]">Empties the server and every open app. Asks first.</p>
              </div>
            )}
          </div>
        </div>

        {message && <p className="text-base text-navy mt-4">{message}</p>}
      </section>
      <p className="text-sm text-navy-muted mt-3">
        The same actions, plus "Reset demo" (clear all, then load the test data), are on the link panel at /api/sim.
      </p>
    </div>
  );
};
