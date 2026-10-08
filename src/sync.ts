import { getMeta, setMeta, type SiteDatabase } from './db/database';
import type { AppNotification, MatchEvent, PersonRecord, SiteId, Suggestion } from './types';
import { siteName } from './sites';

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
 * Sends this device's outbox and removes what the server acknowledged. Returns the bytes sent.
 * On its own (without a pull) for the family app, which must never download other people's records.
 * Throws if the link is down; nothing is lost because the outbox is only cleared on acknowledgement.
 */
export async function pushOutbox(db: SiteDatabase, site: SiteId): Promise<number> {
  const outbox = await db.outbox.toArray();
  if (outbox.length === 0) return 0;
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
  return new Blob([body]).size;
}

/**
 * Pushes the outbox, marks acknowledged items as sent (removes them), then pulls changes.
 * Throws if the link is down; nothing is lost because the outbox is only cleared on acknowledgement.
 * Returns the number of bytes pushed.
 */
export async function syncOnce(db: SiteDatabase, site: SiteId): Promise<number> {
  const bytesSent = await pushOutbox(db, site);
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

  await db.transaction('rw', [db.records, db.events, db.suggestions, db.meta, db.notifications], async () => {
    const knownSuggestions = new Set(await db.suggestions.toCollection().primaryKeys());
    await db.records.bulkPut(data.records);
    await db.events.bulkPut(data.events);
    const hidden = data.suggestions.filter(s => s.hidden).map(s => s.id);
    await db.suggestions.bulkDelete(hidden);
    await db.suggestions.bulkPut(data.suggestions.filter(s => !s.hidden));
    await setMeta(db, 'cursor', data.cursor);
    await addNotifications(db, site, data, knownSuggestions, since === 0);
  });

  return bytesSent;
}

/**
 * Notifications for this site's volunteers: a new suggestion involving a record registered here,
 * a confirmation by the other site, and a match verified with the family.
 * The first pull for a site only fills the list (already seen), so a fresh device is not flooded.
 */
async function addNotifications(
  db: SiteDatabase,
  site: SiteId,
  data: { events: MatchEvent[]; suggestions: Suggestion[] },
  knownSuggestions: Set<string>,
  firstPull: boolean
) {
  const now = new Date().toISOString();
  const seen = firstPull ? 1 : 0;
  const out: AppNotification[] = [];

  // The record registered here for a pair, or null if neither side is ours.
  const ours = async (foundId: string, seekingId: string) => {
    const [f, s] = await Promise.all([db.records.get(foundId), db.records.get(seekingId)]);
    const r = f?.site === site ? f : s?.site === site ? s : null;
    return r ? r.name ?? 'unnamed person' : null;
  };

  for (const s of data.suggestions) {
    if (s.hidden || knownSuggestions.has(s.id)) continue;
    const name = await ours(s.found_id, s.seeking_id);
    if (name) {
      out.push({ id: `match:${s.id}`, kind: 'match', suggestion_id: s.id, created_at: now, seen, toasted: seen,
        text: `Possible match for ${name} registered here. Tap to review.` });
    }
  }
  for (const e of data.events) {
    const pair = `${e.found_id}:${e.seeking_id}`;
    const name = await ours(e.found_id, e.seeking_id);
    if (!name) continue;
    if (e.kind === 'confirm' && e.site !== site) {
      out.push({ id: `confirm:${e.id}`, kind: 'confirm', suggestion_id: pair, created_at: now, seen, toasted: seen,
        text: `${siteName(e.site)} confirmed the match for ${name}. Tap to review.` });
    } else if (e.kind === 'family_match') {
      out.push({ id: `verified:${pair}`, kind: 'verified', suggestion_id: pair, created_at: now, seen, toasted: seen,
        text: `Match for ${name} verified with the family.` });
    }
  }
  // Never re-add (and so re-alert) a notification that already exists.
  const unique = [...new Map(out.map(n => [n.id, n])).values()];
  const existing = new Set(await db.notifications.where('id').anyOf(unique.map(n => n.id)).primaryKeys());
  await db.notifications.bulkAdd(unique.filter(n => !existing.has(n.id)));
}
