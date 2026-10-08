import Dexie, { type Table } from 'dexie';
import type { AppNotification, MatchEvent, MetaRow, OutboxItem, PersonRecord, SiteId, Suggestion } from '../types';

/** Local data for one site. Each site gets its own IndexedDB database. */
export class SiteDatabase extends Dexie {
  records!: Table<PersonRecord, string>;
  outbox!: Table<OutboxItem, string>;
  events!: Table<MatchEvent, string>;
  suggestions!: Table<Suggestion, string>;
  meta!: Table<MetaRow, string>;
  notifications!: Table<AppNotification, string>;

  constructor(site: SiteId) {
    super(`Reunite-${site}`);
    this.version(1).stores({
      records: '&id, code, type, site, created_at',
      outbox: '&id, kind',
      events: '&id, found_id, seeking_id, kind',
      suggestions: '&id, found_id, seeking_id, score',
      meta: '&key'
    });
    this.version(2).stores({ notifications: '&id, created_at, seen, toasted' });
  }
}

const open: Partial<Record<SiteId, SiteDatabase>> = {};

export function siteDb(site: SiteId): SiteDatabase {
  return (open[site] ??= new SiteDatabase(site));
}

export async function getMeta<T extends number | string>(db: SiteDatabase, key: string, fallback: T): Promise<T> {
  return ((await db.meta.get(key))?.value as T) ?? fallback;
}

export function setMeta(db: SiteDatabase, key: string, value: number | string) {
  return db.meta.put({ key, value });
}
