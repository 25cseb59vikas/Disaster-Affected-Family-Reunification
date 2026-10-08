import { getMeta, setMeta, type SiteDatabase } from './db/database';
import type { MatchEvent, PersonRecord, SiteId, Suggestion } from './types';

const API = '/api';

/** The local server's health answer, or null if it cannot be reached (voice and sync both run through it). */
export async function serverHealth(): Promise<{ demo_epoch?: string } | null> {
  try {
    const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * Pushes the outbox, marks acknowledged items as sent (removes them), then pulls changes.
 * Throws if the link is down; nothing is lost because the outbox is only cleared on acknowledgement.
 * Returns the number of bytes pushed.
 */
export async function syncOnce(db: SiteDatabase, site: SiteId): Promise<number> {
  const outbox = await db.outbox.toArray();
  let bytesSent = 0;

  if (outbox.length > 0) {
    const body = JSON.stringify({
      site,
      records: outbox.filter(o => o.kind === 'record').map(o => o.payload),
      events: outbox.filter(o => o.kind === 'event').map(o => o.payload)
    });
    const res = await fetch(`${API}/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(30000)
    });
    if (!res.ok) throw new Error(`push failed: HTTP ${res.status}`);
    const { accepted } = (await res.json()) as { accepted: string[] };
    await db.outbox.bulkDelete(accepted);
    bytesSent = new Blob([body]).size;
  }

  await setMeta(db, 'last_bytes_sent', bytesSent);

  const since = await getMeta(db, 'cursor', 0);
  const res = await fetch(`${API}/sync/pull?since=${since}&site=${site}`, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`pull failed: HTTP ${res.status}`);
  const data = (await res.json()) as {
    cursor: number;
    records: PersonRecord[];
    events: MatchEvent[];
    suggestions: Suggestion[];
  };

  await db.transaction('rw', [db.records, db.events, db.suggestions, db.meta], async () => {
    await db.records.bulkPut(data.records);
    await db.events.bulkPut(data.events);
    const hidden = data.suggestions.filter(s => s.hidden).map(s => s.id);
    await db.suggestions.bulkDelete(hidden);
    await db.suggestions.bulkPut(data.suggestions.filter(s => !s.hidden));
    await setMeta(db, 'cursor', data.cursor);
  });

  return bytesSent;
}
